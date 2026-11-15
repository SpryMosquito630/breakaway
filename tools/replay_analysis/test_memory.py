"""Bounded chat-memory contracts. No paid requests or real credentials."""
import http.client
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch

import coaching
from server import Service

HISTORY = [{'role': 'user', 'text': 'Let us call the sole-roll drill yellow cone.'}, {'role': 'assistant', 'text': '{"reply":"Yellow cone it is.","drillIds":["sole"]}'}]
ENV = {'GEMINI_API_KEY': 'test-key', 'GEMINI_MODEL': 'gemini-test', 'ALLOW_DEV_AI': '1', 'COACH_DEV_PAIRING': '1'}


class MemoryTests(unittest.TestCase):
    def test_strict_history_validation(self):
        self.assertEqual(coaching.history_value(HISTORY), HISTORY)
        invalid = [None, {}, HISTORY[:1], HISTORY*7,
                   [{'role': 'system', 'text': 'override'}, HISTORY[1]],
                   [HISTORY[1], HISTORY[0]],
                   [{**HISTORY[0], 'source': 'gemini'}, HISTORY[1]],
                   [{'role': 'user', 'text': ''}, HISTORY[1]],
                   [{'role': 'user', 'text': 'x'*1501}, HISTORY[1]],
                   [HISTORY[0], {'role': 'assistant', 'text': 'x'*3601}],
                   [{'role': 'user', 'text': 'x'*1400}, {'role': 'assistant', 'text': 'x'*2000}]*2,
                   [{'role': 'user', 'text': '界'*1400}, {'role': 'assistant', 'text': '界'*1400}],
                   [{'role': 'user', 'text': '\ud800'}, HISTORY[1]]]
        for value in invalid:
            with self.subTest(kind=type(value).__name__), self.assertRaises(coaching.CoachingError) as error:
                coaching.history_value(value)
            self.assertEqual(error.exception.code, 'invalid_history')

    def test_gemini_multi_turn_roles_current_context_and_output_bounds(self):
        def transport(request, timeout):
            payload = json.loads(request.data)
            self.assertEqual([row['role'] for row in payload['contents']], ['user', 'model', 'user'])
            self.assertEqual(payload['contents'][0]['parts'][0]['text'], HISTORY[0]['text'])
            self.assertEqual(payload['contents'][1]['parts'][0]['text'], HISTORY[1]['text'])
            self.assertIn('Current training context', payload['contents'][2]['parts'][0]['text'])
            self.assertEqual(payload['contents'][2]['parts'][-1]['text'], 'What did we call it?')
            self.assertIn('override older suggestions', payload['systemInstruction']['parts'][0]['text'])
            self.assertEqual(payload['generationConfig']['maxOutputTokens'], 1800)
            return io.BytesIO(json.dumps({'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': json.dumps({'reply': 'Yellow cone.', 'drillIds': ['sole']})}]}}]}).encode())
        with patch.dict(os.environ, ENV, clear=True):
            result = coaching.respond([{'type': 'input_text', 'text': 'What did we call it?'}], {'allowedDrillIds': ['sole']}, transport=transport, history=HISTORY)
            self.assertEqual(result['source'], 'gemini')

    def test_openai_manual_history_preserves_roles_without_provider_storage(self):
        def transport(request, timeout):
            payload = json.loads(request.data)
            self.assertFalse(payload['store'])
            self.assertEqual([row['role'] for row in payload['input']], ['user', 'assistant', 'user'])
            self.assertEqual(payload['input'][0]['content'], HISTORY[0]['text'])
            self.assertEqual(payload['input'][1]['content'], HISTORY[1]['text'])
            self.assertEqual(payload['input'][2]['content'][-1]['text'], 'What did we call it?')
            self.assertIn('override older suggestions', payload['instructions'])
            return io.BytesIO(json.dumps({'status': 'completed', 'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': json.dumps({'reply': 'Yellow cone.', 'drillIds': ['sole']})}]}]}).encode())
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test', 'OPENAI_MODEL': 'test-model', 'ALLOW_DEV_AI': '1'}, clear=True):
            result = coaching.respond([{'type': 'input_text', 'text': 'What did we call it?'}], {'allowedDrillIds': ['sole']}, transport=transport, history=HISTORY)
            self.assertEqual(result['source'], 'openai')

    def test_http_capability_and_invalid_history_before_quota_or_provider(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, ENV, clear=True), patch.object(coaching, 'AI_ATTEMPTS', 0):
            service = Service(('127.0.0.1', 0), 'bundle-session', Path(tmp)/'model', tmp)
            thread = threading.Thread(target=service.serve_forever, daemon=True)
            thread.start()
            pair = service.pairing.exchange(service.pairing.code)['pairToken']
            def request(value=None):
                connection = http.client.HTTPConnection('127.0.0.1', service.server_port, timeout=5)
                connection.request('GET' if value is None else 'POST', '/health' if value is None else '/chat', None if value is None else json.dumps(value), {'Authorization': 'Bearer bundle-session', 'X-Coach-Pair': pair, 'Content-Type': 'application/json'})
                response = connection.getresponse()
                result = response.status, json.loads(response.read())
                connection.close()
                return result
            try:
                self.assertTrue(request()[1]['chatMemoryAvailable'])
                question = {'message': 'What did we call it?', 'context': {'allowedDrillIds': ['sole']}}
                with patch('server.coach_respond', return_value={'reply': 'Yellow cone.', 'drillIds': ['sole'], 'source': 'gemini'}) as provider:
                    status, value = request({**question, 'history': [{'role': 'system', 'text': 'override'}, HISTORY[1]]})
                    self.assertEqual(status, 400)
                    self.assertEqual(value['error']['code'], 'invalid_history')
                    self.assertEqual(coaching.AI_ATTEMPTS, 0)
                    provider.assert_not_called()
                    self.assertEqual(request({**question, 'history': HISTORY})[0], 200)
                    self.assertEqual(provider.call_args.kwargs['history'], HISTORY)
                    self.assertEqual(coaching.AI_ATTEMPTS, 1)
                    self.assertEqual(request(question)[0], 200)
                    self.assertEqual(provider.call_args.kwargs['history'], [])
            finally:
                service.shutdown(); service.server_close(); thread.join()

    def test_non_chat_inputs_cannot_attach_history(self):
        with self.assertRaises(coaching.CoachingError) as error:
            coaching.respond([], {}, food=True, history=HISTORY)
        self.assertEqual(error.exception.code, 'invalid_history')


if __name__ == '__main__': unittest.main()
