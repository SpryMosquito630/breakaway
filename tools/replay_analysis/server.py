#!/usr/bin/env python3
"""Local-only dev video service. Never serves files or retains uploaded recordings."""
import argparse, email.policy, hashlib, hmac, json, os, secrets, socket, subprocess, sys, tempfile, threading, time
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from detector import MODEL_SHA256
from coaching import CoachingError, configured, context_value, authorize_attempt, respond as coach_respond
from coaching_worker import pose_available
from food_image import food_context, MAX_PHOTO_BYTES

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / 'work/replay-service'
MAX_BYTES = 50 * 1024 * 1024
UPLOAD_SECONDS = 30
ANALYSIS_SECONDS = 90
GATE = threading.Lock()

class ClientError(Exception):
    def __init__(self, status, code, message):
        self.status, self.code, self.message = status, code, message

def extract_video(body, content_type, destination):
    mime = content_type.split(';', 1)[0].strip().lower()
    if mime == 'multipart/form-data':
        parsed = BytesParser(policy=email.policy.default).parsebytes(
            b'Content-Type: ' + content_type.encode('ascii', errors='strict') + b'\r\nMIME-Version: 1.0\r\n\r\n' + body)
        if not parsed.is_multipart():
            raise ClientError(400, 'invalid_upload', 'The video upload was incomplete.')
        videos = [part for part in parsed.iter_parts() if part.get_param('name', header='content-disposition') == 'video']
        if len(videos) != 1:
            raise ClientError(400, 'invalid_upload', 'Upload one video in the video field.')
        payload = videos[0].get_payload(decode=True)
        if not isinstance(payload, bytes):
            raise ClientError(400, 'invalid_upload', 'The video upload was incomplete.')
    elif mime in {'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm', 'application/octet-stream'}:
        payload = body
    else:
        raise ClientError(415, 'unsupported_type', 'Upload an MP4, MOV, or supported video file.')
    if not payload or len(payload) > MAX_BYTES:
        raise ClientError(413, 'upload_too_large', 'Choose a video smaller than 50 MB.')
    destination.write_bytes(payload)

