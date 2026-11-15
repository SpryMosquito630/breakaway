"""Offline hosted boundaries: mocked Firebase, transactional store and media worker."""
import copy
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import io
import json
import os
from pathlib import Path
import threading
import tempfile
import unittest
import uuid
from unittest.mock import patch
from app import create_app, run_worker
from core import Limits, Rejected, identity, request_digest
from ledger import FirestoreLedger
from deploy import stage, REPLAY_FILES, HOSTED_FILES


class Document:
    def __init__(self, store, collection, key):
        self.store, self.collection, self.id = store, collection, key
        self.key = collection + '/' + key

    def get(self, transaction):
        if transaction.writes:
            raise AssertionError('Firestore requires every read before every write')
        value = copy.deepcopy(self.store.data.get(self.key))
        return type('Snapshot', (), {'to_dict': lambda self: value})()

    def update(self, value):
        self.store.data[self.key].update(copy.deepcopy(value))


class FakeTransaction:
    def __init__(self, store):
        self.store, self.writes = store, []

    def set(self, doc, value):
        self.writes.append(('set', doc.key, copy.deepcopy(value)))

    def update(self, doc, value):
        self.writes.append(('update', doc.key, copy.deepcopy(value)))

    def commit(self):
        for kind, key, value in self.writes:
            if kind == 'set':
                self.store.data[key] = value
            else:
                self.store.data[key].update(value)


class FakeFirestore:
    def __init__(self):
        self.data, self.lock = {}, threading.RLock()

    def collection(self, name):
        return type('Collection', (), {'document': lambda _, key: Document(self, name, key)})()

    def transaction(self):
        return FakeTransaction(self)

    def batch(self):
        return FakeTransaction(self)


def transactional(callback):
    def run(transaction):
        with transaction.store.lock:
            result = callback(transaction)
            transaction.commit()
            return result
    return run


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.store = FakeFirestore()
        self.ledger = FirestoreLedger(self.store, Limits(user_daily=2, global_daily=3))
        self.patch = patch('google.cloud.firestore.transactional', transactional)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def test_parallel_reservations_never_exceed_durable_global_cap(self):
        def reserve(index):
            try:
                self.ledger.reserve('user-' + str(index), str(uuid.uuid4()), 'digest')
                return True
            except Rejected as error:
                self.assertEqual(error.code, 'quota_exceeded')
                return False
        with ThreadPoolExecutor(max_workers=8) as pool:
            self.assertEqual(sum(pool.map(reserve, range(8))), 3)
        jobs = [value for key, value in self.store.data.items() if key.startswith('analysis_jobs/')]
        self.assertEqual(len(jobs), 3)
        self.assertTrue(all(value['expires_at'] > datetime.now(timezone.utc) for value in jobs))

    def test_duplicate_claim_conflict_completion_and_expiration(self):
        operation = str(uuid.uuid4())
        self.assertIsNone(self.ledger.reserve('user', operation, 'digest'))
        with self.assertRaises(Rejected) as duplicate:
            self.ledger.reserve('user', operation, 'digest')
        self.assertEqual(duplicate.exception.code, 'request_in_progress')
        with self.assertRaises(Rejected) as conflict:
            self.ledger.reserve('user', operation, 'other')
        self.assertEqual(conflict.exception.code, 'request_conflict')
        self.ledger.complete('user', operation, {'score': None, 'pose': {'frames': []}})
        self.assertEqual(self.ledger.reserve('user', operation, 'digest'), {'result': {'score': None, 'pose': {'frames': []}}})
        job = self.ledger.job('user', operation)
        self.store.data['analysis_results/' + job.id]['expires_at'] = datetime.now(timezone.utc) - timedelta(seconds=1)
        with self.assertRaises(Rejected) as expired:
            self.ledger.reserve('user', operation, 'digest')
        self.assertEqual(expired.exception.status, 410)

    def test_failed_or_unknown_attempts_cannot_dispatch_again_or_refund_budget(self):
        operation = str(uuid.uuid4())
        self.ledger.reserve('user', operation, 'digest')
        error = Rejected(504, 'analysis_timeout', 'Retry shortly.')
        self.ledger.fail('user', operation, error, uncertain=True)
        with self.assertRaises(Rejected) as uncertain:
            self.ledger.reserve('user', operation, 'digest')
        self.assertEqual(uncertain.exception.code, 'request_in_progress')
        self.ledger.reserve('user', str(uuid.uuid4()), 'digest2')
        with self.assertRaises(Rejected) as quota:
            self.ledger.reserve('user', str(uuid.uuid4()), 'digest3')
        self.assertEqual(quota.exception.code, 'quota_exceeded')


