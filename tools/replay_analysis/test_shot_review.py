"""Shot review contracts: synthetic footage and mocked provider only; no live quota."""
import http.client
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import cv2
import numpy as np
import coaching
import server
import shot_review as shot

ENV = {'GEMINI_API_KEY': 'test-key', 'GEMINI_MODEL': 'gemini-test', 'ALLOW_DEV_AI': '1', 'COACH_DEV_PAIRING': '1'}

def value():
    return {'confidence': 'medium', 'shotStyle': 'header', 'summary': 'Body stays centered in the visible attempt.', 'limitations': 'The camera angle obscures depth.', 'evidence': {key: True for key in shot.EVIDENCE}, 'categories': [{'id': key, 'score': score, 'reason': 'The visible body position remains centered.', 'timestampSeconds': .2} for key, score in zip(shot.CATEGORY_IDS, (2, 3, 4))], 'improvement': {'text': 'Keep the visible recovery balanced.', 'timestampSeconds': .2}}

class ValidationTests(unittest.TestCase):
    def test_derived_score_and_all_styles(self):
        for style in shot.STYLES:
            data = value(); data['shotStyle'] = style
            result = shot.validate(data, 1, [0, .2, .4])
            self.assertEqual(result['score'], None if style == 'unknown' else 75)
            self.assertTrue(result['subjective'])
            self.assertEqual(result['categories'][0]['score'], None if style == 'unknown' else 50)

    def test_low_confidence_missing_phase_or_category_abstains(self):
        variants = []
        data = value(); data['confidence'] = 'low'; variants.append(data)
        for flag in shot.EVIDENCE:
            data = value(); data['evidence'][flag] = False; variants.append(data)
        data = value(); data['categories'][0]['score'] = None; variants.append(data)
        for data in variants:
            result = shot.validate(data, 1, [0, .2])
            self.assertIsNone(result['score']); self.assertIsNone(result['improvement'])
            self.assertTrue(all(row['score'] is None for row in result['categories']))
            self.assertEqual(result['confidence'], 'low')

    def test_strict_invalid_output(self):
        variants = []
        for score in [True, 4.5, -1, 5, float('nan')]:
            data = value(); data['categories'][0]['score'] = score; variants.append(data)
        for stamp in [True, -1, 1.1, .3, float('nan'), None]:
            data = value(); data['categories'][0]['timestampSeconds'] = stamp; variants.append(data)
        data = value(); data['overall'] = 99; variants.append(data)
        data = value(); data['evidence']['strikeVisible'] = 'yes'; variants.append(data)
        data = value(); data['categories'][0]['id'] = 'speed'; variants.append(data)
        data = value(); data['categories'][0]['reason'] = ''; variants.append(data)
        data = value(); data['improvement']['timestampSeconds'] = .3; variants.append(data)
        for data in variants:
            with self.assertRaises(coaching.CoachingError): shot.validate(data, 1, [0, .2])

class ProviderTests(unittest.TestCase):
    def test_actual_bounded_frames_and_request(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, ENV, clear=True):
            path = Path(tmp)/'synthetic.mp4'
            writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*'mp4v'), 25, (64, 64))
            for i in range(250): writer.write(np.full((64, 64, 3), i % 255, np.uint8))
            writer.release()
            def transport(request, timeout):
                payload = json.loads(request.data)
                parts = payload['contents'][0]['parts']
                images = [part for part in parts if 'inlineData' in part]
                self.assertEqual(len(images), shot.MAX_FRAMES)
                self.assertTrue(all(part['inlineData']['mimeType'] == 'image/jpeg' for part in images))
                self.assertEqual(payload['generationConfig']['responseJsonSchema'], shot.SCHEMA)
                self.assertNotIn('test-key', request.full_url)
                self.assertIn('Do not invent ball contact', payload['systemInstruction']['parts'][0]['text'])
                data = value()
                for row in data['categories']: row['timestampSeconds'] = 0
                data['improvement']['timestampSeconds'] = 0
                return io.BytesIO(json.dumps({'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': json.dumps(data)}]}}]}).encode())
            result = shot.review(path, transport)
            self.assertEqual(result['score'], 75); self.assertEqual(result['sampledFrames'], 40)
            self.assertLessEqual(result['durationSeconds'], 30)

    def test_invalid_and_overlong_video_never_reaches_provider(self):
        from worker import InvalidVideo
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, ENV, clear=True), patch('urllib.request.urlopen') as provider:
            path = Path(tmp)/'synthetic.mp4'
            path.write_bytes(b'not a video')
            with self.assertRaises(InvalidVideo): shot.review(path)
            writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*'mp4v'), 10, (32, 32))
            for _ in range(310): writer.write(np.zeros((32, 32, 3), np.uint8))
            writer.release()
            with self.assertRaises(InvalidVideo): shot.review(path)
            provider.assert_not_called()

    def test_refusal_truncation_bad_json_and_unconfigured(self):
        frames = ([(0, np.zeros((32, 32, 3), np.uint8)), (.2, np.zeros((32, 32, 3), np.uint8))], 1, (32, 32), 5)
        bad = [b'[]', b'{}', b'bad', b'{"promptFeedback":{"blockReason":"SAFETY"}}', b'{"candidates":[{"finishReason":"MAX_TOKENS"}]}', b'{"candidates":[{"finishReason":"STOP","content":{"parts":[{"text":"{}"}]}}]}']
        with patch.dict(os.environ, ENV, clear=True), patch('coaching_worker.sample_video', return_value=frames):
            for raw in bad:
                with self.assertRaises(coaching.CoachingError): shot.review('unused', lambda *a, **k: io.BytesIO(raw))
        with patch.dict(os.environ, {}, clear=True), patch('urllib.request.urlopen') as provider:
            self.assertFalse(shot.available())
            with self.assertRaises(coaching.CoachingError): shot.review('unused')
            provider.assert_not_called()

