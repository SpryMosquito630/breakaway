import { createLocalStore } from "../features/localStore";
import { restoreSeasonPreferences, type SeasonPreferences } from "./preferences";
export const seasonPreferences = createLocalStore<SeasonPreferences>({
  key: "breakaway-progression-v1",
  initial: () => ({ goals: {} }),
  restore: restoreSeasonPreferences,
});
