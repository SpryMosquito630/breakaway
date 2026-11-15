"""Pairing boundary tests. No provider requests, keys, or paid calls."""
import http.client
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch

import coaching
from pairing import DevPairing, PairingError
from server import Service

ENV = {'GEMINI_API_KEY': 'test', 'GEMINI_MODEL': 'test-model', 'ALLOW_DEV_AI': '1', 'COACH_DEV_PAIRING': '1'}


class PairingTests(unittest.TestCase):
    def test_code_single_use_failure_budget_and_expiry(self):
        now = [100.0]
        pair = DevPairing(lambda: now[0])
        code = pair.code
        for _ in range(5):
            with self.assertRaises(PairingError): pair.exchange('invalid')
        with self.assertRaises(PairingError): pair.exchange(code)
        pair = DevPairing(lambda: now[0])
        code = pair.code
        now[0] += 600
        with self.assertRaises(PairingError): pair.exchange(code)
        pair = DevPairing(lambda: now[0])
        code = pair.code
        result = pair.exchange(code)
        self.assertTrue(pair.verify(result['pairToken']))
        self.assertFalse(pair.verify('wrong'))
        with self.assertRaises(PairingError): pair.exchange(code)
        now[0] += 7200
        self.assertFalse(pair.verify(result['pairToken']))

    def test_owner_file_private_and_consumed(self):
        with tempfile.TemporaryDirectory() as tmp:
            pair = DevPairing()
            path = Path(tmp)/'pair.json'
            pair.write_owner_code(path)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertEqual(json.loads(path.read_text())['code'], pair.code)
            pair.exchange(pair.code)
            self.assertFalse(path.exists())

    def run_service(self, env, action):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, env, clear=True), patch.object(coaching, 'AI_ATTEMPTS', 0), patch.object(coaching, 'USER_ATTEMPTS', {}):
            service = Service(('127.0.0.1', 0), 'bundle-session', Path(tmp)/'model', tmp)
            thread = threading.Thread(target=service.serve_forever, daemon=True)
            thread.start()
            def request(path, value=None, headers=None):
                connection = http.client.HTTPConnection('127.0.0.1', service.server_port, timeout=5)
                connection.request('GET' if value is None else 'POST', path, None if value is None else json.dumps(value), {'Authorization': 'Bearer bundle-session', 'Content-Type': 'application/json', **(headers or {})})
                response = connection.getresponse()
                result = response.status, json.loads(response.read())
                connection.close()
                return result
            try: action(service, request)
            finally: service.shutdown(); service.server_close(); thread.join()

    def test_http_pairing_enforced_before_provider_and_quota(self):
        def action(service, request):
            question = {'message': 'First touch practice?', 'context': {'allowedDrillIds': []}}
            with patch('server.coach_respond', return_value={'reply': 'Practice gently.', 'drillIds': [], 'source': 'gemini'}) as provider:
                health = request('/health')[1]
                self.assertTrue(health['chatPairRequired'])
                self.assertNotIn(service.pairing.code, json.dumps(health))
                for headers in ({}, {'X-Coach-Pair': 'bad-token'}):
                    status, body = request('/chat', question, headers)
                    self.assertEqual(status, 401)
                    self.assertEqual(body['error']['code'], 'pair_required')
                self.assertEqual(coaching.AI_ATTEMPTS, 0)
                provider.assert_not_called()
                self.assertEqual(request('/pair', {'code': service.pairing.code}, {'Authorization': ''})[0], 401)
                code = service.pairing.code
                self.assertEqual(request('/pair', {'code': 'invalid'})[0], 401)
                status, pair = request('/pair', {'code': code})
                self.assertEqual(status, 200)
                self.assertEqual(request('/pair', {'code': code})[0], 401)
                headers = {'X-Coach-Pair': pair['pairToken']}
                expiry = service.pairing.session_expires
                service.pairing.session_expires = 0
                self.assertEqual(request('/chat', question, headers)[0], 401)
                self.assertEqual(coaching.AI_ATTEMPTS, 0)
                provider.assert_not_called()
                service.pairing.session_expires = expiry
                for _ in range(5): self.assertEqual(request('/chat', question, headers)[0], 200)
                self.assertEqual(request('/chat', question, headers)[0], 429)
                self.assertEqual(provider.call_count, 5)
                self.assertEqual(coaching.AI_ATTEMPTS, 5)
        self.run_service(ENV, action)

    def test_disabled_pairing_and_authenticated_precedence(self):
        def disabled(service, request):
            self.assertFalse(request('/health')[1]['chatAvailable'])
            self.assertEqual(request('/pair', {'code': '12345678'})[0], 404)
            self.assertEqual(request('/chat', {'message': 'Test?', 'context': {}})[0], 401)
            self.assertEqual(coaching.AI_ATTEMPTS, 0)
        self.run_service({**ENV, 'COACH_DEV_PAIRING': '0'}, disabled)
        def authenticated(service, request):
            self.assertIsNone(service.pairing)
            self.assertFalse(request('/health')[1]['chatPairRequired'])
            self.assertEqual(request('/pair', {'code': '12345678'})[0], 404)
            question = {'message': 'Test?', 'context': {}}
            status, value = request('/chat', question, {'X-Coach-Pair': 'irrelevant'})
            self.assertEqual(status, 401)
            self.assertEqual(value['error']['code'], 'auth_required')
            with patch('coaching.verified_user', return_value='verified-user'), patch('server.coach_respond', return_value={'reply': 'Test.', 'drillIds': [], 'source': 'gemini'}):
                self.assertEqual(request('/chat', question, {'X-User-Token': 'valid-user-jwt'})[0], 200)
            self.assertEqual(coaching.AI_ATTEMPTS, 0)
        self.run_service({**ENV, 'SUPABASE_URL': 'https://example.supabase.co', 'SUPABASE_PUBLISHABLE_KEY': 'sb_publishable_test'}, authenticated)


if __name__ == '__main__': unittest.main()
