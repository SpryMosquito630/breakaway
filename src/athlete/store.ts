import { createLocalStore } from "../features/localStore";
import { emptyAthlete, restoreAthlete } from "./domain";
export const athleteStore = createLocalStore({
  key: "breakaway-athlete-v1",
  initial: emptyAthlete,
  restore: restoreAthlete,
});
