import hashlib
import hmac
import json
import unittest
from dataclasses import replace
from billing_webhook import WebhookConfig, WebhookError, receive_event, verify_event


class WebhookTests(unittest.TestCase):
    def setUp(self):
        self.config = WebhookConfig(True, 'Bearer ' + 'a' * 40, 's' * 40, 'app-real')
        self.event = {'id': 'event-1', 'type': 'RENEWAL', 'app_id': 'app-real', 'environment': 'PRODUCTION'}
        self.body = json.dumps({'api_version': '1.0', 'event': self.event}).encode()

    def signature(self, body=None, timestamp=1000):
        body = self.body if body is None else body
        digest = hmac.new(self.config.signing_secret.encode(), str(timestamp).encode() + b'.' + body, hashlib.sha256).hexdigest()
        return f't={timestamp},v1={digest}'

    def check_error(self, code, body=None, auth=None, signature=None, config=None, now=1000):
        with self.assertRaises(WebhookError) as error:
            verify_event(self.body if body is None else body, self.config.authorization if auth is None else auth,
                         self.signature() if signature is None else signature, config or self.config, now=now)
        self.assertEqual(error.exception.code, code)

    def test_disabled_and_missing_configuration(self):
        self.check_error('billing_disabled', config=WebhookConfig())
        self.check_error('billing_unconfigured', config=replace(self.config, signing_secret=''))

    def test_authentication_tampering_and_freshness(self):
        self.check_error('invalid_authorization', auth='client-token')
        self.check_error('invalid_signature', body=self.body + b' ')
        self.check_error('invalid_signature', now=1301)
        self.check_error('invalid_signature', now=699)
        for signature in ('', 't=x,v1=0', self.signature() + ',t=1000'):
            self.check_error('invalid_signature', signature=signature)

    def test_scope_and_malformed_payload(self):
        for key, value in [('app_id', 'another-app'), ('environment', 'SANDBOX')]:
            event = {**self.event, key: value}
            body = json.dumps({'api_version': '1.0', 'event': event}).encode()
            self.check_error('wrong_app_or_environment', body=body, signature=self.signature(body))
        for body in (b'{"api_version":"1.0","event":[]}', b'{"event":null}', b'{"api_version":"1.0","event":{},"event":{}}', b'null', b'NaN'):
            self.check_error('invalid_event', body=body, signature=self.signature(body))
        self.check_error('invalid_body_size', body=b'x' * 262145)

    def test_retry_has_stable_event_content_and_digest(self):
        saved = {}
        def persist(args):
            if args['p_event_id'] in saved:
                self.assertEqual(saved[args['p_event_id']], args)
                return False
            saved[args['p_event_id']] = args
            return True
        self.assertFalse(receive_event(self.body, self.config.authorization, self.signature(), self.config, persist, now=1000)['duplicate'])
        spaced = json.dumps({'event': self.event, 'api_version': '1.0'}, indent=2).encode()
        self.assertTrue(receive_event(spaced, self.config.authorization, self.signature(spaced, 1500), self.config, persist, now=1500)['duplicate'])

    def test_sink_failure_is_not_acknowledged(self):
        def broken(_):
            raise ConnectionError('database unavailable')
        with self.assertRaises(ConnectionError):
            receive_event(self.body, self.config.authorization, self.signature(), self.config, broken, now=1000)
        with self.assertRaises(RuntimeError):
            receive_event(self.body, self.config.authorization, self.signature(), self.config, lambda _: None, now=1000)

    def test_unknown_event_is_preserved_without_grant(self):
        self.event['type'] = 'FUTURE_EVENT'
        body = json.dumps({'api_version': '1.0', 'event': self.event}).encode()
        self.assertEqual(verify_event(body, self.config.authorization, self.signature(body), self.config, now=1000)['type'], 'FUTURE_EVENT')


if __name__ == '__main__':
    unittest.main()
