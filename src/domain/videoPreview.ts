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

/** Keep source-coordinate callouts inside the visible image without moving joints. */
export function videoPreviewCallout(
  source: Size,
  viewport: Size,
  fit: PreviewFit,
  anchor: { x: number; y: number },
  label: Size & { x: number; y: number },
  margin: number,
): { x: number; y: number } | null {
  const { scale, offsetX, offsetY } = videoPreviewTransform(source, viewport, fit);
  const left = Math.max(0, -offsetX / scale);
  const top = Math.max(0, -offsetY / scale);
  const right = Math.min(source.width, (viewport.width - offsetX) / scale);
  const bottom = Math.min(source.height, (viewport.height - offsetY) / scale);
  // A callout must describe a body region that is actually visible in this crop.
  if (anchor.x < left || anchor.x > right || anchor.y < top || anchor.y > bottom)
    return null;
  // Never shrink the readable label to force it into a very small viewport.
  if (label.width + margin * 2 > right - left || label.height + margin * 2 > bottom - top)
    return null;
  return {
    x: Math.max(left + margin, Math.min(right - label.width - margin, label.x)),
    y: Math.max(top + margin, Math.min(bottom - label.height - margin, label.y)),
  };
}
