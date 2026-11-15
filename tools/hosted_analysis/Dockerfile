FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 libgl1 libegl1 libgomp1 libportaudio2 && rm -rf /var/lib/apt/lists/*
COPY tools/replay_analysis/requirements.txt tools/replay_analysis/requirements-joints.txt tools/replay_analysis/
COPY tools/hosted_analysis/requirements.txt tools/hosted_analysis/requirements.txt
RUN pip install --no-cache-dir -r tools/replay_analysis/requirements.txt -r tools/replay_analysis/requirements-joints.txt -r tools/hosted_analysis/requirements.txt
COPY tools/replay_analysis/*.py tools/replay_analysis/
COPY tools/hosted_analysis/*.py tools/hosted_analysis/
RUN python tools/replay_analysis/bootstrap_pose.py
RUN python -c "import cv2; import mediapipe; import sys; sys.path.insert(0, 'tools/replay_analysis'); from coaching_worker import pose_available; assert pose_available(), 'Verified pose runtime unavailable'"
RUN useradd --create-home --uid 10001 analysis && chown -R analysis:analysis /app
USER analysis
WORKDIR /app/tools/hosted_analysis
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "2", "--timeout", "115", "--access-logfile", "/dev/null", "app:create_app()"]
