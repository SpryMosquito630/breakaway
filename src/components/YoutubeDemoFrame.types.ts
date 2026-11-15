import type { YoutubeDrillDemo } from "../domain/drillVideo";
export type YoutubeDemoFrameProps = {
  demo: YoutubeDrillDemo;
  onError: () => void;
  onReady: () => void;
};
