"""Dormant RevenueCat webhook boundary; never imported by the local/free service.

The host supplies a durable sink (PostgreSQL record_billing_event RPC) and must
return 2xx only after it commits. This module neither grants credits nor trusts
client CustomerInfo. All configuration is server-only and explicit.
"""
from dataclasses import dataclass
import hashlib
import hmac
import json
import re
import time
from typing import Callable


class WebhookError(ValueError):
    def __init__(self, status: int, code: str):
        super().__init__(code)
        self.status, self.code = status, code


@dataclass(frozen=True)
class WebhookConfig:
    enabled: bool = False
    authorization: str = ''
    signing_secret: str = ''
    app_id: str = ''
    environment: str = 'PRODUCTION'


def _object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate JSON key')
        result[key] = value
    return result


def verify_event(body: bytes, authorization: str, signature: str,
                 config: WebhookConfig, *, now: float | None = None) -> dict:
    """Authenticate exact raw bytes before parsing, bounded to 256 KiB.

    Require dashboard Authorization AND HMAC; retries are signed with a fresh
    delivery timestamp. Event timestamps do not govern the replay window.
    """
    if not config.enabled:
        raise WebhookError(503, 'billing_disabled')
    if (len(config.authorization) < 32 or len(config.signing_secret) < 32
            or not config.app_id or config.environment not in {'PRODUCTION', 'SANDBOX'}):
        raise WebhookError(503, 'billing_unconfigured')
    if not isinstance(body, bytes) or not 0 < len(body) <= 262144:
        raise WebhookError(413, 'invalid_body_size')
    if not hmac.compare_digest(authorization.encode(), config.authorization.encode()):
        raise WebhookError(401, 'invalid_authorization')
    match = re.fullmatch(r't=([0-9]{1,12}),v1=([0-9a-f]{64})', signature)
    if not match:
        raise WebhookError(401, 'invalid_signature')
    stamp, supplied = match.groups()
    expected = hmac.new(config.signing_secret.encode(), stamp.encode() + b'.' + body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, supplied) or abs((time.time() if now is None else now) - int(stamp)) > 300:
        raise WebhookError(401, 'invalid_signature')
    try:
        data = json.loads(body, object_pairs_hook=_object, parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
        event = data['event']
        if data.get('api_version') != '1.0' or not isinstance(event, dict):
            raise ValueError()
        for field in ('id', 'type', 'app_id'):
            if not isinstance(event.get(field), str) or not 1 <= len(event[field]) <= 256:
                raise ValueError()
        if event['app_id'] != config.app_id or event.get('environment') != config.environment:
            raise WebhookError(403, 'wrong_app_or_environment')
        # Transfer and unknown events are preserved for future reconciliation;
        # they must never grant from a guessed/anonymous user identity.
        return event
    except WebhookError:
        raise
    except (ValueError, TypeError, KeyError, UnicodeError, RecursionError):
        raise WebhookError(400, 'invalid_event') from None


def receive_event(body: bytes, authorization: str, signature: str,
                  config: WebhookConfig, persist: Callable[[dict], bool], *, now=None) -> dict:
    """persist accepts RPC args and returns inserted=True / duplicate=False.

    A sink failure propagates so the HTTP adapter returns a retryable 5xx.
    Use event's canonical digest: harmless JSON whitespace on a retry is not a
    conflict, but changed event content for an existing ID must fail in SQL.
    """
    event = verify_event(body, authorization, signature, config, now=now)
    canonical = json.dumps(event, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()
    inserted = persist({'p_event_id': event['id'], 'p_app_id': event['app_id'],
                        'p_environment': event['environment'], 'p_payload': event,
                        'p_digest': hashlib.sha256(canonical).hexdigest()})
    if type(inserted) is not bool:
        raise RuntimeError('durable sink must confirm inserted or duplicate')
    return {'accepted': True, 'duplicate': not inserted}
