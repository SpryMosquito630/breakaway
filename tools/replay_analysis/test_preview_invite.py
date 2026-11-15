"""Private preview authentication tests; only isolated grants and mocked provider calls."""
import http.client
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
import coaching
from pairing import PreviewInvite, prepare_preview_invite
from preview_invite import private_link
from server import Service

ENV = {'GEMINI_API_KEY': 'test', 'GEMINI_MODEL': 'test-model', 'ALLOW_DEV_AI': '1', 'COACH_DEV_PAIRING': '1', 'COACH_PREVIEW_INVITE_ENABLED': '1'}


class PreviewInviteTests(unittest.TestCase):
    def test_private_owner_persistence_restart_expiry_and_tamper(self):
        with tempfile.TemporaryDirectory() as tmp:
            owner, grant = Path(tmp)/'owner.json', Path(tmp)/'grant.json'
            now = [1000.0]
            clock = lambda: now[0]
            invite = prepare_preview_invite(owner, grant, clock)
            self.assertEqual(owner.stat().st_mode & 0o777, 0o600)
            self.assertEqual(grant.stat().st_mode & 0o777, 0o600)
            self.assertNotIn(invite['token'], grant.read_text())
            self.assertEqual(prepare_preview_invite(owner, grant, clock), invite)
            first = PreviewInvite.load(grant, clock)
            self.assertTrue(first.verify(invite['token']))
            self.assertFalse(first.verify(invite['token'] + 'x'))
            self.assertFalse(first.verify('bundle-session'))
            self.assertTrue(PreviewInvite.load(grant, clock).verify(invite['token']))
            now[0] = invite['expiresAt']
            self.assertFalse(first.verify(invite['token']))
            self.assertIsNone(PreviewInvite.load(grant, clock))
            replacement = prepare_preview_invite(owner, grant, clock)
            self.assertNotEqual(replacement['token'], invite['token'])
            self.assertNotEqual(replacement['id'], invite['id'])
            grant.write_text('{bad')
            self.assertIsNone(PreviewInvite.load(grant, clock))

    def test_secret_only_in_fragment_never_request_target(self):
        from urllib.parse import urlsplit
        invite = {'id': 'ownerpreviewdevice001', 'token': 'x'*43, 'expiresAt': 1800000000}
        url = private_link('exp://test.on.expo.app', invite)
        parsed = urlsplit(url)
        self.assertNotIn(invite['token'], parsed.path + parsed.query)
        self.assertIn(invite['token'], parsed.fragment)
        for bad in ['javascript:alert(1)', 'https://user:pass@example.com']:
            with self.assertRaises(ValueError): private_link(bad, invite)

    def test_http_restart_keeps_invite_guard_before_provider_and_existing_quota(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, ENV, clear=True), patch('server.RUNTIME', Path(tmp)), patch.object(coaching, 'AI_ATTEMPTS', 0), patch.object(coaching, 'USER_ATTEMPTS', {}):
            invite = prepare_preview_invite(Path(tmp)/'owner.json', Path(tmp)/'coach-preview-grant.json')
            def run(action):
                service = Service(('127.0.0.1', 0), 'bundle-session', Path(tmp)/'model', tmp)
                thread = threading.Thread(target=service.serve_forever, daemon=True); thread.start()
                def request(path, value=None, credential=None):
                    connection = http.client.HTTPConnection('127.0.0.1', service.server_port, timeout=5)
                    headers = {'Authorization': 'Bearer bundle-session', 'Content-Type': 'application/json'}
                    if credential is not None: headers['X-Coach-Pair'] = credential
                    connection.request('GET' if value is None else 'POST', path, None if value is None else json.dumps(value), headers)
                    response = connection.getresponse(); result = response.status, json.loads(response.read()); connection.close(); return result
                try: action(service, request)
                finally: service.shutdown(); service.server_close(); thread.join()
            question = {'message': 'Synthetic first touch?', 'context': {'allowedDrillIds': []}}
            with patch('server.coach_respond', return_value={'reply': 'Synthetic answer.', 'drillIds': [], 'source': 'gemini'}) as provider:
                def first(service, request):
                    health = request('/health')[1]
                    self.assertTrue(health['chatInviteAvailable'])
                    self.assertNotIn(invite['token'], json.dumps(health))
                    for credential in [None, 'bundle-session', 'bad-token']:
                        status, value = request('/chat', question, credential)
                        self.assertEqual(status, 401); self.assertEqual(value['error']['code'], 'pair_required')
                    provider.assert_not_called(); self.assertEqual(coaching.AI_ATTEMPTS, 0)
                    self.assertEqual(request('/chat', question, invite['token'])[0], 200)
                run(first)
                def restarted(service, request):
                    self.assertEqual(request('/chat', question, invite['token'])[0], 200)
                    service.preview_invite.grant['expiresAt'] = 0
                    self.assertEqual(request('/chat', question, invite['token'])[0], 401)
                    self.assertEqual(coaching.AI_ATTEMPTS, 2)
                run(restarted)
                def capped(service, request):
                    for _ in range(3): self.assertEqual(request('/chat', question, invite['token'])[0], 200)
                    self.assertEqual(request('/chat', question, invite['token'])[0], 429)
                    self.assertEqual(provider.call_count, 5)
                run(capped)

    def test_invite_feature_is_disabled_without_explicit_owner_dev_opt_in(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {**ENV, 'COACH_PREVIEW_INVITE_ENABLED': '0'}, clear=True), patch('server.RUNTIME', Path(tmp)):
            prepare_preview_invite(Path(tmp)/'owner.json', Path(tmp)/'coach-preview-grant.json')
            service = Service(('127.0.0.1', 0), 'bundle-session', Path(tmp)/'model', tmp)
            try: self.assertIsNone(service.preview_invite)
            finally: service.server_close()


if __name__ == '__main__': unittest.main()
