/** Metro resolves bundled assets to numeric IDs natively and URL strings/objects on web. */
export type BundledMediaAsset =
  number | string | { uri: string; width?: number; height?: number; scale?: number };

export function validBundledMediaAsset(value: unknown): value is BundledMediaAsset {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0;
  const uri =
    typeof value === "string"
      ? value
      : value && typeof value === "object" && "uri" in value
        ? value.uri
        : undefined;
  return (
    typeof uri === "string" &&
    uri.trim().length > 0 &&
    !/^(javascript|data|vbscript):/i.test(uri)
  );
}

export type DirectDemoMetadata = {
  poster: BundledMediaAsset;
  title: string;
  credit: string;
  page: string;
  cue: string;
  description: string;
  limit: string;
  license: { name: string; url: string; changes: string };
  rightsReviewedOn: string;
};
export type BundledDrillDemo = DirectDemoMetadata & {
  kind: "local";
  source: BundledMediaAsset;
};
export type RemoteDrillDemo = DirectDemoMetadata & {
  kind: "remote";
  /** A rights-cleared direct MP4 URL, never a scraped standard-copyright stream. */
  source: { uri: string; contentType: "progressive" };
};
export type DirectDrillDemo = BundledDrillDemo | RemoteDrillDemo;

export function validDirectDrillDemo(demo: DirectDrillDemo): boolean {
  if (
    !demo.title ||
    !demo.credit ||
    !demo.description ||
    !demo.limit ||
    !/^https:\/\//.test(demo.page) ||
    !demo.license.name ||
    !/^https:\/\//.test(demo.license.url) ||
    !demo.license.changes ||
    !/^\d{4}-\d{2}-\d{2}$/.test(demo.rightsReviewedOn) ||
    !validBundledMediaAsset(demo.poster)
  )
    return false;
  if (demo.kind === "local") return validBundledMediaAsset(demo.source);
  try {
    const source = new URL(demo.source.uri);
    return (
      source.protocol === "https:" &&
      source.pathname.toLowerCase().endsWith(".mp4") &&
      demo.source.contentType === "progressive"
    );
  } catch {
    return false;
  }
}
