"""Hosted analysis boundaries. No development pairing or client-supplied provider keys."""
from dataclasses import dataclass
import hashlib
import json
import re
import uuid


class Rejected(Exception):
    def __init__(self, status, code, message):
        self.status, self.code, self.message = status, code, message
        super().__init__(message)


@dataclass(frozen=True)
class Limits:
    user_daily: int = 2
    global_daily: int = 10
    max_bytes: int = 25 * 1024 * 1024
    worker_seconds: int = 90

    def __post_init__(self):
        if not 1 <= self.user_daily <= 20 or not 1 <= self.global_daily <= 100:
            raise ValueError("Daily analysis limits exceed reviewed bounds.")
        if not 1 <= self.max_bytes <= 25 * 1024 * 1024 or not 1 <= self.worker_seconds <= 90:
            raise ValueError("Worker limits exceed reviewed bounds.")


def identity(claims, app_claims, allowed_apps):
    uid = claims.get('uid') or claims.get('sub')
    if not isinstance(uid, str) or not 1 <= len(uid) <= 128:
        raise Rejected(401, 'auth_required', 'Sign in to review your video.')
    provider = claims.get('firebase', {}).get('sign_in_provider')
    if provider == 'anonymous':
        if not app_claims or app_claims.get('app_id') not in allowed_apps:
            raise Rejected(403, 'app_check_required', 'Update Breakaway to continue video analysis.')
    elif claims.get('email_verified') is not True:
        raise Rejected(403, 'email_verification_required', 'Verify your email to review your video.')
    return uid


def request_id(value):
    try:
        parsed = uuid.UUID(value)
        if str(parsed) != value.lower() or parsed.version != 4:
            raise ValueError()
        return str(parsed)
    except (ValueError, TypeError, AttributeError):
        raise Rejected(400, 'invalid_request_id', 'Retry this video analysis.') from None


def request_digest(mode, payload, include_pose):
    return hashlib.sha256(mode.encode() + b'\0' + str(include_pose).encode() + b'\0' + payload).hexdigest()


def reservation(existing, user_count, global_count, digest, limits):
    """Pure transaction decision; a reserved/uncertain job is never dispatched twice."""
    if existing:
        if existing.get('digest') != digest:
            raise Rejected(409, 'request_conflict', 'This request already refers to another video.')
        if existing.get('state') == 'completed':
            if not existing.get('result_json'):
                raise Rejected(410, 'result_expired', 'This review has expired. Start a new review if needed.')
            return {'result': json.loads(existing['result_json'])}
        if existing.get('state') == 'failed':
            failure = existing['failure']
            raise Rejected(failure['status'], failure['code'], failure['message'])
        raise Rejected(409, 'request_in_progress', 'This video review is still processing. Retry shortly using the same request.')
    if user_count >= limits.user_daily or global_count >= limits.global_daily:
        raise Rejected(429, 'quota_exceeded', 'Video analysis has reached its daily limit. Try again tomorrow.')
    return None


def bounded_result(value):
    payload = json.dumps(value, allow_nan=False, separators=(',', ':'))
    if len(payload.encode()) > 700000:
        raise Rejected(422, 'result_too_large', 'Try a shorter video for this review.')
    return payload


def safe_project(value):
    if not isinstance(value, str) or not re.fullmatch(r'[a-z][a-z0-9-]{4,28}[a-z0-9]', value):
        raise ValueError('An explicit Google Cloud project ID is required.')
    return value
