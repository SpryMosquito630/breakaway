/** Invalid JSON remains valid export content. No parsing, trimming or BOM. */
export function recoveryExportArtifact(raw: string, timestamp = Date.now()) {
  return {
    name: `breakaway-raw-recovery-${timestamp}.txt`,
    content: raw,
    mimeType: "text/plain;charset=utf-8",
  };
}
export type RecoveryExportResult = "download-requested" | "share-sheet-closed";
