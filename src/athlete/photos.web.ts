async function operation<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("breakaway-meals", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("photos");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(new Error("Allow browser storage to save photos."));
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", mode);
    const r = fn(tx.objectStore("photos"));
    tx.oncomplete = () => {
      db.close();
      resolve(r.result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(new Error("Could not save the photo. Check device storage."));
    };
  });
}
export async function savePhoto(id: string, uri: string) {
  const blob = await (await fetch(uri)).blob();
  if (blob.size > 10 * 1024 * 1024) throw new Error("Choose a photo smaller than 10 MB.");
  await operation("readwrite", (s) => s.put(blob, id));
}
export async function openPhoto(id: string) {
  const blob = await operation<Blob>("readonly", (s) => s.get(id));
  if (!(blob instanceof Blob)) throw new Error("Photo is no longer available.");
  return URL.createObjectURL(blob);
}
export async function removePhoto(id: string) {
  await operation("readwrite", (s) => s.delete(id));
}
export async function clearPhotos() {
  await operation("readwrite", (s) => s.clear());
}
export function releasePhoto(uri: string) {
  URL.revokeObjectURL(uri);
}
