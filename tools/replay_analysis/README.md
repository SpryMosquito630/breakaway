# Breakaway local video-analysis development service

The app sends a selected recording only after **Analyze**. It is processed on this computer using the pinned official YOLOX Nano ONNX model. Ball tracking and Joint View do not send recordings to an AI API. The separately opted-in AI feedback action sends up to eight reduced-size frames to OpenAI only when explicitly configured. The phone reaches this computer through the existing Expo HTTPS development tunnel, so the upload necessarily travels through that tunnel provider. This is a development prototype, not production hosting or production authentication.

The service returns automatic **ball tracking only**: source dimensions/timestamps, normalized ball centers, optional marker radius, uncalibrated detector scores and normalized image movement. It does not infer body feints, cuts, technique advice, skill phases, physical speed or player ratings. Authored demo notes in the sample replay stay separate from a new recording's results.

## Start

Use Python3.13 and Node, from the repository root:

```sh
python3.13 -m venv work/replay-service/.venv
work/replay-service/.venv/bin/pip install --only-binary=:all: -r tools/replay_analysis/requirements.txt
work/replay-service/.venv/bin/python tools/replay_analysis/bootstrap.py
work/replay-service/.venv/bin/python tools/replay_analysis/server.py
```

In a second terminal:

```sh
node tools/replay_analysis/start-expo.cjs --tunnel --port 8081
```

`bootstrap.py` downloads the ONNX graph only from the official Megvii YOLOX release and verifies SHA256 `c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d`. Upstream Apache2.0 license is included. No executable pickle/PyTorch checkpoint is loaded. The detector follows upstream BGR416×416, top-left padding114 and0–255 preprocessing, objectness×COCO sports-ball(class32), threshold0.25, class NMS0.45. Model input uses the recording's original pixels; it does not follow a green ad overlay or reuse sample coordinates.

The server binds **127.0.0.1:8767 only**. Metro's `server.enhanceMiddleware` proxies only `/api/replay/health`, `/api/replay/analyze`, `/api/replay/chat`, `/api/replay/coach`, `/api/replay/pose` and `/api/replay/food` to that port, preserving its existing bundle middleware. No recording/result directory is served. The app derives the Metro host and can use the same HTTPS address as Expo Go, including on cellular. A Metro restart is required after first adding this config. `start-expo.cjs` reads ignored `work/replay-service/runtime.json` and sets `EXPO_PUBLIC_ANALYSIS_TOKEN` without printing it. Restart Expo after restarting the Python service, because a fresh service session rotates that token. Token/config/model/temp files are ignored by git under `work/`.

The session bearer is deliberately not production authentication: any public development app bundle can contain client configuration. Never expose this as an unrestricted public paid service. Bounds and serialization remain enforced independently of the token. No unrelated secret/environment file is read.

## API

`GET /api/replay/health` needs no token. It returns `{available:true,busy:false,processedOn:"local_computer",limits:{maxBytes:52428800,maxSeconds:30,sampleFps:15}}`. It never returns a token or filesystem path. An unavailable local service returns503/`available:false` through Metro.

`POST /api/replay/analyze` requires `Authorization: Bearer <current session token>`. Accept either multipart field **video** (one file) or a raw body with video/mp4,video/quicktime,video/x-m4v,video/webm,application/octet-stream. Filenames and declared MIME do not establish that it is a video: OpenCV must decode it. Multipart and chunked transfer are supported. Content-Length and actual incoming bytes are both bounded.

Success example:

```json
{
  "version": 1,
  "width": 1920,
  "height": 1080,
  "fps": 24,
  "sampleFps": 12,
  "duration": 7,
  "frames": [
    {"time":0,"x":0.464,"y":0.744,"radius":0.058,"trackId":1,"confidence":0.92},
    {"time":0.083333,"x":null,"y":null,"radius":null,"trackId":null,"confidence":null}
  ],
  "motion": [null,null],
  "status": "tracked",
  "model": "YOLOX Nano · COCO sports ball",
  "acceptedFrames": 82,
  "totalFrames": 84,
  "coordinateSpace": "normalized",
  "radiusUnit": "source_width",
  "semantics": "ball_tracking_only",
  "processedOn": "local_computer"
}
```

