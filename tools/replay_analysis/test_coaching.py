"""No paid requests: mocked provider contract + actual local media/pose checks."""
import io,json,os,tempfile,unittest,threading,http.client,time
from pathlib import Path
from unittest.mock import patch
import cv2,numpy as np
import coaching
from coaching import CoachingError,validate_result,respond
from coaching_worker import sample_video,joints,pose_available
from server import Service,GATE

class ContractTests(unittest.TestCase):
 def test_unconfigured_never_calls_provider(self):
  with patch.dict(os.environ,{},clear=True), patch('urllib.request.urlopen') as call:
   with self.assertRaises(CoachingError):respond([], {})
   call.assert_not_called()
 def test_optin_and_quota(self):
  with patch.dict(os.environ,{'OPENAI_API_KEY':'test','OPENAI_MODEL':'explicit-test-model','ALLOW_DEV_AI':'1'}),patch.object(coaching,'AI_ATTEMPTS',0):
   for _ in range(5):coaching.reserve_attempt()
   self.assertFalse(coaching.configured())
   with self.assertRaises(CoachingError):coaching.reserve_attempt()
 def test_structured_request_and_refusal(self):
  captured=[]
  def transport(request,timeout):
   captured.append(json.loads(request.data));return io.BytesIO(json.dumps({'status':'completed','output':[{'type':'message','content':[{'type':'output_text','text':json.dumps({'reply':'Use your saved plan.','drillIds':['sole']})}]}]}).encode())
  with patch.dict(os.environ,{'OPENAI_API_KEY':'test','OPENAI_MODEL':'explicit-test-model','ALLOW_DEV_AI':'1'}):
   result=respond([{'type':'input_text','text':'plan?'}],{'allowedDrillIds':['sole']},transport=transport)
   self.assertEqual(result['source'],'openai');self.assertFalse(captured[0]['store']);self.assertTrue(captured[0]['text']['format']['strict']);self.assertEqual(captured[0]['model'],'explicit-test-model')
   def refusal(*a,**kw):return io.BytesIO(json.dumps({'status':'completed','output':[{'type':'message','content':[{'type':'refusal','refusal':'no'}]}]}).encode())
   with self.assertRaisesRegex(CoachingError,'could not provide'):respond([],{},transport=refusal)
 def test_timestamp_and_drill_validation(self):
  value={'summary':'Visible evidence only','limitations':'Sparse samples','observations':[{'timestampSeconds':1,'observation':'Player visible','uncertainty':'Cannot judge motion','drillId':'sole'}]}
  self.assertEqual(len(validate_result(value,['sole'],3)['observations']),1)
  for invalid in (-1,4,float('nan'),True):
   value['observations'][0]['timestampSeconds']=invalid
   with self.assertRaises(CoachingError):validate_result(value,['sole'],3)
  value['observations'][0]['timestampSeconds']=1;value['observations'][0]['drillId']='invented'
  with self.assertRaises(CoachingError):validate_result(value,['sole'],3)
 def test_decode_bounds_and_missing_model(self):
  with tempfile.TemporaryDirectory() as tmp:
   path=Path(tmp)/'blank.mp4';writer=cv2.VideoWriter(str(path),cv2.VideoWriter_fourcc(*'mp4v'),24,(320,240))
   for _ in range(24):writer.write(np.zeros((240,320,3),np.uint8))
   writer.release();frames,duration,size,fps=sample_video(path)
   self.assertEqual(size,(320,240));self.assertLessEqual(fps,5);self.assertTrue(all(max(f.shape[:2])<=640 for t,f in frames));self.assertLessEqual(len(frames),5)
   self.assertFalse(pose_available(Path(tmp)/'missing.task'))
   with self.assertRaisesRegex(CoachingError,'verified'):joints(path,Path(tmp)/'missing.task')
 def test_verified_auth_and_no_dev_fallback(self):
  env={'OPENAI_API_KEY':'test','OPENAI_MODEL':'explicit-test-model','SUPABASE_URL':'https://example.supabase.co','SUPABASE_PUBLISHABLE_KEY':'sb_publishable_test','ALLOW_DEV_AI':'1'}
  uid='12345678-1234-1234-1234-123456789abc'
  with patch.dict(os.environ,env,clear=True),patch.object(coaching,'USER_ATTEMPTS',{}):
   self.assertTrue(coaching.configured())
   with self.assertRaises(CoachingError) as missing:coaching.authorize_attempt('')
   self.assertEqual(missing.exception.code,'auth_required')
   captured=[]
   def verify(request,timeout):
    captured.append(request);return io.BytesIO(json.dumps({'id':uid}).encode())
   with patch('urllib.request.urlopen',side_effect=verify):
    for _ in range(5):coaching.authorize_attempt('user-jwt')
    with self.assertRaises(CoachingError) as quota:coaching.authorize_attempt('user-jwt')
   self.assertEqual(quota.exception.code,'ai_quota');self.assertEqual(captured[0].full_url,'https://example.supabase.co/auth/v1/user')
   self.assertEqual(captured[0].get_header('Authorization'),'Bearer user-jwt')
   self.assertEqual(coaching.USER_ATTEMPTS[uid],5)
 def test_auth_failure_never_calls_responses(self):
  import urllib.error
  env={'OPENAI_API_KEY':'test','OPENAI_MODEL':'explicit-test-model','SUPABASE_URL':'https://example.supabase.co','SUPABASE_PUBLISHABLE_KEY':'sb_publishable_test'}
  with patch.dict(os.environ,env,clear=True):
   with patch('urllib.request.urlopen',side_effect=urllib.error.HTTPError('https://example.supabase.co/auth/v1/user',401,'expired',{},None)) as call:
    with self.assertRaises(CoachingError) as error:coaching.authorize_attempt('expired-jwt')
    self.assertEqual(error.exception.code,'auth_required');self.assertEqual(call.call_count,1)
   with patch('urllib.request.urlopen',side_effect=TimeoutError()):
    with self.assertRaises(CoachingError) as error:coaching.authorize_attempt('test-jwt')
    self.assertEqual(error.exception.code,'auth_unavailable')
 def test_blank_pose_has_no_fabricated_joints(self):
  if not pose_available():self.skipTest('optional pose dependency/model unavailable')
  with tempfile.TemporaryDirectory() as tmp:
   path=Path(tmp)/'blank.mp4';writer=cv2.VideoWriter(str(path),cv2.VideoWriter_fourcc(*'mp4v'),24,(320,240))
   for _ in range(12):writer.write(np.zeros((240,320,3),np.uint8))
   writer.release();result=joints(path)
   self.assertFalse(result['fullBodyVisible']);self.assertTrue(all(all(p is None for p in row['joints']) for row in result['frames']))
 def test_food_photo_normalization_and_nullable_output(self):
  from PIL import Image
  from food_image import normalized_photo,food_context
  source=io.BytesIO();image=Image.new('RGB',(1000,800),'orange');exif=Image.Exif();exif[270]='private metadata';exif[274]=6;image.save(source,format='JPEG',exif=exif)
  clean=normalized_photo(source.getvalue())
  with Image.open(io.BytesIO(clean)) as photo:
   self.assertLessEqual(max(photo.size),640);self.assertEqual(dict(photo.getexif()),{});self.assertEqual(photo.size,(512,640))
  self.assertEqual(food_context({'portionGrams':200}),{'portionGrams':200})
  with self.assertRaises(CoachingError):food_context({'portionGrams':-2})
  with self.assertRaises(CoachingError):normalized_photo(b'not an image')
  value={'name':'Unknown meal','calories':None,'protein':None,'carbs':None,'fat':None,'notes':['Portion and ingredients are unclear.']}
  result=coaching.validate_food(value);self.assertIsNone(result['calories']);self.assertTrue(result['approximate']);self.assertTrue(result['editable'])
  for number in (-1,10001,True,float('nan')):
   value['calories']=number
   with self.assertRaises(CoachingError):coaching.validate_food(value)
 def test_food_strict_mock_transport(self):
  payload={'name':'Meal','calories':300,'protein':10,'carbs':40,'fat':11,'notes':['Approximate portion; hidden ingredients uncertain.']}
  def transport(request,timeout):
   data=json.loads(request.data);self.assertEqual(data['text']['format']['name'],'food_estimate');self.assertEqual(data['input'][0]['content'][-1]['type'],'input_image')
   return io.BytesIO(json.dumps({'status':'completed','output':[{'type':'message','content':[{'type':'output_text','text':json.dumps(payload)}]}]}).encode())
  with patch.dict(os.environ,{'OPENAI_API_KEY':'test','OPENAI_MODEL':'explicit-test-model','ALLOW_DEV_AI':'1'}):
   result=respond([{'type':'input_image','image_url':'data:image/jpeg;base64,test'}],{},transport=transport,food=True)
   self.assertEqual(result['name'],'Meal');self.assertEqual(result['source'],'openai')
 def test_unconfigured_endpoints_and_temp_cleanup(self):
  with tempfile.TemporaryDirectory() as tmp,patch.dict(os.environ,{},clear=True):
   service=Service(('127.0.0.1',0),'test-token',Path(tmp)/'model',tmp)
   thread=threading.Thread(target=service.serve_forever,daemon=True);thread.start()
   def request(path,body,auth=True):
    c=http.client.HTTPConnection('127.0.0.1',service.server_port,timeout=5);c.request('POST',path,body,{'Authorization':'Bearer test-token' if auth else '', 'Content-Type':'application/json'});r=c.getresponse();value=(r.status,json.loads(r.read()));c.close();return value
   try:
    self.assertEqual(request('/chat',b'{}',False)[0],401)
    self.assertEqual(request('/chat',b'{"message":"plan?","context":{}}')[0],503)
    self.assertEqual(request('/coach',b'junk')[0],503)
    self.assertEqual(request('/food',b'junk')[0],503)
    self.assertEqual(list(Path(tmp).glob('request-*')),[])
   finally:service.shutdown();service.server_close();thread.join()
if __name__=='__main__':unittest.main()