class EndpointTests(unittest.TestCase):
    def setUp(self):
        self.store = FakeFirestore()
        self.ledger = FirestoreLedger(self.store, Limits())
        self.transaction_patch = patch('google.cloud.firestore.transactional', transactional)
        self.transaction_patch.start()
        self.addCleanup(self.transaction_patch.stop)
        self.calls = []
        self.paths = []
        self.claims = {'uid': 'synthetic-user', 'email_verified': True, 'firebase': {'sign_in_provider': 'password'}}
        self.env = patch.dict(os.environ, {'HOSTED_AUTH_READY': 'true', 'FIREBASE_ALLOWED_APP_IDS': 'synthetic-app', 'GEMINI_API_KEY': 'synthetic-key', 'GEMINI_MODEL': 'synthetic-model'}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        def worker(mode, path, pose, timeout):
            self.calls.append((mode, path.read_bytes(), pose, timeout))
            self.paths.append(path)
            return {'score': None, 'pose': None}
        self.worker = worker
        def verify_user(token):
            if token != 'synthetic-identity':
                raise ValueError()
            return self.claims
        self.client = create_app(verify_user=verify_user, verify_app=lambda token: {'app_id': token}, ledger=self.ledger, worker=worker).test_client()

    def send(self, operation=None, headers=None, body=b'synthetic video'):
        return self.client.post('/shot-review', data={'video': (io.BytesIO(body), 'clip.mp4')}, headers={'Authorization': 'Bearer synthetic-identity', 'X-Request-ID': operation or str(uuid.uuid4()), 'X-Include-Pose': '1', **(headers or {})})

    def test_identity_denial_precedes_upload_quota_and_worker(self):
        self.assertEqual(self.send(headers={'Authorization': ''}).status_code, 401)
        self.assertEqual(self.send(headers={'Authorization': 'Bearer expired'}).status_code, 401)
        self.claims['email_verified'] = False
        self.assertEqual(self.send().status_code, 403)
        self.assertEqual(self.calls, [])
        self.assertEqual(self.store.data, {})

    def test_unfinished_identity_setup_is_fail_closed_and_truthful(self):
        with patch.dict(os.environ, {'HOSTED_AUTH_READY': 'false'}):
            health = self.client.get('/health').json
            self.assertFalse(health['available'])
            self.assertFalse(health['shotReviewAvailable'])
            self.assertEqual(self.send().status_code, 503)
        self.assertEqual(self.calls, [])

    def test_anonymous_identity_requires_verified_allowed_attestation(self):
        self.claims = {'uid': 'synthetic-user', 'firebase': {'sign_in_provider': 'anonymous'}}
        self.assertEqual(self.send().status_code, 403)
        self.assertEqual(self.send(headers={'X-Firebase-AppCheck': 'wrong-app'}).status_code, 403)
        self.assertEqual(self.calls, [])
        self.assertEqual(self.send(headers={'X-Firebase-AppCheck': 'synthetic-app'}).status_code, 200)

    def test_health_contract_cached_replay_conflict_and_temporary_cleanup(self):
        health = self.client.get('/health').json
        self.assertTrue(health['hosted'])
        self.assertEqual(health['authentication'], 'firebase')
        operation = str(uuid.uuid4())
        self.assertEqual(self.send(operation).status_code, 200)
        self.assertEqual(self.send(operation).status_code, 200)
        self.assertEqual(len(self.calls), 1)
        self.assertTrue(self.calls[0][2])
        self.assertFalse(self.paths[0].exists())
        self.assertEqual(self.send(operation, body=b'other video').status_code, 409)
        self.assertEqual(len(self.calls), 1)

    def test_bad_id_size_and_web_origin_never_dispatch(self):
        self.assertEqual(self.send('not-a-uuid').status_code, 400)
        self.assertEqual(self.send(headers={'Origin': 'https://untrusted.example'}).status_code, 403)
        self.assertEqual(self.send(body=b'x' * (25 * 1024 * 1024 + 1)).status_code, 413)
        self.assertEqual(self.calls, [])

    def test_ledger_outage_fails_closed_without_provider_work(self):
        with patch.object(self.ledger, 'reserve', side_effect=RuntimeError('offline')):
            self.assertEqual(self.send().status_code, 503)
        self.assertEqual(self.calls, [])

    def test_worker_timeout_and_provider_failure_keep_safe_status(self):
        import subprocess
        with patch('app.subprocess.run', side_effect=subprocess.TimeoutExpired('worker', 90)):
            with self.assertRaises(Rejected) as timeout:
                run_worker('shot-review', Path('/tmp/synthetic.upload'), False, 90)
        self.assertEqual(timeout.exception.status, 504)

    def test_digest_binds_mode_payload_and_pose_flag(self):
        values = {request_digest('pose', b'video', False), request_digest('shot-review', b'video', False), request_digest('shot-review', b'video', True), request_digest('shot-review', b'other', True)}
        self.assertEqual(len(values), 4)


class BuildTests(unittest.TestCase):
    def test_build_context_contains_only_explicit_public_sources(self):
        with tempfile.TemporaryDirectory() as directory:
            manifest = stage(directory)
            expected = {'Dockerfile', '.dockerignore', '.gcloudignore'}
            expected.update('tools/replay_analysis/' + name for name in REPLAY_FILES)
            expected.update('tools/hosted_analysis/' + name for name in HOSTED_FILES)
            self.assertEqual(set(manifest), expected)
            self.assertTrue(all('work/' not in name and '.env' not in name and ' 2.' not in name for name in manifest))


if __name__ == '__main__':
    unittest.main()
