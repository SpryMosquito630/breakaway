"""Server-only Firestore reservations. Quota and dispatch claims commit atomically."""
from datetime import datetime, timezone, timedelta
import hashlib
from core import reservation, bounded_result


class FirestoreLedger:
    def __init__(self, client, limits):
        self.client, self.limits = client, limits

    def job(self, uid, operation):
        key = hashlib.sha256((uid + '\0' + operation).encode()).hexdigest()
        return self.client.collection('analysis_jobs').document(key)

    def reserve(self, uid, operation, digest):
        from google.cloud import firestore
        now = datetime.now(timezone.utc)
        day = now.strftime('%Y-%m-%d')
        user_key = hashlib.sha256(uid.encode()).hexdigest()
        job = self.job(uid, operation)
        user = self.client.collection('analysis_usage').document(day + '-user-' + user_key)
        global_usage = self.client.collection('analysis_usage').document(day + '-global')

        @firestore.transactional
        def commit(transaction):
            old = job.get(transaction=transaction).to_dict()
            if old and old.get('state') == 'completed':
                stored = self.client.collection('analysis_results').document(job.id).get(transaction=transaction).to_dict()
                # TTL deletion is asynchronous, so also enforce expiration on read.
                if stored and stored['expires_at'] > now:
                    old['result_json'] = stored['result_json']
            user_count = (user.get(transaction=transaction).to_dict() or {}).get('count', 0)
            global_count = (global_usage.get(transaction=transaction).to_dict() or {}).get('count', 0)
            cached = reservation(old, user_count, global_count, digest, self.limits)
            if cached is not None:
                return cached
            transaction.set(job, {'digest': digest, 'state': 'reserved', 'created_at': firestore.SERVER_TIMESTAMP, 'expires_at': now + timedelta(hours=48)})
            transaction.set(user, {'count': user_count + 1, 'expires_at': now + timedelta(days=7)})
            transaction.set(global_usage, {'count': global_count + 1, 'expires_at': now + timedelta(days=7)})
            return None
        return commit(self.client.transaction())

    def complete(self, uid, operation, value):
        payload = bounded_result(value)
        job = self.job(uid, operation)
        batch = self.client.batch()
        batch.set(self.client.collection('analysis_results').document(job.id), {
            'result_json': payload, 'expires_at': datetime.now(timezone.utc) + timedelta(hours=24),
        })
        batch.update(job, {'state': 'completed'})
        batch.commit()

    def fail(self, uid, operation, error, uncertain=False):
        self.job(uid, operation).update({
            'state': 'uncertain' if uncertain else 'failed',
            'failure': {'status': error.status, 'code': error.code, 'message': error.message},
        })