class Service(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 8
    def __init__(self, address, token, model, temp_root):
        self.token, self.model, self.temp_root = token, model, temp_root
        super().__init__(address, Handler)

class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def _cors(self):
        # No cookies or credentials; bearer value is explicitly supplied by the dev app.
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-User-Token')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Cache-Control', 'no-store')
    def respond(self, status, value):
        payload = json.dumps(value, allow_nan=False).encode()
        self.send_response(status); self._cors()
        self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(payload)))
        self.send_header('Connection', 'close'); self.end_headers(); self.wfile.write(payload); self.close_connection = True
    def error(self, status, code, message):
        self.respond(status, {'error': {'code': code, 'message': message}})
    def do_OPTIONS(self):
        self.respond(200, {'ok': True})
    def do_GET(self):
        if self.path != '/health':
            return self.error(404, 'not_found', 'This endpoint does not exist.')
        self.respond(200, {'available': True, 'busy': GATE.locked(), 'aiAvailable': configured(), 'jointViewAvailable': pose_available(), 'processedOn': 'local_computer',
                           'limits': {'maxBytes': MAX_BYTES, 'maxSeconds': 30, 'sampleFps': 15}, 'authentication': 'dev_session_token'})
    def read_body(self):
        max_bytes = min(MAX_BYTES, MAX_PHOTO_BYTES) if self.path == '/food' else MAX_BYTES
        self.connection.settimeout(UPLOAD_SECONDS)
        start, chunks, size = time.monotonic(), [], 0
        transfer = self.headers.get('Transfer-Encoding', '').lower()
        if transfer and transfer != 'chunked':
            raise ClientError(400, 'invalid_upload', 'Unsupported upload encoding.')
        if transfer == 'chunked':
            while True:
                line = self.rfile.readline(128)
                try:
                    count = int(line.split(b';', 1)[0].strip(), 16)
                except ValueError:
                    raise ClientError(400, 'invalid_upload', 'The upload could not be read.')
                if count < 0 or count > max_bytes or size + count > max_bytes:
                    raise ClientError(413, 'upload_too_large', 'Choose a photo smaller than 5 MB.' if self.path == '/food' else 'Choose a video smaller than 50 MB.')
                if count == 0:
                    break
                part = self.rfile.read(count)
                if len(part) != count or self.rfile.read(2) != b'\r\n':
                    raise ClientError(400, 'invalid_upload', 'The video upload was incomplete.')
                chunks.append(part); size += len(part)
                if time.monotonic() - start > UPLOAD_SECONDS:
                    raise ClientError(408, 'upload_timeout', 'The upload took too long. Try a shorter video.')
        else:
            try:
                length = int(self.headers.get('Content-Length', '-1'))
            except ValueError:
                length = -1
            if length < 1:
                raise ClientError(411, 'length_required', 'A video upload is required.')
            if length > max_bytes:
                raise ClientError(413, 'upload_too_large', 'Choose a photo smaller than 5 MB.' if self.path == '/food' else 'Choose a video smaller than 50 MB.')
            while size < length:
                part = self.rfile.read(min(1024 * 1024, length - size))
                if not part:
                    raise ClientError(400, 'invalid_upload', 'The video upload was incomplete.')
                chunks.append(part); size += len(part)
                if time.monotonic() - start > UPLOAD_SECONDS:
                    raise ClientError(408, 'upload_timeout', 'The upload took too long. Try a shorter video.')
        return b''.join(chunks)
    def do_POST(self):
        if self.path not in {'/analyze', '/chat', '/coach', '/pose', '/food'}:
            return self.error(404, 'not_found', 'This endpoint does not exist.')
        supplied = self.headers.get('Authorization', '')
        if not hmac.compare_digest(supplied.encode('utf-8'), ('Bearer ' + self.server.token).encode('utf-8')):
            return self.error(401, 'unauthorized', 'Reconnect to this computer before analyzing.')
        if not GATE.acquire(blocking=False):
            return self.error(409, 'busy', 'Another video is being analyzed. Try again shortly.')
        try:
            body = self.read_body()
            if self.path == '/chat':
                if len(body) > 24000: raise ClientError(413, 'context_too_large', 'Keep the message and context shorter.')
                try: request = json.loads(body)
                except ValueError: raise ClientError(400, 'invalid_request', 'Send a valid message.')
                if not isinstance(request, dict): raise ClientError(400, 'invalid_request', 'Send a valid message.')
                message = request.get('message')
                if not isinstance(message, str) or not 1 <= len(message.strip()) <= 1500: raise ClientError(400, 'invalid_message', 'Use a message of 1–1500 characters.')
                context = context_value(request.get('context', {}))
                authorize_attempt(self.headers.get('X-User-Token', ''))
                self.respond(200, coach_respond([{'type': 'input_text', 'text': message}], context))
                return
            if self.path in {'/coach','/food'} and not configured():
                raise ClientError(503, 'ai_unconfigured', 'AI needs a server-side API key and explicitly selected model.')
            if self.path == '/pose' and not pose_available():
                raise ClientError(503, 'joint_view_unavailable', 'Joint View needs its verified model and dependency on the analysis computer.')
            with tempfile.TemporaryDirectory(prefix='request-', dir=self.server.temp_root) as temp:
                temp = Path(temp); video, result = temp / 'recording.upload', temp / 'result.json'
                context = {}
                if self.path in {'/coach','/food'}:
                    content_type = self.headers.get('Content-Type', '')
                    parsed = BytesParser(policy=email.policy.default).parsebytes(b'Content-Type: ' + content_type.encode('ascii') + b'\r\nMIME-Version: 1.0\r\n\r\n' + body)
                    fields = [part for part in parsed.iter_parts() if part.get_param('name', header='content-disposition') == 'context'] if parsed.is_multipart() else []
                    if len(fields) > 1 or (self.path == '/coach' and len(fields) != 1): raise ClientError(400, 'invalid_context', 'Include one context field.')
                    raw_context = fields[0].get_payload(decode=True) if fields else b'{}'
                    if len(raw_context) > 16000: raise ClientError(413, 'context_too_large', 'Training context is too large.')
                    context = food_context(json.loads(raw_context)) if self.path == '/food' else context_value(json.loads(raw_context))
                if self.path == '/food':
                    photos = [part for part in parsed.iter_parts() if part.get_param('name', header='content-disposition') == 'photo'] if parsed.is_multipart() else []
                    if len(photos) != 1: raise ClientError(400, 'invalid_photo', 'Upload one photo in the photo field.')
                    photo = photos[0].get_payload(decode=True)
                    if not isinstance(photo,bytes) or not photo or len(photo)>MAX_PHOTO_BYTES: raise ClientError(413, 'invalid_photo', 'Choose a photo smaller than 5 MB.')
                    video.write_bytes(photo)
                else: extract_video(body, self.headers.get('Content-Type', ''), video)
                del body
                try:
                    if self.path in {'/coach','/food'}: authorize_attempt(self.headers.get('X-User-Token', ''))
                    if self.path in {'/coach', '/pose','/food'}:
                        context_path = temp / 'context.json'; context_path.write_text(json.dumps(context))
                        command = [sys.executable, str(Path(__file__).with_name('coaching_worker.py')), self.path[1:], str(video), str(result), '--context', str(context_path)]
                    else:
                        command = [sys.executable, str(Path(__file__).with_name('worker.py')), str(video), str(result), '--model', str(self.server.model)]
                    process = subprocess.run(command,
                                             timeout=ANALYSIS_SECONDS, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
                except subprocess.TimeoutExpired:
                    raise ClientError(504, 'analysis_timeout', 'Analysis took too long. Try a shorter clip.')
                if process.returncode or not result.exists() or result.stat().st_size > 2 * 1024 * 1024:
                    raise ClientError(422, 'analysis_failed', 'This recording could not be analyzed. Try another clip.')
                response = json.loads(result.read_text())
                if not response.get('ok'):
                    self.respond(422, {'error': response['error']})
                else:
                    self.respond(200, response['analysis'])
        except CoachingError as error:
            self.error(401 if error.code == 'auth_required' else 429 if error.code == 'ai_quota' else 503 if error.code in {'ai_unconfigured','auth_unconfigured','auth_unavailable'} else 502, error.code, error.message)
        except ClientError as error:
            self.error(error.status, error.code, error.message)
        except (TimeoutError, socket.timeout):
            self.error(408, 'upload_timeout', 'The upload took too long. Try a shorter video.')
        except (ConnectionError, BrokenPipeError):
            pass
        except Exception:
            self.error(400, 'invalid_upload', 'The video upload could not be processed.')
        finally:
            GATE.release()
    def log_message(self, fmt, *args):
        # Status only. No filenames, tokens, coordinates or source-video bytes in logs.
        print(f'analysis-service {self.command} {args[1] if len(args) > 1 else "request"}', flush=True)

def main():
    p = argparse.ArgumentParser(); p.add_argument('--port', type=int, default=8767)
    p.add_argument('--model', type=Path, default=RUNTIME / 'yolox_nano.onnx'); args = p.parse_args()
    if not args.model.exists() or hashlib.sha256(args.model.read_bytes()).hexdigest() != MODEL_SHA256:
        raise SystemExit('Model missing or checksum mismatch. Run tools/replay_analysis/bootstrap.py first.')
    RUNTIME.mkdir(parents=True, exist_ok=True)
    token = secrets.token_urlsafe(32)
    runtime = RUNTIME / 'runtime.json'
    with tempfile.TemporaryDirectory(prefix='uploads-', dir=RUNTIME) as temp:
        # Bind before publishing a session so a second instance cannot replace
        # the active server's token when this port is already occupied.
        server = Service(('127.0.0.1', args.port), token, args.model.resolve(), temp)
        fd = os.open(runtime, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, 'w') as config:
            json.dump({'token': token, 'port': args.port, 'startedAt': time.time()}, config)
        os.chmod(runtime, 0o600)
        print(f'Local analysis ready at 127.0.0.1:{args.port}; session config saved in ignored work/replay-service/runtime.json (token hidden).', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()
            if runtime.exists():
                try:
                    if json.loads(runtime.read_text()).get('token') == token:
                        runtime.unlink()
                except (ValueError, OSError):
                    pass

if __name__ == '__main__': main()
