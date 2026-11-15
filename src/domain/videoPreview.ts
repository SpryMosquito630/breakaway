export type PreviewFit = "contain" | "cover";
type Size = { width: number; height: number };

/** Centered media transform shared by the video and its source-coordinate overlay. */
export function videoPreviewTransform(source: Size, viewport: Size, fit: PreviewFit) {
  const scale = (fit === "cover" ? Math.max : Math.min)(
    viewport.width / source.width,
    viewport.height / source.height,
  );
  return {
    scale,
    offsetX: (viewport.width - source.width * scale) / 2,
    offsetY: (viewport.height - source.height * scale) / 2,
  };
}

export function videoPreviewSize(
  source: Size,
  availableWidth: number,
  windowHeight: number,
  fit: PreviewFit,
): Size {
  const maxHeight = Math.max(180, Math.min(480, windowHeight * 0.46));
  if (fit === "cover") {
    const width = Math.min(availableWidth, maxHeight * 1.5);
    return { width, height: width / 1.5 };
  }
  const height = Math.min(maxHeight, (availableWidth * source.height) / source.width);
  return { width: (height * source.width) / source.height, height };
}
