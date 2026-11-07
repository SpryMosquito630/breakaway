import { Platform } from "react-native";
import { PRACTICE_NOTIFICATION_ID, createPracticeNotifier } from "./practiceSchedule";

const CHANNEL = "practice-blocks";
const supported = Platform.OS === "ios" || Platform.OS === "android";
type Notifications = typeof import("expo-notifications");
let nativePromise: Promise<Notifications> | undefined;
const native = () => (nativePromise ??= import("expo-notifications"));
function permitted(p: Awaited<ReturnType<Notifications["getPermissionsAsync"]>>, n: Notifications) {
  return p.granted || p.ios?.status === n.IosAuthorizationStatus.PROVISIONAL;
}
async function channel(n: Notifications) {
  if (Platform.OS === "android") await n.setNotificationChannelAsync(CHANNEL, {
    name: "Practice block complete", importance: n.AndroidImportance.DEFAULT, sound: "default",
  });
}
export async function backgroundPracticeAllowed() {
  if (!supported) return false;
  const n = await native();
  return permitted(await n.getPermissionsAsync(), n);
}
/** Only invoked by the explicit setup toggle. Startup never requests permission. */
export async function allowBackgroundPractice(): Promise<boolean> {
  if (!supported) return false;
  const n = await native();
  await channel(n);
  let permission = await n.getPermissionsAsync();
  if (!permitted(permission, n) && permission.canAskAgain)
    permission = await n.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return permitted(permission, n);
}
let failureListener: (() => void) | undefined;
export function onPracticeNotificationFailure(listener: () => void) {
  failureListener = listener;
  return () => { if (failureListener === listener) failureListener = undefined; };
}
export const practiceNotifications = createPracticeNotifier({
  async cancel() {
    if (supported) await (await native()).cancelScheduledNotificationAsync(PRACTICE_NOTIFICATION_ID);
  },
  async schedule(deadline) {
    if (!supported) return;
    const n = await native();
    if (!permitted(await n.getPermissionsAsync(), n)) throw Error("Notifications unavailable");
    await channel(n);
    await n.scheduleNotificationAsync({
      identifier: PRACTICE_NOTIFICATION_ID,
      content: { title: "Drill complete", body: "Your practice block is complete. Open Breakaway when you’re ready for the next drill.", sound: "default" },
      trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(deadline), channelId: CHANNEL },
    });
  },
}, Date.now, () => failureListener?.());
