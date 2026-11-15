"""Dedicated hosted API: Firebase identity, durable quota and bounded media workers."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from core import Limits, Rejected, identity, request_id, request_digest, safe_project

ROOT = Path(__file__).resolve().parents[2]
REPLAY = ROOT / 'tools/replay_analysis'


def create_app(verify_user=None, verify_app=None, ledger=None, worker=None, limits=None):
    from flask import Flask, jsonify, request
    from werkzeug.exceptions import RequestEntityTooLarge
    limits = limits or Limits(int(os.environ.get('USER_DAILY_LIMIT', '2')), int(os.environ.get('GLOBAL_DAILY_LIMIT', '10')))
    allowed_apps = frozenset(filter(None, os.environ.get('FIREBASE_ALLOWED_APP_IDS', '').split(',')))
    origins = frozenset(filter(None, os.environ.get('ALLOWED_WEB_ORIGINS', '').split(',')))
    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = limits.max_bytes + 65536
    app.config['MAX_FORM_MEMORY_SIZE'] = 65536
    app.config['MAX_FORM_PARTS'] = 4
    if verify_user is None:
        import firebase_admin
        from firebase_admin import auth, app_check
        from google.cloud import firestore
        from ledger import FirestoreLedger
        project = safe_project(os.environ.get('GOOGLE_CLOUD_PROJECT'))
        firebase_admin.initialize_app(options={'projectId': project})
        verify_user = lambda token: auth.verify_id_token(token, check_revoked=True)
        verify_app = app_check.verify_token
        ledger = FirestoreLedger(firestore.Client(project=project), limits)
        sys.path.insert(0, str(REPLAY))
        from coaching_worker import pose_available
        if not pose_available():
            raise RuntimeError('Verified pose model is required for this deployment.')
    worker = worker or run_worker

    @app.after_request
    def response_headers(response):
        response.headers['Cache-Control'] = 'no-store'
        if request.headers.get('Origin') in origins:
            response.headers['Access-Control-Allow-Origin'] = request.headers['Origin']
            response.headers['Vary'] = 'Origin'
            response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, X-Request-ID, X-Firebase-AppCheck, X-Include-Pose'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        return response

    @app.errorhandler(Rejected)
    def rejected(error):
        return jsonify(error={'code': error.code, 'message': error.message}), error.status

    @app.errorhandler(RequestEntityTooLarge)
    def too_large(_error):
        return rejected(Rejected(413, 'upload_too_large', 'Choose a video smaller than 25 MB.'))

    @app.get('/health')
    def health():
        ready = os.environ.get('HOSTED_AUTH_READY') == 'true'
        return jsonify(available=ready, hosted=True, authentication='firebase', authReady=ready, jointViewAvailable=ready,
                       shotReviewAvailable=ready and bool(os.environ.get('GEMINI_API_KEY') and os.environ.get('GEMINI_MODEL')),
                       limits={'maxBytes': limits.max_bytes, 'maxSeconds': 30})

    @app.route('/<mode>', methods=['POST', 'OPTIONS'])
    def analyze(mode):
        if mode not in {'pose', 'shot-review'}:
            raise Rejected(404, 'not_found', 'This analysis is not available.')
        if request.method == 'OPTIONS':
            return '', 204
        if os.environ.get('HOSTED_AUTH_READY') != 'true':
            raise Rejected(503, 'service_unavailable', 'Video analysis is not available yet. Try again later.')
        if request.headers.get('Origin') and request.headers['Origin'] not in origins:
            raise Rejected(403, 'origin_rejected', 'Open Breakaway to review your video.')
        bearer = request.headers.get('Authorization', '')
        if not bearer.startswith('Bearer ') or not 1 <= len(bearer[7:]) <= 8192:
            raise Rejected(401, 'auth_required', 'Sign in to review your video.')
        try:
            claims = verify_user(bearer[7:])
        except Exception:
            raise Rejected(401, 'auth_required', 'Your session expired. Sign in again.') from None
        app_claims = None
        if claims.get('firebase', {}).get('sign_in_provider') == 'anonymous':
            token = request.headers.get('X-Firebase-AppCheck', '')
            try:
                if not token or len(token) > 8192:
                    raise ValueError()
                app_claims = verify_app(token)
            except Exception:
                raise Rejected(403, 'app_check_required', 'Update Breakaway to continue video analysis.') from None
        uid = identity(claims, app_claims, allowed_apps)
        operation = request_id(request.headers.get('X-Request-ID'))
        videos = request.files.getlist('video')
        if len(videos) != 1 or set(request.files) != {'video'} or request.form:
            raise Rejected(400, 'invalid_upload', 'Choose one video to review.')
        payload = videos[0].read(limits.max_bytes + 1)
        if not payload or len(payload) > limits.max_bytes:
            raise Rejected(413, 'upload_too_large', 'Choose a video smaller than 25 MB.')
        include_pose = mode == 'shot-review' and request.headers.get('X-Include-Pose') == '1'
        digest = request_digest(mode, payload, include_pose)
        try:
            existing = ledger.reserve(uid, operation, digest)
        except Rejected:
            raise
        except Exception:
            raise Rejected(503, 'service_unavailable', 'Video analysis is temporarily unavailable. Try again later.') from None
        if existing is not None:
            return jsonify(existing['result'])
        try:
            with tempfile.TemporaryDirectory(prefix='analysis-') as directory:
                path = Path(directory) / 'recording.upload'
                path.write_bytes(payload)
                del payload
                result = worker(mode, path, include_pose, limits.worker_seconds)
            ledger.complete(uid, operation, result)
            return jsonify(result)
        except Rejected as error:
            try:
                ledger.fail(uid, operation, error, uncertain=error.status >= 500)
            except Exception:
                pass  # Durable reservation remains; never dispatch it again.
            raise
        except Exception:
            raise Rejected(503, 'service_unavailable', 'This review could not finish. Retry this request shortly.') from None

    return app


def run_worker(mode, path, include_pose, timeout):
    result = path.with_name('result.json')
    command = [sys.executable, str(Path(__file__).with_name('worker.py')), mode, str(path), str(result)]
    if include_pose:
        command.append('--include-pose')
    try:
        process = subprocess.run(command, timeout=timeout, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except subprocess.TimeoutExpired:
        raise Rejected(504, 'analysis_timeout', 'Video analysis took too long. Retry this request shortly.') from None
    if process.returncode or not result.exists() or result.stat().st_size > 700000:
        raise Rejected(422, 'analysis_failed', 'This video could not be analyzed. Try a clearer clip.')
    value = json.loads(result.read_text())
    if not value.get('ok'):
        error = value.get('error', {})
        code = error.get('code', 'analysis_failed')
        status = 503 if code in {'provider_unavailable', 'ai_unconfigured', 'joint_view_unavailable'} else 502 if code.startswith('provider_') or code == 'invalid_provider_output' else 422
        raise Rejected(status, code, error.get('message', 'Try another recording.'))
    return value['analysis']
