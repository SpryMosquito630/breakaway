#!/usr/bin/env python3
"""Fetch only the official ONNX artifact and verify its pinned checksum."""
import hashlib, shutil, urllib.request
from pathlib import Path
from detector import MODEL_URL, MODEL_SHA256
root = Path(__file__).resolve().parents[2] / 'work/replay-service'
root.mkdir(parents=True, exist_ok=True)
model = root / 'yolox_nano.onnx'
if not model.exists() or hashlib.sha256(model.read_bytes()).hexdigest() != MODEL_SHA256:
    pending = root / 'download.pending'
    try:
        with urllib.request.urlopen(MODEL_URL, timeout=60) as source, pending.open('wb') as target:
            total = 0
            while chunk := source.read(1024 * 1024):
                total += len(chunk)
                if total > 10 * 1024 * 1024: raise ValueError('Unexpected model size.')
                target.write(chunk)
        if hashlib.sha256(pending.read_bytes()).hexdigest() != MODEL_SHA256:
            raise ValueError('Official model checksum mismatch; refusing this file.')
        pending.replace(model)
    finally:
        pending.unlink(missing_ok=True)
print('Pinned official YOLOX Nano ONNX model verified. No recordings are included.')
