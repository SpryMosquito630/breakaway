import { ServiceError, readServiceResponse } from "./serviceResponse";
import type { HostedIdentity } from "./hostedIdentityCore";

export async function requestHostedAnalysis<T>(options: {
  base: string;
  path: string;
  body: BodyInit;
  signal: AbortSignal;
  requestId: string;
  identity: () => Promise<HostedIdentity>;
  send: typeof fetch;
}) {
  if (!["shot-review", "pose"].includes(options.path))
    throw new ServiceError(
      "This feature is unavailable on the analysis connection.",
      "service_unavailable",
    );
  const identity = await options.identity();
  if (options.signal.aborted)
    throw Object.assign(new Error("Request stopped."), { name: "AbortError" });
  const response = await options.send(`${options.base}/${options.path}`, {
    method: "POST",
    body: options.body,
    signal: options.signal,
    // Never forward the local public token, developer pairing or Supabase session.
    redirect: "error",
    headers: {
      Authorization: `Bearer ${identity.idToken}`,
      "X-Firebase-AppCheck": identity.appCheckToken,
      "X-Request-ID": options.requestId,
      ...(options.path === "shot-review" ? { "X-Include-Pose": "1" } : {}),
    },
  });
  return readServiceResponse<T>(response);
}
