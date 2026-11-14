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
import { COACH_REMOTE_ENABLED } from "../config/coach";
import { connectedClient } from "../connected/client";
import { discoverService, requestService, type ServiceState } from "../coachAi/service";
import {
  coachContext,
  coachDrills,
  offlineCoach,
  remoteCoachAllowed,
  validateCoachReply,
  type CoachReply,
} from "../coachAi/recommendations";
import { haptic } from "../utils/haptics";
import { Button, Disclosure } from "../components/ui";

type Turn = CoachReply & { question: string; id: number };
const starters = ["Today’s practice", "Weaker foot", "Passing"];
export function Coach({ navigation }: { navigation: any }) {
  const { C, s } = useTheme();
  const { data, catalog } = useApp();
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [mode, setMode] = useState<"offline" | "openai">("offline");
  const [service, setService] = useState<ServiceState | null>(null);
  const [connection, setConnection] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [disclosure, setDisclosure] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const nextId = useRef(0);
  const allowed = remoteCoachAllowed(data.profile.ageBand, COACH_REMOTE_ENABLED);
  const remoteAllowed = useRef(allowed);
  remoteAllowed.current = allowed;
  const recommendations = coachDrills("", data, catalog);
  const mounted = useRef(true);
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
      setDisclosure(false);
    }
  }, [allowed]);
  async function checkConnection() {
    if (!allowed || checking || busy) return;
    const controller = new AbortController();
    request.current = controller;
    setChecking(true);
    setConnection("");
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const session = await connectedClient?.auth.getSession();
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) return;
      if (!session?.data.session || session.error) {
        setConnection(
          "AI needs a signed-in account. Account setup is not available in this build. Continue with the offline guide.",
        );
        return;
      }
      const discovered = await discoverService(controller.signal);
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) return;
      setService(discovered);
      if (discovered?.aiAvailable) setDisclosure(true);
      else setConnection("AI is not connected. The offline guide is ready.");
    } catch {
      if (mounted.current && remoteAllowed.current)
        setConnection("Could not reach AI. The offline guide is ready.");
    } finally {
      clearTimeout(timer);
      if (mounted.current) setChecking(false);
    }
  }
  async function send(question = message) {
    const text = question.trim();
    if (!text || busy || checking) return;
    haptic("light");
    setError("");
    if (mode === "offline") {
      setTurns((previous) => [
        ...previous.slice(-19),
        { ...offlineCoach(text, data, catalog), question: text, id: ++nextId.current },
      ]);
      setMessage("");
      return;
    }
    if (!allowed || !service?.aiAvailable) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    const timer = setTimeout(() => controller.abort(), 70000);
    try {
      const session = await connectedClient?.auth.getSession();
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) return;
      if (!session?.data.session || session.error)
        throw Error(
          "Sign in before sending to AI. You can continue with the offline guide.",
        );
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) return;
      const context = coachContext(data, catalog);
      const value = await requestService<unknown>(
        service,
        "chat",
        JSON.stringify({ message: text, context }),
        controller.signal,
        true,
      );
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) return;
      const reply = validateCoachReply(value, context.allowedDrillIds);
      setTurns((previous) => [
        ...previous.slice(-19),
        { ...reply, question: text, id: ++nextId.current },
      ]);
      setMessage("");
    } catch (e) {
      if (mounted.current && remoteAllowed.current)
        setError(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "AI took too long. Try again or choose Offline guide.",
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
              {mode === "offline" ? "Offline guide · no AI" : "AI coach · OpenAI"}
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
          <>
            <View style={styles.starters}>
              {starters.map((text) => (
                <Pressable
                  key={text}
                  accessibilityRole="button"
                  disabled={busy || checking}
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
            <Text style={s.h3}>A drill to start with</Text>
            {drillCards(recommendations.slice(0, 1).map((d) => d.id))}
            {!recommendations.length ? (
              <Text style={s.body}>
                No matching drills. Edit your setup to find a starting point.
              </Text>
            ) : null}
          </>
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
                  : "AI coach · OpenAI"}
              </Text>
              <Text selectable style={s.body}>
                {turn.reply}
              </Text>
              {drillCards(turn.drillIds)}
            </View>
          ))
        )}
        <Disclosure label="About this coach">
          <Text style={s.small}>
            Offline replies use fixed rules and your saved setup. They stay on this
            device. Chat is cleared when the app closes.
          </Text>
          {allowed ? (
            <Button
              label={
                checking
                  ? "Checking connection…"
                  : mode === "openai"
                    ? "Use offline guide"
                    : "Connect AI coach"
              }
              disabled={checking || busy}
              kind="secondary"
              onPress={() =>
                mode === "openai" ? setMode("offline") : void checkConnection()
              }
            />
          ) : (
            <Text style={s.small}>
              AI chat is not connected in this build. The offline guide is available.
            </Text>
          )}
          {connection ? (
            <Text accessibilityLiveRegion="polite" style={s.small}>
              {connection}
            </Text>
          ) : null}
        </Disclosure>
        {disclosure && allowed ? (
          <View style={[styles.consent, { backgroundColor: C.soft }]}>
            <Text style={s.h3}>Before you use AI</Text>
            <Text style={s.body}>
              Each send shares your message, saved position, training focus and compatible
              drill names and cues with OpenAI through the coaching server. Do not include
              private details. Videos, body measurements, practice history and test
              results are not included. Earlier chat messages are not sent.
            </Text>
            <Button
              label="Enable AI chat"
              kind="lime"
              onPress={() => {
                setMode("openai");
                setDisclosure(false);
              }}
            />
            <Button
              label="Keep offline guide"
              kind="secondary"
              onPress={() => setDisclosure(false)}
            />
          </View>
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
              : "Message to AI coach"
          }
          value={message}
          onChangeText={setMessage}
          maxLength={1500}
          multiline
          placeholder="What do you want to work on?"
          placeholderTextColor={C.muted}
          editable={!busy}
          style={[
            s.body,
            styles.input,
            { backgroundColor: C.soft, color: C.ink, borderColor: C.lineStrong },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            mode === "offline" ? "Ask offline guide" : "Send to AI coach"
          }
          accessibilityState={{ disabled: !message.trim() || busy || checking }}
          disabled={!message.trim() || busy || checking}
          onPress={() => void send()}
          style={({ pressed }) => [
            styles.send,
            {
              backgroundColor: C.lime,
              opacity: !message.trim() || busy || checking ? 0.45 : pressed ? 0.8 : 1,
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
