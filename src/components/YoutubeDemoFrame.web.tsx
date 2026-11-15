import { createElement, useEffect, useMemo, useRef } from "react";
import { youtubeDemoDocument } from "../domain/drillVideo";
import type { YoutubeDemoFrameProps } from "./YoutubeDemoFrame.types";

export function YoutubeDemoFrame({ demo, onError, onReady }: YoutubeDemoFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => youtubeDemoDocument(demo, window.location.origin), [demo]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || typeof event.data !== "string")
        return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === "error") onError();
        if (message.type === "ready") onReady();
      } catch {
        /* Unrelated provider messages are ignored. */
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onError, onReady]);
  return createElement("iframe", {
    ref: frame,
    title: demo.title,
    srcDoc: html,
    allow: "fullscreen; encrypted-media; picture-in-picture",
    allowFullScreen: true,
    referrerPolicy: "strict-origin-when-cross-origin",
    style: { width: "100%", height: "100%", border: 0, background: "#101812" },
  });
}
