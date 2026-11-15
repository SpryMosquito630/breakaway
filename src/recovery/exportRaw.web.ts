import { recoveryExportArtifact, type RecoveryExportResult } from "./exportArtifact";

export async function exportRawRecovery(raw: string): Promise<RecoveryExportResult> {
  const artifact = recoveryExportArtifact(raw);
  const url = URL.createObjectURL(
    new Blob([artifact.content], { type: artifact.mimeType }),
  );
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = artifact.name;
    document.body.appendChild(link);
    link.click();
    return "download-requested";
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
