import { createReplayRepository, ReplayDriver } from "./repository";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("breakaway-replays", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("clips", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error("Browser storage is unavailable. Allow site storage and try again."),
      );
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("clips", mode);
    const request = operation(tx.objectStore("clips"));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        new Error(
          "Could not save replay storage. Free device space or allow site storage, then try again.",
        ),
      );
    };
  });
}
const driver: ReplayDriver = {
  async list() {
    return (await transaction<any[]>("readonly", (store) => store.getAll())).map(
      (row) => row.record,
    );
  },
  async size(input) {
    return (input.file ?? (await (await fetch(input.uri)).blob())).size;
  },
  async put(record, input) {
    const video = input.file ?? (await (await fetch(input.uri)).blob());
    await transaction("readwrite", (store) =>
      store.put({ id: record.id, record, video }),
    );
  },
  async open(id) {
    const row = await transaction<any>("readonly", (store) => store.get(id));
    if (!(row?.video instanceof Blob))
      throw new Error(
        "The saved video is missing. Delete this entry and import the original again.",
      );
    return URL.createObjectURL(row.video);
  },
  release(uri) {
    if (uri.startsWith("blob:")) URL.revokeObjectURL(uri);
  },
  async remove(id) {
    await transaction("readwrite", (store) => store.delete(id));
  },
  async clear() {
    await transaction("readwrite", (store) => store.clear());
  },
};
export const replays = createReplayRepository(driver);
