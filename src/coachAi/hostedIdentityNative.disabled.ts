import type { HostedIdentity } from "./hostedIdentityCore";

export async function getHostedIdentity(): Promise<HostedIdentity> {
  throw new Error("Hosted analysis is not connected in this build.");
}