The abbreviated frame list illustrates the schema only. `fps` is source metadata; **do not index `frames` by source fps**. Seek by each returned source `time`. `sampleFps` is at most15 and may be12 for24fps input. Every sampled time has an entry; missing detections have explicit nulls. Radius is normalized to source width, not height. Returned width/height come from the decoded first frame, after explicitly enabling OpenCV's automatic orientation transform; subsequent dimensions must match. A track resets after a gap or a large image-space jump. No coordinates are interpolated.

`motion` aligns with frames. It is adjacent accepted normalized-image center displacement divided by the maximum displacement within this recording, with nulls across missing frames/new IDs. Camera movement is included. It is not physical speed. Detector confidence is not a calibrated correctness percentage. Coverage is not accuracy.

Statuses: `tracked` if at least3 sampled frames were accepted, `insufficient_tracking` for1–2, `no_ball_detected` for0. All are actual results, not fallback sample analysis. Errors use `{error:{code,message}}`:401 invalid session,409 busy,413 size,422 invalid/unsupported decoded video,504 analysis timeout; other upload errors400/408/411/415. Show `error.message` in the app.

## Bounds and recording cleanup

- Maximum50MiB entire HTTP body,30seconds (0.05s rounding tolerance),4096×2160 pixel count,240fps,7200 decoded source frames, at most15 sampled frames/s.
- One upload/analysis at a time. Another request gets409 immediately. Upload deadline30s, socket read timeout30s, worker wall timeout90s; the process is killed on timeout.
- Ball tracking decodes/releases one source frame at a time. Joint/AI review retains at most 150 reduced-size (longest side 640px) sampled frames in bounded worker memory. ONNX tensors and output samples are bounded. Multipart request parsing can use approximately a few body-sized memory copies (bounded by50MiB); this is not a hardened multi-tenant parser.
- Each authorized request uses a random temporary directory. Source bytes and result file are removed on success, invalid input, timeout or disconnected-response cleanup. No input video or coordinates are logged, and no uploaded original is returned by this server. The app retains its original local URI for replay.
- Normal shutdown removes the empty upload root and runtime session. An abrupt OS/process kill can prevent Python cleanup; inspect/remove orphaned `work/replay-service/uploads-*` before sharing or handing off the machine. These paths are never exposed through HTTP.

## Verify

Use an explicitly chosen public/consented local fixture; tests never discover recordings:

```sh
work/replay-service/.venv/bin/python tools/replay_analysis/test_service.py --fixture /absolute/path/to/clean-test.mp4 --model work/replay-service/yolox_nano.onnx
```

The suite exercises a real model+multipart upload, timed gap schema, invalid bytes, invalid multipart, auth, oversized request header, black/chunked video, busy rejection, unserved paths and temporary-file cleanup. A clean7s/24fps stock fixture yielded82/84 sampled accepted frames at12fps. This is one fixture's coverage, not general accuracy. The suite also generated a genuine90°MOV display-matrix fixture: raw1920×1080 became decoded1080×1920 after explicitly enabling orientation-auto. This verifies geometry handling on this backend, not all camera/device formats or portrait detector accuracy. Stream-size enforcement and worker-timeout paths also verify temporary cleanup.


## Training guide, optional AI feedback and experimental Joint View

`CoachAI` first offers **Local guide**, a deterministic device-only summary of the actual plan, saved practice and self-reported tests. It is not an AI response. **Send to AI** explicitly shares bounded message/context. `VideoFeedback` explicitly asks **Get AI feedback** before sending frames. Neither operation runs automatically after ball tracking or selection. AI text never changes OVR or test scores. Saved feedback stores text only on the device (20 notes max), not a permanent video copy. Timestamp buttons seek only observations from the currently selected clip; old notes are labeled as unlinked text.

AI is **unavailable by default**. Server-only environment variables `OPENAI_API_KEY` and `OPENAI_MODEL` are required; choose a model supporting Responses vision and strict structured outputs. There is no guessed/default model. Configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (or corresponding `EXPO_PUBLIC_` values on the server) for authenticated use. The client sends its signed-in session JWT in `X-User-Token` only for an explicit AI request; the server verifies it with Supabase `/auth/v1/user` before any provider request. Missing/expired JWTs are rejected. Auth configuration always takes precedence over development opt-in. Verified users receive at most five attempts/user and50 total attempts per running service. Failed attempts consume quota. These in-memory quotas reset on restart and do not replace durable production budgets. Without auth configuration, `ALLOW_DEV_AI=1` enables an explicit development-only path with five total attempts per running service shared across all bundle holders. Do not enable development opt-in on a public/shared deployment. No key belongs in any `EXPO_PUBLIC_*` variable. The session bearer is only development friction.

