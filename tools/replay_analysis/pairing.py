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
