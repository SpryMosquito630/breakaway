import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { recoveryExportArtifact, type RecoveryExportResult } from "./exportArtifact";

export async function exportRawRecovery(raw: string): Promise<RecoveryExportResult> {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      "Sharing is unavailable on this device. Your saved data is unchanged.",
    );
  const artifact = recoveryExportArtifact(raw);
  const file = new File(Paths.cache, artifact.name);
  try {
    file.create();
    file.write(artifact.content);
    await Sharing.shareAsync(file.uri, {
      mimeType: "text/plain",
      UTI: "public.plain-text",
    });
    // The native share API does not distinguish saving from dismissal/cancellation.
    return "share-sheet-closed";
  } finally {
    try {
      file.delete();
    } catch {
      /* A temporary export must not change recovery state. */
    }
  }
}
