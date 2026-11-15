import { Platform } from "react-native";
import {
  HOSTED_ANALYSIS_CONFIG,
  HOSTED_ANALYSIS_REQUESTED,
} from "../config/hostedAnalysis";
import { hostedIdentity } from "./hostedIdentity";
import { requestHostedAnalysis } from "./hostedTransport";
import Constants from "expo-constants";
import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { COACH_DEV_ENABLED } from "../config/coach";
import { makeCoachPair, validCoachPair } from "./pairing";
import {
  readCoachPair,
  saveCoachPairIfUnchanged,
  forgetStoredCoachPair,
  coachPairRevision,
  coachPairPersisted,
} from "./pairStore";
import {
  ServiceError,
  readServiceResponse,
  assertCoachRequestIdentity,
  type CoachRequestIdentity,
} from "./serviceResponse";
export { ServiceError } from "./serviceResponse";
export { coachPairRevision } from "./pairStore";
import { connectedClient } from "../connected/client";
import type { ImagePickerAsset } from "expo-image-picker";
import { prepareShotReviewConnection } from "./shotReviewPreparation";
export type ServiceState = {
  base: string;
  token: string;
  hosted?: boolean;
  aiAvailable: boolean;
  chatAvailable?: boolean;
  chatProvider?: "openai" | "gemini";
  chatDevAllowed?: boolean;
  chatPairRequired?: boolean;
  chatMemoryAvailable?: boolean;
  chatPairToken?: string;
  chatPairExpiresAt?: number;
  chatPairPersisted?: boolean;
  chatPairStoreRevision?: number;
  jointViewAvailable: boolean;
  shotReviewAvailable?: boolean;
};
export type Feedback = {
  source: "openai";
  summary: string;
  limitations: string;
  observations: {
    timestampSeconds: number;
    observation: string;
    uncertainty: string;
    drillId: string | null;
  }[];
};
export type Joint = { x: number; y: number; visibility: number };
export type JointResult = {
  durationSeconds: number;
  width: number;
  height: number;
  sampleFps: number;
  fullBodyVisible: boolean;
  visibleFrameFraction: number;
  limitations: string;
  frames: { timestampSeconds: number; joints: (Joint | null)[] }[];
};
function baseURL() {
  if (process.env.EXPO_PUBLIC_ANALYSIS_URL)
    return process.env.EXPO_PUBLIC_ANALYSIS_URL.replace(/\/$/, "");
  if (Platform.OS === "web" && typeof location !== "undefined")
    return `${location.origin}/api/replay`;
  const host = Constants.expoConfig?.hostUri;
  return host
    ? `${/exp\.direct|on\.expo\.app|ngrok/.test(host) ? "https" : "http"}://${host}/api/replay`
    : null;
}
export async function discoverService(
  signal?: AbortSignal,
): Promise<ServiceState | null> {
  const hosted = HOSTED_ANALYSIS_CONFIG;
  if (HOSTED_ANALYSIS_REQUESTED && !hosted) return null;
  const base = hosted?.base ?? baseURL();
  const token = hosted ? "" : process.env.EXPO_PUBLIC_ANALYSIS_TOKEN;
  if (!base || (!hosted && !token)) return null;
  const response = await fetch(`${base}/health`, { signal, redirect: "error" });
  const body = await response.json();
  if (hosted && (body.hosted !== true || body.authentication !== "firebase")) return null;
  return response.ok && body.available
    ? {
        base,
        token: token ?? "",
        hosted: Boolean(hosted),
        aiAvailable: body.aiAvailable === true,
        chatAvailable: body.chatAvailable === true,
        chatProvider: body.chatProvider === "gemini" ? "gemini" : "openai",
        chatDevAllowed: body.chatDevAllowed === true,
        chatPairRequired: body.chatPairRequired === true,
        chatMemoryAvailable: body.chatMemoryAvailable === true,
        jointViewAvailable: body.jointViewAvailable === true,
        shotReviewAvailable: body.shotReviewAvailable === true,
      }
    : null;
}
export async function requestService<T>(
  service: ServiceState,
  path: string,
  body: BodyInit,
  signal: AbortSignal,
  json = false,
  identity?: CoachRequestIdentity,
  hostedRequestId?: string,
): Promise<T> {
  if (service.hosted) {
    if (!["shot-review", "pose"].includes(path) || typeof body !== "object" || !body)
      throw new ServiceError(
        "This feature is unavailable on the analysis connection.",
        "service_unavailable",
      );
    if (!hostedRequestId)
      throw new ServiceError(
        "Retry your video from the analysis screen.",
        "request_id_required",
      );
    return requestHostedAnalysis<T>({
      base: service.base,
      path,
      body,
      signal,
      requestId: hostedRequestId,
      identity: () => hostedIdentity(signal),
      send: (Platform.OS === "web" ? fetch : expoFetch) as typeof fetch,
    });
  }
  const pair =
    path === "chat" && identity?.pairRevision !== undefined
      ? await readCoachPair()
      : null;
  const session =
    ["chat", "coach", "food", "shot-review"].includes(path) && connectedClient
      ? await connectedClient.auth.getSession()
      : null;
  const user = session?.error ? null : session?.data.session;
  const userToken = user?.access_token;
  if (path === "chat" && identity)
    assertCoachRequestIdentity(identity, {
      userId: user?.user.id ?? null,
      pairRevision: coachPairRevision(),
      pair,
      base: service.base,
      pairToken: service.chatPairToken,
    });
  if (signal.aborted) {
    const error = new Error("Request stopped.");
    error.name = "AbortError";
    throw error;
  }
  const send = Platform.OS === "web" ? fetch : expoFetch;
  const response = await send(`${service.base}/${path}`, {
    method: "POST",
    body,
    signal,
    headers: {
      Authorization: `Bearer ${service.token}`,
      ...(userToken ? { "X-User-Token": userToken } : {}),
      ...((path === "chat" || path === "shot-review") &&
      COACH_DEV_ENABLED &&
      service.chatPairToken &&
      (service.chatPairExpiresAt ?? 0) > Date.now()
        ? { "X-Coach-Pair": service.chatPairToken }
        : {}),
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(path === "shot-review" ? { "X-Include-Pose": "1" } : {}),
    },
  });
  return readServiceResponse<T>(response);
}

