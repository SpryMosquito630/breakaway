import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowUp,
  ChevronRight,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../state/AppState";
import { COACH_DEV_ENABLED, COACH_REMOTE_ENABLED } from "../config/coach";
import { connectedClient } from "../connected/client";
import {
  discoverService,
  requestService,
  restoreCoachPair,
  pairCoachService,
  forgetCoachPair,
  ServiceError,
  type ServiceState,
} from "../coachAi/service";
import {
  coachContext,
  offlineCoach,
  remoteCoachAllowed,
  validateCoachReply,
  type CoachReply,
} from "../coachAi/recommendations";
import { haptic } from "../utils/haptics";
import { Button } from "../components/ui";
import { CoachSendFlow } from "../coachAi/sendFlow";

type CoachService = ServiceState & { coachIdentity?: string };
function consentKey(service: CoachService) {
  return `${service.base}|${service.chatProvider}|${service.coachIdentity ?? service.chatPairToken ?? ""}`;
}

type Turn = CoachReply & { question: string; id: number };
const starters = ["Today’s practice", "Weaker foot", "Passing"];
export function Coach({ navigation }: { navigation: any }) {
  const { C, s } = useTheme();
  const { data, catalog } = useApp();
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [mode, setMode] = useState<"auto" | "offline" | "ai">(
    COACH_REMOTE_ENABLED ? "auto" : "offline",
  );
  const [service, setService] = useState<CoachService | null>(null);
  const [connection, setConnection] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [disclosure, setDisclosure] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const flow = useRef(new CoachSendFlow());
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const nextId = useRef(0);
  const allowed = remoteCoachAllowed(data.profile.ageBand, COACH_REMOTE_ENABLED);
  const remoteAllowed = useRef(allowed);
  remoteAllowed.current = allowed;
  const mounted = useRef(true);
  const provider = service?.chatProvider === "gemini" ? "Google Gemini" : "OpenAI";
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!allowed) {
      request.current?.abort();
      setMode("offline");
      setService(null);
      flow.current.reset();
      setDisclosure(false);
      setPairing(false);
      setPairCode("");
      void forgetCoachPair();
    }
  }, [allowed]);
  function answerOffline(text: string) {
    setTurns((previous) => [
      ...previous.slice(-19),
      { ...offlineCoach(text, data, catalog), question: text, id: ++nextId.current },
    ]);
    setMessage("");
  }
  function chooseOffline() {
    const question = flow.current.question;
    flow.current.cancel();
    setMode("offline");
    setDisclosure(false);
    setPairing(false);
    setPairCode("");
    setConnection("");
    setError("");
    if (question) answerOffline(question);
  }
  async function continueQuestion(active: CoachService) {
    if (!mounted.current || !remoteAllowed.current || !flow.current.question) return;
    const next = flow.current.next({
      enabled: COACH_REMOTE_ENABLED,
      connected: active.chatAvailable,
      pairRequired: active.chatPairRequired,
      paired: Boolean(active.chatPairToken),
      consentKey: consentKey(active),
    });
    if (next === "pair") {
      setPairCode("");
      setPairing(true);
    } else if (next === "consent") setDisclosure(true);
    else if (next === "send") {
      const question = flow.current.take(consentKey(active));
      if (question) await sendAI(question, active);
    }
  }
  async function checkConnection() {
    if (!allowed || checking || busy || !flow.current.question) return;
    const controller = new AbortController();
    request.current = controller;
    setChecking(true);
    setConnection("");
    setError("");
    setPairing(false);
    setDisclosure(false);
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const discovered = await discoverService(controller.signal);
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) return;
      setService(discovered);
      if (!discovered?.chatAvailable) {
        flow.current.cancel();
        setConnection(
          "AI is unavailable. Your question is still here. Try again or use the offline guide.",
        );
        return;
      }
      const session = await connectedClient?.auth.getSession();
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) return;
      if (
        (!session?.data.session || session.error) &&
        !(COACH_DEV_ENABLED && discovered.chatDevAllowed)
      ) {
        flow.current.cancel();
        setConnection(
          "AI is not available in this build yet. Your question is still here, or you can use the offline guide.",
        );
        return;
      }
      let active: CoachService = {
        ...discovered,
        coachIdentity: session?.data.session?.user.id,
      };
      if (COACH_DEV_ENABLED && discovered.chatDevAllowed && discovered.chatPairRequired)
        active = {
          ...(await restoreCoachPair(active)),
          coachIdentity: active.coachIdentity,
        };
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) return;
      setService(active);
      clearTimeout(timer);
      await continueQuestion(active);
    } catch {
      flow.current.cancel();
      if (mounted.current && remoteAllowed.current)
        setConnection(
          "Could not reach AI. Your question is still here. Try again or use the offline guide.",
        );
    } finally {
      clearTimeout(timer);
      if (mounted.current) setChecking(false);
    }
  }
  async function pairDevice() {
    if (
      !allowed ||
      !COACH_DEV_ENABLED ||
      !service?.chatDevAllowed ||
      !service.chatPairRequired ||
      checking ||
      busy ||
      !/^\d{8}$/.test(pairCode)
    )
      return;
    const controller = new AbortController();
    request.current = controller;
    setChecking(true);
    setConnection("");
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const paired = await pairCoachService(service, pairCode, controller.signal);
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) {
        await forgetCoachPair();
        return;
      }
      setService(paired);
      setPairCode("");
      setPairing(false);
      clearTimeout(timer);
      if (flow.current.question) await continueQuestion(paired);
      else setConnection("Phone paired. Send your question when you’re ready.");
      haptic("success");
    } catch (e) {
      if (mounted.current && remoteAllowed.current) {
        setPairCode("");
        setConnection(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "Pairing timed out. Your question is still here. Try again.",
        );
      }
    } finally {
      clearTimeout(timer);
      if (mounted.current) setChecking(false);
    }
  }
  async function send(question = message) {
    const text = question.trim();
    if (!text || busy || checking || disclosure || pairing) return;
    haptic("light");
    setError("");
    setConnection("");
    if (mode === "offline" || !COACH_REMOTE_ENABLED) {
      answerOffline(text);
      return;
    }
    setMessage(text);
    flow.current.queue(text);
    await checkConnection();
  }
  async function sendAI(text: string, active: CoachService) {
    if (!allowed || !active.chatAvailable) return;
    const controller = new AbortController();
    request.current = controller;
    setMode("ai");
    setBusy(true);
    const timer = setTimeout(() => controller.abort(), 70000);
    try {
      const session = await connectedClient?.auth.getSession();
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) return;
      if (
        (!session?.data.session || session.error) &&
        !(COACH_DEV_ENABLED && active.chatDevAllowed)
      )
        throw Error(
          "AI is unavailable for this session. Your question is still here; you can use the offline guide.",
        );
      const identity = session?.data.session?.user.id;
      if (identity !== active.coachIdentity) {
        flow.current.reset();
        throw Error(
          "Your account changed. Send again to review sharing before using AI.",
        );
      }
      const context = coachContext(data, catalog);
      const value = await requestService<unknown>(
        active,
        "chat",
        JSON.stringify({ message: text, context }),
        controller.signal,
        true,
      );
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) return;
      const reply = validateCoachReply(
        value,
        context.allowedDrillIds,
        active.chatProvider,
      );
      setTurns((previous) => [
        ...previous.slice(-19),
        { ...reply, question: text, id: ++nextId.current },
      ]);
      setMessage("");
    } catch (e) {
      flow.current.cancel();
      if (e instanceof ServiceError && e.code === "pair_required") {
        await forgetCoachPair();
        if (mounted.current && remoteAllowed.current) {
          // The server rejected this before a provider call. Resume only this
          // explicit question after the owner repairs the development pairing.
          flow.current.queue(text);
          setMode("auto");
          setDisclosure(false);
          setPairing(true);
          setPairCode("");
          setService({
            ...active,
            chatPairRequired: true,
            chatPairToken: undefined,
            chatPairExpiresAt: undefined,
          });
        }
      }
      if (mounted.current && remoteAllowed.current)
        setError(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "AI took too long. Your question is still here. Try again or choose the offline guide.",
        );
    } finally {
      clearTimeout(timer);
      if (mounted.current) setBusy(false);
    }
  }
  function drillCards(ids: string[]) {
    return ids.map((id) => {
      const drill = catalog.find((d) => d.id === id);
      if (!drill) return null;
      return (
        <Pressable
          key={id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${drill.name} drill and practice timer`}
          onPress={() => {
            haptic("selection");
            navigation.navigate("Detail", { id });
          }}
          style={({ pressed }) => [
            styles.drill,
            {
              backgroundColor: pressed ? C.pitchSoft : C.white,
              borderColor: C.lineStrong,
            },
          ]}
        >
          <View style={styles.grow}>
            <Text style={s.h3}>{drill.name}</Text>
            <Text style={s.small}>
              {drill.skill} · {drill.gear.length ? drill.gear.join(" + ") : "Ball only"}
            </Text>
            <Text style={s.small}>{drill.cue}</Text>
          </View>
          <ChevronRight size={20} color={C.green} />
        </Pressable>
      );
    });
  }
  const paused = busy || checking || disclosure || pairing;
  return (
    <KeyboardAvoidingView
      style={[styles.page, { backgroundColor: C.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        onContentSizeChange={() => {
          if (turns.length) scroll.current?.scrollToEnd({ animated: false });
        }}
      >
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: C.lime }]}>
            <MessageCircle size={27} color={C.onLime} strokeWidth={1.8} />
          </View>
          <View style={styles.grow}>
            <Text style={s.h2}>Your training corner</Text>
            <Text style={s.small}>
              {mode === "offline"
                ? "Offline guide · no AI"
                : mode === "ai"
                  ? `AI coach · ${provider}`
                  : "Coach · football training"}
            </Text>
          </View>
        </View>
        <Text style={s.body}>
          {mode === "offline"
            ? "Pick a focus. Find a drill. Get moving."
            : "Ask a football training question. AI guidance can make mistakes."}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit your training setup"
          onPress={() => navigation.navigate("Preferences")}
          style={styles.setup}
        >
          <SlidersHorizontal size={18} color={C.green} />
          <Text style={[s.small, styles.grow]}>
            {data.profile.position ?? "Still exploring"} · {data.profile.space} ·{" "}
            {data.profile.gear.length ? data.profile.gear.join(" + ") : "Ball only"}
          </Text>
          <ChevronRight size={16} color={C.muted} />
        </Pressable>
        {turns.length === 0 ? (
          <View style={styles.starters}>
            {starters.map((text) => (
              <Pressable
                key={text}
                accessibilityRole="button"
                disabled={paused}
                onPress={() => void send(text)}
                style={({ pressed }) => [
                  styles.starter,
                  {
                    backgroundColor: pressed ? C.pitchSoft : C.soft,
                    borderColor: C.lineStrong,
                  },
                ]}
              >
                <Text style={s.small}>{text}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          turns.map((turn) => (
            <View key={turn.id} style={styles.turn}>
              <View style={[styles.question, { backgroundColor: C.pitchSoft }]}>
                <Text selectable style={s.body}>
                  {turn.question}
                </Text>
              </View>
              <Text style={[s.small, { color: C.green }]}>
                {turn.source === "offline"
                  ? "Offline · fixed rules"
                  : `AI coach · ${turn.source === "gemini" ? "Google Gemini" : "OpenAI"}`}
              </Text>
              <Text selectable style={s.body}>
                {turn.reply}
              </Text>
              {drillCards(turn.drillIds)}
            </View>
          ))
        )}
        {COACH_REMOTE_ENABLED && !paused ? (
          <Button
            label={mode === "offline" ? "Use AI coach" : "Use offline guide"}
            kind="secondary"
            onPress={() => (mode === "offline" ? setMode("auto") : chooseOffline())}
          />
        ) : null}
        {pairing && allowed && COACH_DEV_ENABLED ? (
          <View style={[styles.consent, { backgroundColor: C.soft }]}>
            <Text style={s.h3}>Pair this development test</Text>
            <Text style={s.small}>
              This private preview needs the one-time code provided with your Expo link.
              Released apps will not use this test code.
            </Text>
            <TextInput
              accessibilityLabel="Coach pairing code"
              value={pairCode}
              onChangeText={(value) => setPairCode(value.replace(/\D/g, "").slice(0, 8))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              autoCorrect={false}
              autoCapitalize="none"
              placeholder="8-digit code"
              placeholderTextColor={C.muted}
              editable={!checking && !busy}
              style={[
                s.body,
                styles.pairInput,
                { color: C.ink, borderColor: C.lineStrong, backgroundColor: C.bg },
              ]}
            />
            <Button
              label={checking ? "Pairing…" : "Pair phone"}
              onPress={() => void pairDevice()}
              disabled={checking || busy || pairCode.length !== 8}
              kind="lime"
            />
            <Button
              label="Keep offline guide"
              onPress={chooseOffline}
              kind="secondary"
              disabled={checking || busy}
            />
          </View>
        ) : null}
        {connection ? (
          <Text accessibilityLiveRegion="polite" style={s.small}>
            {connection}
          </Text>
        ) : null}
        {disclosure && allowed ? (
          <View style={[styles.consent, { backgroundColor: C.soft }]}>
            <Text style={s.h3}>Before you use AI</Text>
            <Text style={s.body}>
              {provider} receives your question and training preferences to generate a
              reply. This chat does not send videos, measurements or practice history.
            </Text>
            <Button
              label="Send question"
              kind="lime"
              onPress={() => {
                if (!service || !flow.current.question) return;
                flow.current.approve(consentKey(service));
                setDisclosure(false);
                const question = flow.current.take(consentKey(service));
                if (question) void sendAI(question, service);
              }}
            />
            <Button label="Keep offline guide" kind="secondary" onPress={chooseOffline} />
          </View>
        ) : null}
        {checking ? (
          <Text accessibilityLiveRegion="polite" style={s.small}>
            Preparing your question…
          </Text>
        ) : null}
        {busy ? (
          <View style={styles.notice}>
            <ActivityIndicator color={C.green} />
            <Text accessibilityLiveRegion="polite" style={s.body}>
              Asking AI…
            </Text>
          </View>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={[s.body, { color: C.danger }]}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <View style={[styles.composer, { backgroundColor: C.bg, borderColor: C.line }]}>
        <TextInput
          accessibilityLabel={
            mode === "offline"
              ? "Question for offline training guide"
              : "Message to coach"
          }
          value={message}
          onChangeText={setMessage}
          maxLength={1500}
          multiline
          placeholder="What do you want to work on?"
          placeholderTextColor={C.muted}
          editable={!paused}
          style={[
            s.body,
            styles.input,
            { backgroundColor: C.soft, color: C.ink, borderColor: C.lineStrong },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mode === "offline" ? "Ask offline guide" : "Send question"}
          accessibilityState={{ disabled: !message.trim() || paused }}
          disabled={!message.trim() || paused}
          onPress={() => void send()}
          style={({ pressed }) => [
            styles.send,
            {
              backgroundColor: C.lime,
              opacity: !message.trim() || paused ? 0.45 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <ArrowUp size={23} color={C.onLime} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {
    padding: 20,
    gap: 16,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 24,
  },
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  grow: { flex: 1, gap: 4 },
  setup: { flexDirection: "row", gap: 10, alignItems: "center", minHeight: 48 },
  starters: { gap: 8, flexDirection: "row", flexWrap: "wrap" },
  starter: {
    padding: 12,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  drill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  turn: { gap: 12 },
  question: { padding: 14, borderRadius: 16, marginLeft: 28 },
  notice: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  consent: { padding: 16, gap: 12, borderRadius: 16 },
  pairInput: { minHeight: 52, padding: 14, borderWidth: 1, borderRadius: 12 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 128,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  send: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
});
