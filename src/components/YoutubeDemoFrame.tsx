import { useEffect, useMemo } from "react";
import { WebView } from "react-native-webview";
import { applicationId } from "expo-application";
import { youtubeDemoDocument } from "../domain/drillVideo";
import type { YoutubeDemoFrameProps } from "./YoutubeDemoFrame.types";

/** Local wrapper preserves the official provider UI and genuine installed app identity. */
export function YoutubeDemoFrame({ demo, onError, onReady }: YoutubeDemoFrameProps) {
  const origin = applicationId ? `https://${applicationId.toLowerCase()}` : null;
  const html = useMemo(
    () => (origin ? youtubeDemoDocument(demo, origin) : null),
    [demo, origin],
  );
  useEffect(() => {
    if (!origin) onError();
  }, [origin, onError]);
  if (!origin || !html) return null;
  return (
    <WebView
      source={{ html, baseUrl: `${origin}/` }}
      style={{ flex: 1, backgroundColor: "#101812" }}
      originWhitelist={["https://*", "about:*"]}
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction
      sharedCookiesEnabled={false}
      thirdPartyCookiesEnabled={false}
      onError={onError}
      onHttpError={onError}
      onMessage={(event) => {
        try {
          const message = JSON.parse(event.nativeEvent.data);
          if (message.type === "error") onError();
          if (message.type === "ready") onReady();
        } catch {
          /* Unrelated provider messages are ignored. */
        }
      }}
      accessibilityLabel={demo.title}
    />
  );
}
