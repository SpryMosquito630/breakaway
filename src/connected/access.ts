import { DEVELOPER_FEATURES } from "../config/features";
export type ConnectedAgeBand = "under13" | "13to17" | "adult" | undefined;
let ageBand: ConnectedAgeBand;
// Shell supplies the current local age answer. Unknown and under-13 fail closed.
export function setConnectedAgeBand(value: ConnectedAgeBand) {
  ageBand = value;
}
export function canUseConnectedFeatures(
  value: ConnectedAgeBand,
  developerFeatures: boolean,
) {
  return developerFeatures && (value === "13to17" || value === "adult");
}
export function connectedAccessAllowed() {
  return canUseConnectedFeatures(ageBand, DEVELOPER_FEATURES);
}
export function assertConnectedAccess() {
  if (!DEVELOPER_FEATURES) throw Error("Online features are disabled in this build.");
  if (!connectedAccessAllowed())
    throw Error(
      "Accounts and community require an age answer of 13 or older during onboarding.",
    );
}
