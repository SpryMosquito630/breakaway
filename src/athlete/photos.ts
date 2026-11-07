import { Directory, File, Paths } from "expo-file-system";
const root = () => new Directory(Paths.document, "breakaway-meals");
export async function savePhoto(id: string, uri: string) {
  root().create({ intermediates: true, idempotent: true });
  const file = new File(uri);
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 10 MB.");
  const target = new File(root(), `${id}.jpg`);
  try {
    file.copy(target);
  } catch (error) {
    if (target.exists) target.delete();
    throw error;
  }
}
export async function openPhoto(id: string) {
  const file = new File(root(), `${id}.jpg`);
  if (!file.exists) throw new Error("Photo is no longer available.");
  return file.uri;
}
export async function removePhoto(id: string) {
  const file = new File(root(), `${id}.jpg`);
  if (file.exists) file.delete();
}
export async function clearPhotos() {
  if (root().exists) root().delete();
}
export function releasePhoto(_uri: string) {}
