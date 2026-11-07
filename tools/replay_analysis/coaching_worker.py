"""Isolated media decoding for sampled vision frames and experimental joint view."""
import argparse, base64, hashlib, json, math
from pathlib import Path
import cv2
from coaching import CoachingError, respond
from worker import InvalidVideo, MAX_PIXELS, MAX_SECONDS, MAX_SOURCE_FRAMES
POSE_MODEL = Path(__file__).resolve().parents[2] / 'work/analysis-prototype/pose_landmarker_lite.task'
POSE_SHA = '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a'

def pose_available(model=POSE_MODEL):
    try:
        import importlib.util
        return importlib.util.find_spec('mediapipe') is not None and model.is_file() and hashlib.sha256(model.read_bytes()).hexdigest() == POSE_SHA
    except OSError: return False

def sample_video(path, target_fps=5):
    cap = cv2.VideoCapture(str(path))
    try:
        if not cap.isOpened(): raise InvalidVideo('This file could not be decoded as a video.')
        rotation=cap.get(cv2.CAP_PROP_ORIENTATION_META); cap.set(cv2.CAP_PROP_ORIENTATION_AUTO,1)
        if rotation and not cap.get(cv2.CAP_PROP_ORIENTATION_AUTO): raise InvalidVideo('Export rotated footage upright before analysis.')
        w,h,fps,n=cap.get(3),cap.get(4),cap.get(5),cap.get(7)
        if not all(math.isfinite(x) for x in (w,h,fps,n)) or w*h > MAX_PIXELS or min(w,h)<16 or not 1<=fps<=240 or n<0 or n/fps>30.05: raise InvalidVideo('Use a supported video up to 30 seconds and 4096 × 2160 pixels.')
        frames=[]; step=max(1,math.ceil(fps/target_fps)); last=-1; size=None
        for index in range(MAX_SOURCE_FRAMES+1):
            if not cap.grab(): break
            if index>=MAX_SOURCE_FRAMES or index/fps>MAX_SECONDS: raise InvalidVideo('Choose a clip up to 30 seconds.')
            t=cap.get(cv2.CAP_PROP_POS_MSEC)/1000
            if not math.isfinite(t) or t<=last: t=index/fps
            last=t
            if t>30: raise InvalidVideo('Choose a clip up to 30 seconds.')
            if index%step: continue
            ok, image=cap.retrieve()
            if not ok or image is None: raise InvalidVideo('A video frame could not be decoded.')
            height,width=image.shape[:2]
            if width*height>MAX_PIXELS: raise InvalidVideo('Video dimensions exceed the limit.')
            if size is not None and size!=(width,height): raise InvalidVideo('Use a clip with consistent dimensions.')
            size=(width,height); scale=min(1,640/max(width,height))
            image=cv2.resize(image,(round(width*scale),round(height*scale)))
            frames.append((round(t,4),image))
        if not frames or last<=0: raise InvalidVideo('Choose a decodable video with more than one frame.')
        return frames, min(30,(index)/fps), size, fps/step
    finally: cap.release()

def feedback(path,context):
    frames,duration,_,_=sample_video(path,1)
    selected=[frames[round(i*(len(frames)-1)/min(7,len(frames)-1))] for i in range(min(8,len(frames)))] if len(frames)>1 else frames
    content=[{'type':'input_text','text':f'Clip duration {duration:.3f} seconds. Only {len(selected)} sampled frames follow.'}]
    for t,image in selected:
        ok,jpeg=cv2.imencode('.jpg',image,[cv2.IMWRITE_JPEG_QUALITY,75])
        if not ok: raise InvalidVideo('A sampled frame could not be encoded.')
        content.extend([{'type':'input_text','text':f'Frame at {t:.4f} seconds'},{'type':'input_image','detail':'low','image_url':'data:image/jpeg;base64,'+base64.b64encode(jpeg).decode()}])
    return respond(content,context,duration)

def joints(path,model=POSE_MODEL):
    if not pose_available(model): raise CoachingError('joint_view_unavailable','Joint View needs the verified MediaPipe model and dependency on the analysis computer.')
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    frames,duration,size,sample_fps=sample_video(path,5)
    options=vision.PoseLandmarkerOptions(base_options=python.BaseOptions(model_asset_path=str(model)),running_mode=vision.RunningMode.VIDEO,num_poses=1,min_pose_detection_confidence=.5,min_pose_presence_confidence=.5,min_tracking_confidence=.5)
    result=[]; visible=0
    with vision.PoseLandmarker.create_from_options(options) as detector:
        for t,image in frames:
            output=detector.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(image,cv2.COLOR_BGR2RGB)),round(t*1000)+1)
            points=[]
            if output.pose_landmarks:
                for p in output.pose_landmarks[0]:
                    valid=all(math.isfinite(x) for x in (p.x,p.y,p.visibility)) and 0<=p.x<=1 and 0<=p.y<=1 and p.visibility>=.7 and p.presence>=.7
                    points.append({'x':round(p.x,5),'y':round(p.y,5),'visibility':round(min(1,max(0,p.visibility)),4)} if valid else None)
            else: points=[None]*33
            if all(points[i] is not None for i in (0,11,12,23,24,25,26,27,28,31,32)): visible+=1
            result.append({'timestampSeconds':t,'joints':points})
    return {'durationSeconds':duration,'width':size[0],'height':size[1],'sampleFps':sample_fps,'frames':result,'fullBodyVisible':visible/len(result)>=.7,'visibleFrameFraction':round(visible/len(result),3),'limitations':'Experimental estimated 2D joints, sampled up to 5 fps. Visibility is model confidence, not accuracy. No form rating, repetition count, injury assessment or OVR change. Keep one whole person visible; gaps remain blank.'}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['coach','pose','food']);p.add_argument('video');p.add_argument('result');p.add_argument('--context');args=p.parse_args()
    try:
        if args.mode=='food':
            from food_image import estimate
            value=estimate(Path(args.video),json.loads(Path(args.context).read_text()))
        else:
            value=feedback(args.video,json.loads(Path(args.context).read_text())) if args.mode=='coach' else joints(args.video)
        output={'ok':True,'analysis':value}
    except (InvalidVideo,CoachingError) as e: output={'ok':False,'error':{'code':getattr(e,'code','invalid_video'),'message':getattr(e,'message',str(e))}}
    except Exception: output={'ok':False,'error':{'code':'analysis_failed','message':'This clip could not be processed. Try another recording.'}}
    Path(args.result).write_text(json.dumps(output,allow_nan=False))
