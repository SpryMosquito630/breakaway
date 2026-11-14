"""Gemini chat contracts. All provider calls are mocked; no keys or paid calls."""
import io
import json
import os
import unittest
from unittest.mock import patch
import coaching

ENV = {'GEMINI_API_KEY': 'test-key', 'GEMINI_MODEL': 'gemini-test', 'ALLOW_DEV_AI': '1'}


class GeminiTests(unittest.TestCase):
    def response(self, value=None, finish='STOP'):
        return io.BytesIO(json.dumps({'candidates': [{'finishReason': finish, 'content': {'parts': [{'text': json.dumps(value or {'reply': 'Try sole rolls.', 'drillIds': ['sole']})}]}}]}).encode())

    def test_structured_request_and_truthful_source(self):
        def transport(request, timeout):
            self.assertEqual(request.full_url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent')
            self.assertNotIn('test-key', request.full_url)
            self.assertEqual(request.get_header('X-goog-api-key'), 'test-key')
            payload = json.loads(request.data)
            self.assertIn('Do not ask for names, contact details, exact age', payload['systemInstruction']['parts'][0]['text'])
            self.assertEqual(payload['generationConfig']['responseJsonSchema'], coaching.CHAT_SCHEMA)
            self.assertEqual(payload['generationConfig']['responseMimeType'], 'application/json')
            self.assertEqual(payload['contents'][0]['parts'][-1]['text'], 'practice?')
            return self.response()
        with patch.dict(os.environ, ENV, clear=True), patch.object(coaching, 'AI_ATTEMPTS', 0):
            self.assertTrue(coaching.chat_configured())
            self.assertFalse(coaching.configured())
            result = coaching.respond([{'type': 'input_text', 'text': 'practice?'}], {'allowedDrillIds': ['sole']}, transport=transport)
            self.assertEqual(result['source'], 'gemini')

    def test_fifth_reserved_attempt_succeeds_then_sixth_rejects(self):
        with patch.dict(os.environ, ENV, clear=True), patch.object(coaching, 'AI_ATTEMPTS', 0):
            for _ in range(5):
                coaching.authorize_attempt('', chat=True)
                result = coaching.respond([], {'allowedDrillIds': ['sole']}, transport=lambda *a, **k: self.response())
                self.assertEqual(result['source'], 'gemini')
            with self.assertRaises(coaching.CoachingError) as error:
                coaching.authorize_attempt('', chat=True)
            self.assertFalse(coaching.chat_configured())

    def test_auth_precedence_and_missing_config_never_call_provider(self):
        env = {**ENV, 'SUPABASE_URL': 'https://example.supabase.co', 'SUPABASE_PUBLISHABLE_KEY': 'sb_publishable_test'}
        with patch.dict(os.environ, env, clear=True), patch('urllib.request.urlopen') as call:
            with self.assertRaises(coaching.CoachingError) as error:
                coaching.authorize_attempt('', chat=True)
            self.assertEqual(error.exception.code, 'auth_required')
            call.assert_not_called()
        for env in [{}, {'GEMINI_API_KEY': 'test'}, {**ENV, 'GEMINI_MODEL': '../unsafe'}]:
            with patch.dict(os.environ, env, clear=True), patch('urllib.request.urlopen') as call:
                self.assertFalse(coaching.chat_configured())
                with self.assertRaises(coaching.CoachingError): coaching.respond([], {})
                call.assert_not_called()

    def test_rejects_unknown_drills_truncation_refusal_and_malformed_output(self):
        bad = [lambda: self.response({'reply': 'Invented', 'drillIds': ['unknown']}), lambda: self.response(finish='MAX_TOKENS'), lambda: io.BytesIO(b'{"promptFeedback":{"blockReason":"SAFETY"}}'), lambda: io.BytesIO(b'not json'), lambda: io.BytesIO(b'[]')]
        with patch.dict(os.environ, ENV, clear=True):
            for response in bad:
                with self.assertRaises(coaching.CoachingError):
                    coaching.respond([], {'allowedDrillIds': ['sole']}, transport=lambda *a, **k: response())


if __name__ == '__main__': unittest.main()
