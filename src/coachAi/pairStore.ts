import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createCoachPairStore } from "./pairStoreCore";

const PAIR_KEY = "breakaway.coach.dev-pair";
const store = createCoachPairStore({
  async read() {
    return Platform.OS === "web"
      ? typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem(PAIR_KEY)
        : null
      : SecureStore.getItemAsync(PAIR_KEY);
  },
  async write(value) {
    if (Platform.OS === "web") {
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(PAIR_KEY, value);
    } else
      await SecureStore.setItemAsync(PAIR_KEY, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
  },
  async remove() {
    if (Platform.OS === "web") {
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(PAIR_KEY);
    } else await SecureStore.deleteItemAsync(PAIR_KEY);
  },
});
export const readCoachPair = store.read;
export const saveCoachPair = store.save;
export const forgetStoredCoachPair = store.forget;
