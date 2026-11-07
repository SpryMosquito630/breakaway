import { useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createLocalStoreCore, type LocalStoreOptions } from "./localStoreCore";
import { registerFeatureReset } from "./resetRegistry";
export { registerFeatureReset, resetFeatureStores } from "./resetRegistry";

export function createLocalStore<T>(options: LocalStoreOptions<T>) {
  const store = createLocalStoreCore(options, AsyncStorage);
  registerFeatureReset(options.key, store.reset);
  return {
    ...store,
    useStore() {
      const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
      useEffect(() => { void store.load(); }, []);
      return { ...snapshot, update: store.update, retry: store.retry };
    },
  };
}
