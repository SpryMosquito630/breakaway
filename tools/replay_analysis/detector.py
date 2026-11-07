"""YOLOX Nano ONNX inference, adapted from official Apache-2.0 deployment recipe.
https://github.com/Megvii-BaseDetection/YOLOX/tree/main/demo/ONNXRuntime
Only the COCO sports-ball category is used. Scores are not probabilities of correctness.
"""
import cv2
import numpy as np

MODEL_URL = 'https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_nano.onnx'
MODEL_SHA256 = 'c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d'

class BallDetector:
    def __init__(self, model):
        cv2.setNumThreads(2)
        self.net = cv2.dnn.readNetFromONNX(str(model))
        grids, strides = [], []
        for s in (8, 16, 32):
            y, x = np.meshgrid(np.arange(416 // s), np.arange(416 // s), indexing='ij')
            grids.append(np.stack((x, y), axis=-1).reshape(-1, 2))
            strides.append(np.full((x.size, 1), s))
        self.grid, self.stride = np.concatenate(grids), np.concatenate(strides)

    def detect(self, frame):
        h, w = frame.shape[:2]
        ratio = min(416 / h, 416 / w)
        img = np.full((416, 416, 3), 114, np.uint8)
        small = cv2.resize(frame, (int(w * ratio), int(h * ratio)))
        img[:small.shape[0], :small.shape[1]] = small
        self.net.setInput(cv2.dnn.blobFromImage(img, 1.0, (416, 416), swapRB=False))
        pred = self.net.forward()[0].copy()
        pred[:, :2] = (pred[:, :2] + self.grid) * self.stride
        pred[:, 2:4] = np.exp(pred[:, 2:4]) * self.stride
        scores = pred[:, 4] * pred[:, 37]  # objectness * COCO sports ball (class32)
        candidates = []
        for j in np.where(scores >= .25)[0]:
            x, y, bw, bh = (float(v) for v in pred[j, :4] / ratio)
            if 0 <= x < w and 0 <= y < h and bw > 0 and bh > 0:
                candidates.append((x, y, bw, bh, float(scores[j])))
        if not candidates:
            return None
        boxes = [[x - bw / 2, y - bh / 2, bw, bh] for x, y, bw, bh, _ in candidates]
        keep = cv2.dnn.NMSBoxes(boxes, [d[4] for d in candidates], .25, .45)
        kept = sorted([candidates[int(i)] for i in np.asarray(keep).reshape(-1)], key=lambda d: -d[4])
        if len(kept) > 1 and kept[0][4] - kept[1][4] <= .1:
            return None  # Ambiguity is a gap, not an invented identity.
        return kept[0] if kept else None
