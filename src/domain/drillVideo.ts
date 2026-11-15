import type { AgeBand } from "./model";

export type YoutubeDrillDemo = {
  kind: "youtube";
  videoId: string;
  startSeconds: number;
  endSeconds: number;
  title: string;
  credit: string;
  page: string;
  cue: string;
  description: string;
  limit: string;
  review: { status: "core"; embeddable: true; verifiedOn: string; evidence: string };
  madeForKids: boolean | "unknown";
};

export function validYoutubeDemo(demo: YoutubeDrillDemo): boolean {
  return (
    demo.review.status === "core" &&
    demo.review.embeddable === true &&
    /^[a-zA-Z0-9_-]{11}$/.test(demo.videoId) &&
    Number.isFinite(demo.startSeconds) &&
    Number.isFinite(demo.endSeconds) &&
    demo.startSeconds >= 0 &&
    demo.endSeconds > demo.startSeconds &&
    demo.endSeconds - demo.startSeconds <= 120 &&
    demo.page === `https://www.youtube.com/watch?v=${demo.videoId}` &&
    Boolean(demo.review.verifiedOn && demo.review.evidence)
  );
}

// An unknown age or unknown provider child-directed status never creates an embed.
export function canEmbedYoutubeDemo(demo: YoutubeDrillDemo, ageBand?: AgeBand): boolean {
  return (
    validYoutubeDemo(demo) &&
    (ageBand === "13to17" || ageBand === "adult") &&
    demo.madeForKids === false
  );
}

/** Only public clip coordinates enter the document; no player profile or recordings. */
export function youtubeDemoDocument(demo: YoutubeDrillDemo, origin: string): string {
  if (!validYoutubeDemo(demo) || !/^https?:\/\/[a-zA-Z0-9.:-]+$/.test(origin))
    throw Error("Invalid demo configuration");
  const config = JSON.stringify({
    videoId: demo.videoId,
    start: demo.startSeconds,
    end: demo.endSeconds,
    origin,
  });
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body,#player{margin:0;width:100%;height:100%;background:#101812}body{overflow:hidden}</style></head><body><div id="player"></div><script>
  var config=${config},player,playing=false;
  function report(type){var message=JSON.stringify({type:type});if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(message);}else{window.parent.postMessage(message,'*');}}
  function stop(){playing=false;if(player&&player.pauseVideo)player.pauseVideo();}
  function reset(){if(player&&playing){player.loadVideoById({videoId:config.videoId,startSeconds:config.start,endSeconds:config.end});}}
  function onYouTubeIframeAPIReady(){player=new YT.Player('player',{host:'https://www.youtube-nocookie.com',videoId:config.videoId,width:'100%',height:'100%',playerVars:{autoplay:0,controls:1,playsinline:1,start:config.start,end:config.end,origin:config.origin},events:{onReady:function(){report('ready');},onStateChange:function(event){if(event.data===YT.PlayerState.PLAYING){playing=true;}else if(event.data===YT.PlayerState.ENDED){reset();}else if(event.data===YT.PlayerState.PAUSED){playing=false;}},onError:function(){stop();report('error');}}});}
  document.addEventListener('visibilitychange',function(){if(document.hidden)stop();});window.addEventListener('pagehide',function(){stop();});
  var tag=document.createElement('script');tag.src='https://www.youtube.com/iframe_api';tag.onerror=function(){report('error');};document.body.appendChild(tag);
  </script></body></html>`;
}
