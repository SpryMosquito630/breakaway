"""Fetch only the pinned official MediaPipe pose model; never touch recordings."""
import hashlib,urllib.request
from pathlib import Path
from coaching_worker import POSE_MODEL,POSE_SHA
URL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
POSE_MODEL.parent.mkdir(parents=True,exist_ok=True)
if not POSE_MODEL.exists() or hashlib.sha256(POSE_MODEL.read_bytes()).hexdigest()!=POSE_SHA:
 pending=POSE_MODEL.with_suffix('.pending')
 try:
  with urllib.request.urlopen(URL,timeout=60) as source,pending.open('wb') as target:
   total=0
   while chunk:=source.read(1024*1024):
    total+=len(chunk)
    if total>10*1024*1024:raise ValueError('Unexpected model size.')
    target.write(chunk)
  if hashlib.sha256(pending.read_bytes()).hexdigest()!=POSE_SHA:raise ValueError('Model checksum mismatch.')
  pending.replace(POSE_MODEL)
 finally:pending.unlink(missing_ok=True)
print('Pinned official pose model verified.')
