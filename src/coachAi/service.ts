import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { connectedClient } from '../connected/client';
import type { ImagePickerAsset } from 'expo-image-picker';
export type ServiceState={base:string; token:string; aiAvailable:boolean; jointViewAvailable:boolean};
export type Feedback={source:'openai'; summary:string; limitations:string; observations:{timestampSeconds:number;observation:string;uncertainty:string;drillId:string|null}[]};
export type Joint={x:number;y:number;visibility:number};
export type JointResult={durationSeconds:number;width:number;height:number;sampleFps:number;fullBodyVisible:boolean;visibleFrameFraction:number;limitations:string;frames:{timestampSeconds:number;joints:(Joint|null)[]}[]};
function baseURL() {
  if(process.env.EXPO_PUBLIC_ANALYSIS_URL) return process.env.EXPO_PUBLIC_ANALYSIS_URL.replace(/\/$/,'');
  if(Platform.OS==='web' && typeof location!=='undefined') return `${location.origin}/api/replay`;
  const host=Constants.expoConfig?.hostUri;
  return host ? `${/exp\.direct|on\.expo\.app|ngrok/.test(host)?'https':'http'}://${host}/api/replay` : null;
}
export async function discoverService(signal?:AbortSignal):Promise<ServiceState|null> {
  const base=baseURL(); const token=process.env.EXPO_PUBLIC_ANALYSIS_TOKEN;
  if(!base || !token) return null;
  const response=await fetch(`${base}/health`,{signal}); const body=await response.json();
  return response.ok && body.available ? {base,token,aiAvailable:body.aiAvailable===true,jointViewAvailable:body.jointViewAvailable===true}:null;
}
export async function requestService<T>(service:ServiceState,path:string,body:BodyInit,signal:AbortSignal,json=false):Promise<T> {
  const session=(path==='chat'||path==='coach'||path==='food') && connectedClient ? await connectedClient.auth.getSession():null;
  const userToken=session?.data.session?.access_token;
  const response=await fetch(`${service.base}/${path}`, {method:'POST',body,signal,headers:{Authorization:`Bearer ${service.token}`,...(userToken?{'X-User-Token':userToken}:{}),...(json?{'Content-Type':'application/json'}:{})}});
  const value=await response.json();
  if(!response.ok) throw new Error(value?.error?.message ?? 'The analysis service is unavailable.');
  return value as T;
}
export async function clipForm(asset:ImagePickerAsset,context?:unknown) {
  if(asset.fileSize && asset.fileSize>50*1024*1024) throw new Error('Choose a video smaller than 50 MB.');
  if(asset.duration && asset.duration>30050) throw new Error('Choose a video up to 30 seconds.');
  const form=new FormData();
  if(Platform.OS==='web') {
    const blob=asset.file ?? await (await fetch(asset.uri)).blob();
    if(blob.size>50*1024*1024) throw new Error('Choose a video smaller than 50 MB.');
    form.append('video',blob,'recording.mp4');
  } else form.append('video',{uri:asset.uri,name:'recording.mp4',type:asset.mimeType??'video/mp4'} as any);
  if(context) form.append('context',JSON.stringify(context));
  return form;
}
export type FoodPhotoEstimate={name:string;calories:number|null;protein:number|null;carbs:number|null;fat:number|null;notes:string[];source:'openai';approximate:true;editable:true};
/** Explicit user-triggered estimate only. Sends no location, training data or other photos. */
export async function estimateFoodPhoto(asset:ImagePickerAsset,portionGrams?:number,signal?:AbortSignal):Promise<FoodPhotoEstimate> {
  if(asset.fileSize && asset.fileSize>5*1024*1024) throw new Error('Choose a photo smaller than 5 MB.');
  if(portionGrams!==undefined && (!Number.isFinite(portionGrams)||portionGrams<1||portionGrams>5000)) throw new Error('Portion grams must be between 1 and 5000.');
  const service=await discoverService(signal);
  if(!service?.aiAvailable) throw new Error('AI photo estimates are not connected. You can enter the meal manually.');
  const form=new FormData();
  if(Platform.OS==='web') {
    const blob=asset.file??await(await fetch(asset.uri,{signal})).blob();
    if(blob.size>5*1024*1024) throw new Error('Choose a photo smaller than 5 MB.');
    form.append('photo',blob,'meal.jpg');
  } else form.append('photo',{uri:asset.uri,name:'meal.jpg',type:asset.mimeType??'image/jpeg'} as any);
  form.append('context',JSON.stringify(portionGrams===undefined?{}:{portionGrams}));
  const abort=signal?null:new AbortController();const timer=abort?setTimeout(()=>abort.abort(),95000):null;
  try{return await requestService<FoodPhotoEstimate>(service,'food',form,signal??abort!.signal);}
  finally{if(timer)clearTimeout(timer);}
}
