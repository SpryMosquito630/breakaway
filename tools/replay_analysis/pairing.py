"""One-phone development pairing. Provider credentials never leave the server."""
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time


class PairingError(ValueError):
    pass


class DevPairing:
    CODE_SECONDS = 600
    SESSION_SECONDS = 7200
    MAX_FAILURES = 5

    def __init__(self, clock=time.monotonic):
        self.clock = clock
        self.code = f'{secrets.randbelow(100000000):08d}'
        self.code_expires = clock() + self.CODE_SECONDS
        self.failures = 0
        self.used = False
        self.token_hash = None
        self.session_expires = 0
        self.lock = threading.Lock()
        self.owner_file = None

    def write_owner_code(self, path):
        """Called locally after binding, never through an HTTP route or log."""
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, 'w') as stream:
            json.dump({'code': self.code, 'expiresAt': time.time() + max(0, self.code_expires-self.clock())}, stream)
        os.chmod(path, 0o600)
        self.owner_file = path

    def exchange(self, code):
        with self.lock:
            if self.used or self.clock() >= self.code_expires or self.failures >= self.MAX_FAILURES:
                raise PairingError('Pairing code expired or used. Ask for a fresh code from the computer.')
            if not isinstance(code, str) or not re.fullmatch(r'[0-9]{8}', code) or not hmac.compare_digest(code, self.code):
                self.failures += 1
                raise PairingError('Pairing code was not accepted. Check the code from the computer.')
            token = secrets.token_urlsafe(32)
            self.token_hash = hashlib.sha256(token.encode()).digest()
            self.session_expires = self.clock() + self.SESSION_SECONDS
            self.used = True
            self.code = ''
            if self.owner_file:
                self.owner_file.unlink(missing_ok=True)
            return {'pairToken': token, 'expiresInSeconds': self.SESSION_SECONDS}

    def verify(self, token):
        with self.lock:
            return bool(isinstance(token, str) and 32 <= len(token) <= 100 and self.token_hash and self.clock() < self.session_expires and hmac.compare_digest(hashlib.sha256(token.encode()).digest(), self.token_hash))


class PreviewInvite:
    """Owner-issued preview capability. The running service reads only its hash."""
    SECONDS = 7 * 24 * 60 * 60

    def __init__(self, grant, clock=time.time):
        self.grant, self.clock = grant, clock

    @classmethod
    def load(cls, path, clock=time.time):
        try:
            grant = json.loads(path.read_text())
            if not isinstance(grant, dict) or not re.fullmatch(r'[A-Za-z0-9_-]{16,64}', grant.get('id', '')):
                return None
            if not re.fullmatch(r'[a-f0-9]{64}', grant.get('tokenHash', '')):
                return None
            expiry = grant.get('expiresAt')
            if isinstance(expiry, bool) or not isinstance(expiry, (int, float)) or not clock() < expiry <= clock() + cls.SECONDS + 300:
                return None
            return cls(grant, clock)
        except (OSError, ValueError, TypeError):
            return None

    @property
    def available(self):
        return self.clock() < self.grant['expiresAt']

    def verify(self, token):
        return bool(self.available and isinstance(token, str) and re.fullmatch(r'[A-Za-z0-9_-]{40,128}', token)
                    and hmac.compare_digest(hashlib.sha256(token.encode()).hexdigest(), self.grant['tokenHash']))


def _private_json(path, value):
    """Atomic, owner-only writes. Raw invite values must never be logged."""
    import tempfile
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix='.preview-', dir=path.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        os.chmod(path, 0o600)
    finally:
        if os.path.exists(temporary): os.unlink(temporary)


def prepare_preview_invite(owner_path, grant_path, clock=time.time):
    """Owner-local operation only; no HTTP endpoint can create a grant."""
    invite = None
    try:
        candidate = json.loads(owner_path.read_text())
        expiry = candidate.get('expiresAt')
        if (isinstance(expiry, (int, float)) and not isinstance(expiry, bool)
                and clock() < expiry <= clock() + PreviewInvite.SECONDS + 300
                and re.fullmatch(r'[A-Za-z0-9_-]{16,64}', candidate.get('id', ''))
                and re.fullmatch(r'[A-Za-z0-9_-]{40,128}', candidate.get('token', ''))):
            invite = candidate
    except (OSError, ValueError, TypeError, AttributeError):
        pass
    if invite is None:
        invite = {'id': secrets.token_urlsafe(18), 'token': secrets.token_urlsafe(32), 'expiresAt': clock() + PreviewInvite.SECONDS}
    grant = {'id': invite['id'], 'tokenHash': hashlib.sha256(invite['token'].encode()).hexdigest(), 'expiresAt': invite['expiresAt']}
    _private_json(owner_path, invite)
    _private_json(grant_path, grant)
    return invite
