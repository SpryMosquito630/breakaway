"""Integration tests use public clean fixture explicitly supplied by the caller.
No private recording discovery. No output video retained by the service.
Run: python tools/replay_analysis/test_service.py --fixture /path/to/clean.mp4 --model /path/to/model.onnx
"""
import argparse, http.client, json, secrets, tempfile, threading, time, unittest, shutil, subprocess
import server as service_module
from pathlib import Path
import cv2, numpy as np
from server import Service, MAX_BYTES, GATE

class ServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='breakaway-test-')
        cls.tmp = Path(cls.temp.name)
        cls.token = secrets.token_urlsafe(32)
        cls.service = Service(('127.0.0.1', 0), cls.token, ARGS.model.resolve(), cls.tmp)
        cls.thread = threading.Thread(target=cls.service.serve_forever, daemon=True); cls.thread.start()
        cls.port = cls.service.server_port
    @classmethod
    def tearDownClass(cls):
        cls.service.shutdown(); cls.service.server_close(); cls.thread.join(); cls.temp.cleanup()
    def request(self, method, path, body=None, headers=None, chunked=False):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=100)
        conn.request(method, path, body=body, headers=headers or {}, encode_chunked=chunked)
        response = conn.getresponse(); result = (response.status, json.loads(response.read())); conn.close()
        # Cleanup occurs in the request's finally block immediately after response write.
        deadline = time.monotonic() + 2
        while GATE.locked() and time.monotonic() < deadline: time.sleep(.005)
        return result
    def auth(self, kind='video/mp4'):
        return {'Authorization': 'Bearer ' + self.token, 'Content-Type': kind}
    def assert_cleanup(self):
        self.assertEqual(list(self.tmp.glob('request-*')), [])
    def test_health_without_token_and_no_files(self):
        status, response = self.request('GET', '/health')
        self.assertEqual(status, 200); self.assertTrue(response['available']); self.assertNotIn('token', response)
        self.assertEqual(self.request('GET', '/anything.mp4')[0], 404)
    def test_auth_and_oversized_header(self):
        self.assertEqual(self.request('POST', '/analyze', b'junk', {'Content-Type': 'video/mp4'})[0], 401)
        headers = self.auth(); headers['Content-Length'] = str(MAX_BYTES + 1)
        self.assertEqual(self.request('POST', '/analyze', b'', headers)[0], 413); self.assert_cleanup()
    def test_invalid_bytes_and_multipart_field(self):
        status, response = self.request('POST', '/analyze', b'this is not a video', self.auth())
        self.assertEqual(status, 422); self.assertEqual(response['error']['code'], 'invalid_video'); self.assert_cleanup()
        headers = self.auth('multipart/form-data; boundary=bad')
        self.assertEqual(self.request('POST', '/analyze', b'--bad--\r\n', headers)[0], 400); self.assert_cleanup()
    def test_actual_video_multipart(self):
        boundary = 'breakaway-test-' + secrets.token_hex(8)
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="video"; filename="video.mp4"\r\nContent-Type: video/mp4\r\n\r\n'.encode()
                + ARGS.fixture.read_bytes() + f'\r\n--{boundary}--\r\n'.encode())
        status, result = self.request('POST', '/analyze', body, self.auth('multipart/form-data; boundary=' + boundary))
        self.assertEqual(status, 200, result); self.assertEqual(result['status'], 'tracked')
        self.assertGreater(result['acceptedFrames'], 3); self.assertLessEqual(result['sampleFps'], 15)
        self.assertEqual(result['totalFrames'], len(result['frames'])); self.assertEqual(len(result['motion']), len(result['frames']))
        for i, row in enumerate(result['frames']):
            if i: self.assertGreater(row['time'], result['frames'][i-1]['time'])
            if row['x'] is not None:
                self.assertTrue(0 <= row['x'] <= 1 and 0 <= row['y'] <= 1); self.assertGreater(row['radius'], 0)
            else: self.assertIsNone(row['y']); self.assertIsNone(row['confidence']); self.assertIsNone(result['motion'][i])
        self.assertEqual(result['semantics'], 'ball_tracking_only'); self.assert_cleanup()
        print('Real fixture:', result['acceptedFrames'], '/', result['totalFrames'], 'sampled frames accepted;', result['width'], 'x', result['height'])
    def test_blank_video_and_chunked_body(self):
        path = self.tmp / 'blank.mp4'; writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*'mp4v'), 24, (256, 256))
        for _ in range(24): writer.write(np.zeros((256, 256, 3), np.uint8))
        writer.release(); body = path.read_bytes(); path.unlink()
        pieces = (body[i:i+256] for i in range(0, len(body), 256))
        status, result = self.request('POST', '/analyze', pieces, self.auth(), chunked=True)
        self.assertEqual(status, 200, result); self.assertEqual(result['status'], 'no_ball_detected')
        self.assertTrue(all(row['x'] is None for row in result['frames'])); self.assert_cleanup()
    def test_actual_stream_bound_and_timeout_cleanup(self):
        saved_size = service_module.MAX_BYTES
        service_module.MAX_BYTES = 1024
        try:
            status, _ = self.request('POST', '/analyze', (b'x' * 256 for _ in range(5)), self.auth(), chunked=True)
            self.assertEqual(status, 413); self.assert_cleanup()
        finally:
            service_module.MAX_BYTES = saved_size
        saved_timeout = service_module.ANALYSIS_SECONDS
        service_module.ANALYSIS_SECONDS = .01
        try:
            status, result = self.request('POST', '/analyze', ARGS.fixture.read_bytes(), self.auth())
            self.assertEqual(status, 504, result); self.assert_cleanup()
        finally:
            service_module.ANALYSIS_SECONDS = saved_timeout
    @unittest.skipUnless(shutil.which('ffmpeg'), 'ffmpeg needed only to generate rotation-test fixture')
    def test_rotated_mov_display_matrix(self):
        source = cv2.VideoCapture(str(ARGS.fixture))
        raw_w, raw_h = int(source.get(3)), int(source.get(4)); source.release()
        if raw_w <= raw_h:
            self.skipTest('This orientation regression uses a landscape test fixture.')
        rotated = self.tmp / 'rotated.mov'
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-display_rotation:v:0', '90', '-i', str(ARGS.fixture), '-c', 'copy', str(rotated)], check=True)
        try:
            status, result = self.request('POST', '/analyze', rotated.read_bytes(), self.auth('video/quicktime'))
            self.assertEqual(status, 200, result)
            self.assertEqual((result['width'], result['height']), (raw_h, raw_w))
            self.assertTrue(result['orientationAuto']); self.assertNotEqual(result['orientationDegrees'], 0)
            self.assert_cleanup()
        finally:
            rotated.unlink(missing_ok=True)
    def test_busy_does_not_accept_second_recording(self):
        GATE.acquire()
        try:
            conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
            conn.request('POST', '/analyze', b'junk', self.auth()); response = conn.getresponse()
            self.assertEqual(response.status, 409); response.read(); conn.close()
        finally: GATE.release()
        self.assert_cleanup()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--fixture', required=True, type=Path); parser.add_argument('--model', required=True, type=Path)
    ARGS = parser.parse_args(); unittest.main(argv=['test_service.py'], verbosity=2)
