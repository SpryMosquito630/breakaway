"""Bounded per-upload worker. Run by server.py in a timeout-limited subprocess."""
import argparse, json, math
from pathlib import Path
import cv2
from detector import BallDetector

MAX_SECONDS = 30
MAX_PIXELS = 4096 * 2160
MAX_SOURCE_FRAMES = 7200
MAX_SAMPLE_FPS = 15

class InvalidVideo(ValueError):
    pass

def analyze(path, model):
    cap = cv2.VideoCapture(str(path))
    try:
        if not cap.isOpened():
            raise InvalidVideo('This file could not be decoded as a video.')
        # OpenCV's FFmpeg backend defaults orientation-auto OFF in this build.
        # Expo's video renderer honors the display matrix, so align analysis to it.
        rotation = cap.get(cv2.CAP_PROP_ORIENTATION_META)
        cap.set(cv2.CAP_PROP_ORIENTATION_AUTO, 1)
        orientation_auto = bool(cap.get(cv2.CAP_PROP_ORIENTATION_AUTO))
        if rotation and not orientation_auto:
            raise InvalidVideo('Export this rotated recording as a standard upright video first.')
        width, height = int(cap.get(3)), int(cap.get(4))
        fps, declared_frames = cap.get(5), cap.get(7)
        if not math.isfinite(declared_frames) or declared_frames < 0:
            raise InvalidVideo('This video has invalid frame metadata.')
        if width < 16 or height < 16 or width * height > MAX_PIXELS:
            raise InvalidVideo('Use a video no larger than 4096 × 2160 pixels.')
        if not math.isfinite(fps) or not 1 <= fps <= 240:
            raise InvalidVideo('This video has an unsupported frame rate.')
        if declared_frames > 0 and declared_frames / fps > MAX_SECONDS + .05:
            raise InvalidVideo('Choose a clip of 30 seconds or less.')
        detector = BallDetector(model)
        decoded_size = None
        step = max(1, math.ceil(fps / MAX_SAMPLE_FPS))
        frames, previous, track_id, source_count, last_time = [], None, 0, 0, 0.0
        for index in range(MAX_SOURCE_FRAMES + 1):
            if not cap.grab():
                break
            source_count += 1
            if source_count > MAX_SOURCE_FRAMES:
                raise InvalidVideo('This video exceeds the frame-count limit.')
            position_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
            timestamp = position_ms / 1000 if math.isfinite(position_ms) and position_ms >= 0 else index / fps
            if index and timestamp <= last_time:
                timestamp = index / fps
            last_time = timestamp
            if timestamp > MAX_SECONDS:
                raise InvalidVideo('Choose a clip of 30 seconds or less.')
            if index % step:
                continue
            ok, image = cap.retrieve()
            if not ok or image is None:
                raise InvalidVideo('A video frame could not be decoded.')
            decoded_height, decoded_width = image.shape[:2]
            if decoded_height * decoded_width > MAX_PIXELS:
                raise InvalidVideo('Decoded video dimensions exceed the limit.')
            if decoded_size is None:
                decoded_size = (decoded_width, decoded_height)
                width, height = decoded_size
            elif decoded_size != (decoded_width, decoded_height):
                raise InvalidVideo('Use a video with consistent frame dimensions.')
            detection = detector.detect(image)
            row = {'time': round(timestamp, 6), 'x': None, 'y': None, 'radius': None,
                   'trackId': None, 'confidence': None}
            if detection:
                x, y, bw, bh, confidence = detection
                xy = (x / width, y / height)
                if previous is None or math.hypot(xy[0] - previous[0], xy[1] - previous[1]) > .2:
                    track_id += 1
                previous = xy
                row.update(x=round(xy[0], 6), y=round(xy[1], 6),
                           radius=round(min(.25, (bw + bh) / 4 / width), 6),
                           trackId=track_id, confidence=round(confidence, 6))
            else:
                previous = None
            frames.append(row)
        duration = max(source_count / fps, last_time + 1 / fps) if source_count else 0
        if source_count < 3 or len(frames) < 2 or duration < .2:
            raise InvalidVideo('Record at least a short movement before analyzing.')
        if duration > MAX_SECONDS + .05:
            raise InvalidVideo('Choose a clip of 30 seconds or less.')
        raw_motion, previous = [], None
        for row in frames:
            value = None
            if row['x'] is not None and previous and previous['x'] is not None and row['trackId'] == previous['trackId']:
                value = math.hypot(row['x'] - previous['x'], row['y'] - previous['y'])
            raw_motion.append(value)
            previous = row
        maximum = max((m for m in raw_motion if m is not None), default=0)
        motion = [round(m / maximum, 6) if m is not None and maximum else (0 if m is not None else None) for m in raw_motion]
        accepted = sum(row['x'] is not None for row in frames)
        return {'version': 1, 'width': width, 'height': height, 'fps': fps, 'sampleFps': fps / step,
                'duration': round(duration, 6), 'frames': frames, 'motion': motion,
                'model': 'YOLOX Nano · COCO sports ball', 'acceptedFrames': accepted, 'totalFrames': len(frames),
                'sourceFrames': source_count, 'orientationDegrees': rotation, 'orientationAuto': orientation_auto, 'coordinateSpace': 'normalized', 'radiusUnit': 'source_width',
                'status': 'tracked' if accepted >= 3 else ('insufficient_tracking' if accepted else 'no_ball_detected'),
                'semantics': 'ball_tracking_only', 'processedOn': 'local_computer',
                'motionLabel': 'Normalized image movement; includes camera movement, not physical speed',
                'confidenceLabel': 'Uncalibrated detector score; coverage is not accuracy'}
    finally:
        cap.release()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('input', type=Path); parser.add_argument('output', type=Path); parser.add_argument('--model', required=True, type=Path)
    args = parser.parse_args()
    try:
        result = {'ok': True, 'analysis': analyze(args.input, args.model)}
    except InvalidVideo as error:
        result = {'ok': False, 'error': {'code': 'invalid_video', 'message': str(error)}}
    except Exception:
        result = {'ok': False, 'error': {'code': 'analysis_failed', 'message': 'This recording could not be analyzed. Try a shorter, clearly framed clip.'}}
    args.output.write_text(json.dumps(result, allow_nan=False))