export const forgetCoachPair = forgetStoredCoachPair;
/** Billable review uses an existing private connection or signed-in account only. */
export async function prepareShotReview(service: ServiceState, signal: AbortSignal) {
  const clean: ServiceState = {
    ...service,
    chatPairToken: undefined,
    chatPairExpiresAt: undefined,
    chatPairPersisted: undefined,
    chatPairStoreRevision: undefined,
  };
  if (service.hosted) {
    if (!service.shotReviewAvailable) return { status: "service_unavailable" } as const;
    await hostedIdentity(signal);
    return { status: "ready", service: clean } as const;
  }
  return prepareShotReviewConnection(
    clean,
    {
      pairingEnabled: COACH_DEV_ENABLED,
      readPair: readCoachPair,
      restorePair: (active, pair) => ({
        ...active,
        chatPairToken: pair.token,
        chatPairExpiresAt: pair.expiresAt,
        chatPairPersisted: coachPairPersisted(),
        chatPairStoreRevision: coachPairRevision(),
      }),
      async signedIn() {
        const session = connectedClient ? await connectedClient.auth.getSession() : null;
        if (session?.error) throw session.error;
        return Boolean(session?.data.session);
      },
    },
    signal,
  );
}
export async function restoreCoachPair(service: ServiceState): Promise<ServiceState> {
  if (!COACH_DEV_ENABLED) return service;
  const pair = await readCoachPair();
  const clean = {
    ...service,
    chatPairToken: undefined,
    chatPairExpiresAt: undefined,
    chatPairPersisted: undefined,
    chatPairStoreRevision: undefined,
  };
  if (!validCoachPair(pair, service.base)) return clean;
  return {
    ...clean,
    chatPairToken: pair.token,
    chatPairExpiresAt: pair.expiresAt,
    chatPairPersisted: coachPairPersisted(),
    chatPairStoreRevision: coachPairRevision(),
  };
}
export async function pairCoachService(
  service: ServiceState,
  code: string,
  signal: AbortSignal,
) {
  if (
    !COACH_DEV_ENABLED ||
    !service.chatDevAllowed ||
    !service.chatPairRequired ||
    !/^\d{8}$/.test(code)
  )
    throw Error("Enter the eight-digit pairing code.");
  const revision = coachPairRevision();
  const value = await requestService<unknown>(
    service,
    "pair",
    JSON.stringify({ code }),
    signal,
    true,
  );
  if (signal.aborted) {
    const error = new Error("Pairing stopped.");
    error.name = "AbortError";
    throw error;
  }
  const pair = makeCoachPair(service.base, value);
  const saved = await saveCoachPairIfUnchanged(pair, revision);
  if (!saved.applied)
    throw new ServiceError(
      "Your private connection changed. Retry your question using the latest connection.",
      "pair_changed",
    );
  return {
    ...service,
    chatPairToken: pair.token,
    chatPairExpiresAt: pair.expiresAt,
    chatPairPersisted: saved.persisted,
    chatPairStoreRevision: revision + 1,
  };
}
export async function clipForm(asset: ImagePickerAsset, context?: unknown) {
  const maxBytes = (HOSTED_ANALYSIS_CONFIG ? 25 : 50) * 1024 * 1024;
  const sizeMessage = `Choose a video smaller than ${HOSTED_ANALYSIS_CONFIG ? 25 : 50} MB.`;
  if (asset.fileSize && asset.fileSize > maxBytes) throw new Error(sizeMessage);
  if (asset.duration && asset.duration > 30050)
    throw new Error("Choose a video up to 30 seconds.");
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
    if (blob.size > maxBytes) throw new Error(sizeMessage);
    form.append("video", blob, "recording.mp4");
  } else {
    // Expo 58 fetch accepts File/Blob parts, not React Native's URI descriptor.
    const file = new File(asset.uri);
    if (file.size > maxBytes) throw new Error(sizeMessage);
    form.append("video", file);
  }
  if (context) form.append("context", JSON.stringify(context));
  return form;
}
export type FoodPhotoEstimate = {
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string[];
  source: "openai";
  approximate: true;
  editable: true;
};
/** Explicit user-triggered estimate only. Sends no location, training data or other photos. */
export async function estimateFoodPhoto(
  asset: ImagePickerAsset,
  portionGrams?: number,
  signal?: AbortSignal,
): Promise<FoodPhotoEstimate> {
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 5 MB.");
  if (
    portionGrams !== undefined &&
    (!Number.isFinite(portionGrams) || portionGrams < 1 || portionGrams > 5000)
  )
    throw new Error("Portion grams must be between 1 and 5000.");
  const service = await discoverService(signal);
  if (!service?.aiAvailable)
    throw new Error(
      "AI photo estimates are not connected. You can enter the meal manually.",
    );
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = asset.file ?? (await (await fetch(asset.uri, { signal })).blob());
    if (blob.size > 5 * 1024 * 1024) throw new Error("Choose a photo smaller than 5 MB.");
    form.append("photo", blob, "meal.jpg");
  } else {
    const file = new File(asset.uri);
    if (file.size > 5 * 1024 * 1024) throw new Error("Choose a photo smaller than 5 MB.");
    form.append("photo", file);
  }
  form.append(
    "context",
    JSON.stringify(portionGrams === undefined ? {} : { portionGrams }),
  );
  const abort = signal ? null : new AbortController();
  const timer = abort ? setTimeout(() => abort.abort(), 95000) : null;
  try {
    return await requestService<FoodPhotoEstimate>(
      service,
      "food",
      form,
      signal ?? abort!.signal,
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}
