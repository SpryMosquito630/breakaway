import { registerFeatureReset } from "../features/localStore";
import { clearPhotos } from "./photos";
let epoch = 0;
export const athleteEpoch = () => epoch;
registerFeatureReset("athlete-media", async () => {
  epoch++;
  await clearPhotos();
});