class EndpointTests(unittest.TestCase):
    def test_auth_quota_upload_concurrency_timeout_and_cleanup(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, ENV, clear=True), patch.object(coaching, 'AI_ATTEMPTS', 0):
            service = server.Service(('127.0.0.1', 0), 'public-session', Path(tmp)/'model', tmp)
            thread = threading.Thread(target=service.serve_forever, daemon=True); thread.start()
            pair = service.pairing.exchange(service.pairing.code)['pairToken']
            def request(path='/shot-review', headers=None, body=b'video'):
                conn = http.client.HTTPConnection('127.0.0.1', service.server_port, timeout=5)
                conn.request('GET' if path == '/health' else 'POST', path, body=None if path == '/health' else body, headers={'Authorization': 'Bearer public-session', 'Content-Type': 'video/mp4', **(headers or {})})
                response = conn.getresponse(); result = response.status, json.loads(response.read()); conn.close()
                deadline = time.monotonic()+1
                while server.GATE.locked() and time.monotonic() < deadline: time.sleep(.005)
                return result
            def worker(command, **kwargs):
                self.assertIn('shot-review', command); self.assertIn('--include-pose', command)
                Path(command[4]).write_text(json.dumps({'ok': True, 'analysis': {'score': None, 'pose': None}}))
                return type('Process', (), {'returncode': 0})()
            try:
                self.assertTrue(request('/health')[1]['shotReviewAvailable'])
                with patch('server.subprocess.run', side_effect=worker) as process:
                    self.assertEqual(request()[0], 401)
                    self.assertEqual(coaching.AI_ATTEMPTS, 0); process.assert_not_called()
                    self.assertEqual(request(headers={'Authorization': ''})[0], 401)
                    headers = {'X-Coach-Pair': pair, 'X-Include-Pose': '1'}
                    self.assertEqual(request(headers={**headers, 'Content-Length': str(server.MAX_BYTES+1)}, body=b'')[0], 413)
                    self.assertEqual(request(headers=headers)[0], 200)
                    self.assertEqual(coaching.AI_ATTEMPTS, 1)
                    self.assertEqual(list(Path(tmp).glob('request-*')), [])
                with patch('server.subprocess.run', side_effect=server.subprocess.TimeoutExpired('worker', 90)):
                    self.assertEqual(request(headers=headers)[0], 504)
                    self.assertEqual(list(Path(tmp).glob('request-*')), [])
                with patch.object(coaching, 'AI_ATTEMPTS', coaching.MAX_AI_ATTEMPTS), patch('server.subprocess.run') as process:
                    self.assertFalse(request('/health')[1]['shotReviewAvailable'])
                    self.assertEqual(request(headers=headers)[0], 503); process.assert_not_called()
                server.GATE.acquire()
                try: self.assertEqual(request(headers=headers)[0], 409)
                finally: server.GATE.release()
            finally:
                service.shutdown(); service.server_close(); thread.join()

if __name__ == '__main__': unittest.main()