`GET /health` adds `aiAvailable` (provider/auth configuration, or remaining opt-in development quota) and `jointViewAvailable` (installed dependency + verified model). No secret is returned.

- `POST /chat`: JSON `{message,context}` where message is 1–1500 characters, context ≤16000 serialized characters, allowedDrillIds ≤100 strings. Returns `{reply,drillIds,source:"openai"}`. No conversation memory is sent automatically.
- `POST /coach`: multipart `video` plus `context` JSON. Worker decodes upright footage with the same source limits, samples up to eight JPEG frames ≤640px on the longest side, and calls Responses with timestamped `input_image` content. Returns `{summary,limitations,observations:[{timestampSeconds,observation,uncertainty,drillId}],source:"openai"}`. At most six observations; timestamps and drill IDs are validated. This is sparse visual feedback, not continuous action recognition. Instructions require uncertainty and no technical correction when evidence is insufficient. Audio is not sent.
- `POST /pose`: multipart `video`. Local MediaPipe Pose Landmarker lite returns source dimensions, sampled timestamps (≤5fps), 33 normalized estimated joints or nulls per sample, visibility gate fraction and explicit limitations. Joints outside frame or with visibility/presence below0.7 are null. The whole-body gate requires face, shoulders, hips, knees, ankles and feet on ≥70% of sampled frames. This is a visibility heuristic, not validated technique, rep counting or medical analysis. Overlay disappears over gaps.

All four added routes require the current development bearer; AI routes additionally require a verified account JWT when auth is configured and share the serialized request gate. Worker timeout90s; provider timeout55s; strict structured output token budget1800; `store:false`; refusals/incomplete/error/invalid outputs return errors instead of demo feedback. Server request directories and sampled images (memory only) are deleted/released after completion. `store:false` does not constitute a claim about provider retention policies.

Official implementation references: [Responses structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [vision image input](https://developers.openai.com/api/docs/guides/images-vision), [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/python). Pose model: official Google artifact `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`, SHA256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`; Apache2.0 license in `POSE-MODEL-LICENSE.txt`. Optional dependency pinned in `requirements-joints.txt`; run `bootstrap_pose.py` to verify/download the model. Current default model path is ignored `work/analysis-prototype/pose_landmarker_lite.task`.

Verification: `python tools/replay_analysis/test_coaching.py` uses mocked Responses transport (zero paid requests) to check strict request shape, no-provider-call unconfigured state, refusal handling, bounds/drill allowlist, verified-auth success/expired-token/verification-timeout paths, per-user quota, actual local decoding and missing pose model; existing eight service tests still pass. Actual MediaPipe processed the explicit public full-body fixture Pexels13189490 (93 sampled frames from18.45s portrait720×1280); this proves the integration can return landmarks, **not coaching accuracy**. Live OpenAI/model/account behavior remains unverified until authorized server credentials are configured. Real-device camera/codec and overlay alignment still require device QA.


### Explicit AI meal-photo estimate

`POST /api/replay/food` accepts exactly one multipart **photo** field and optional **context** JSON `{portionGrams?:number}` (1–5000g). Entire request limit5MiB, JPEG/PNG only, source16MP maximum. The timeout-isolated worker reads image dimensions before decode, honors EXIF orientation, scales to640px longest side, and copies pixels into a new RGB JPEG with no EXIF before sending that image to OpenAI. Source bytes and temporary outputs are deleted at request end. This endpoint shares verified account authentication and total AI quota with chat/video; it cannot run by selection alone.

Returns `{name,calories,protein,carbs,fat,notes,source:"openai",approximate:true,editable:true}`. Calories are kcal and macros grams for the supplied/assumed photographed portion. Every numeric value can be null for insufficient evidence, and non-null values are bounded0–10000. Notes describe uncertainty, portion assumptions and hidden ingredients. No targets, diagnoses, allergy assurances or confidence percentages are returned. The UI must let the user edit and explicitly save a meal after review; the endpoint itself does not save food logs. Live estimates remain unverified without credentials. The typed client helper `estimateFoodPhoto` obtains only the signed-in user's session at explicit request time.

Eleven coaching contract tests now also verify image rotation/640px reduction/EXIF removal, null/invalid nutrient handling, a mocked strict image-provider response, authenticated quotas and missing credentials; no live provider requests are made.
