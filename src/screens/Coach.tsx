import { useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from "react";
import {
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
  Settings2,
  RotateCcw,
  Footprints,
} from "lucide-react-native";
import { useIsFocused } from "@react-navigation/native";
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
} from "../coachAi/recommendations";
import { haptic } from "../utils/haptics";
import { Button } from "../components/ui";
import { CoachSendFlow } from "../coachAi/sendFlow";
import { queueChatTurn, updateChatTurn, type ChatTurn } from "../coachAi/conversation";
import { CoachTyping } from "../components/CoachTyping";

type CoachService = ServiceState & { coachIdentity?: string };
function consentKey(service: CoachService) {
  return `${service.base}|${service.chatProvider}|${service.coachIdentity ?? service.chatPairToken ?? ""}`;
}

const starters = ["Today’s practice", "Weaker foot", "Passing"];
export function Coach({ navigation }: { navigation: any }) {
  const { C, s } = useTheme();
  const focused = useIsFocused();
  const { data, catalog } = useApp();
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [mode, setMode] = useState<"auto" | "offline" | "ai">(
    COACH_REMOTE_ENABLED ? "auto" : "offline",
  );
  const [service, setService] = useState<CoachService | null>(null);
  const [connection, setConnection] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [checking, setChecking] = useState(false);
  const [disclosure, setDisclosure] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const request = useRef<AbortController | null>(null);
  const flow = useRef(new CoachSendFlow());
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const nearBottom = useRef(true);
  const nextId = useRef(0);
  const activeTurn = useRef<number | null>(null);
  const activeQuestion = useRef("");
  const allowed = remoteCoachAllowed(data.profile.ageBand, COACH_REMOTE_ENABLED);
  const remoteAllowed = useRef(allowed);
  remoteAllowed.current = allowed;
  const mounted = useRef(true);
  const provider = service?.chatProvider === "gemini" ? "Google Gemini" : "OpenAI";
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerIdentity}>
          <View style={[styles.headerAvatar, { backgroundColor: C.lime }]}>
            <MessageCircle size={20} color={C.onLime} strokeWidth={1.8} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text numberOfLines={1} style={[s.h3, { fontSize: 16 }]}>
              Coach Breakaway
            </Text>
            <Text numberOfLines={1} style={[s.small, { fontSize: 11 }]}>
              {mode === "offline"
                ? "Offline guide · no AI"
                : mode === "ai"
                  ? `AI assistant · ${provider}`
                  : "AI training assistant"}
            </Text>
          </View>
        </View>
      ),
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => navigation.navigate("Settings")}
          style={styles.headerAction}
        >
          <Settings2 size={21} color={C.ink} />
        </Pressable>
      ),
    });
  }, [navigation, C, s, mode, provider]);
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
  function markTurn(status: ChatTurn["status"], note?: string) {
    const id = activeTurn.current;
    setTurns((previous) => updateChatTurn(previous, id, { status, note }));
  }
  function failTurn(note: string) {
    markTurn("failed", note);
    setMessage(activeQuestion.current);
  }
  function answerOffline(text: string) {
    const id = activeTurn.current;
    setTurns((previous) =>
      updateChatTurn(previous, id, {
        status: "complete",
        note: undefined,
        answer: offlineCoach(text, data, catalog),
      }),
    );
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
      markTurn("queued", "Pair phone to send");
      setPairCode("");
      setPairing(true);
    } else if (next === "consent") {
      markTurn("queued", "Waiting for your approval");
      setDisclosure(true);
    } else if (next === "send") {
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
    setPairing(false);
    setDisclosure(false);
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const discovered = await discoverService(controller.signal);
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) return;
      setService(discovered);
      if (!discovered?.chatAvailable) {
        flow.current.cancel();
        failTurn("AI is unavailable. Retry or use the offline guide.");
        return;
      }
      const session = await connectedClient?.auth.getSession();
      if (!mounted.current || !remoteAllowed.current || controller.signal.aborted) return;
      if (
        (!session?.data.session || session.error) &&
        !(COACH_DEV_ENABLED && discovered.chatDevAllowed)
      ) {
        flow.current.cancel();
        failTurn("AI is not available in this build yet. You can use the offline guide.");
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
        failTurn("Could not reach AI. Retry or use the offline guide.");
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
  async function send(question = message, retryId?: number) {
    const text = question.trim();
    if (!text || busy || checking || disclosure || pairing) return;
    haptic("light");
    setConnection("");
    const id = retryId ?? ++nextId.current;
    activeTurn.current = id;
    activeQuestion.current = text;
    nearBottom.current = true;
    setTurns((previous) => queueChatTurn(previous, id, text));
    setMessage("");
    if (mode === "offline" || !COACH_REMOTE_ENABLED) {
      answerOffline(text);
      return;
    }
    flow.current.queue(text);
    await checkConnection();
  }
  async function sendAI(text: string, active: CoachService) {
    if (!allowed || !active.chatAvailable) return;
    const controller = new AbortController();
    request.current = controller;
    setMode("ai");
    setBusy(true);
    markTurn("sending", "Sending…");
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
      setAwaitingReply(true);
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
      const id = activeTurn.current;
      setTurns((previous) =>
        updateChatTurn(previous, id, {
          status: "complete",
          note: undefined,
          answer: reply,
        }),
      );
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
      if (mounted.current && remoteAllowed.current) {
        if (e instanceof ServiceError && e.code === "pair_required")
          markTurn("queued", "Pair phone to retry");
        else
          failTurn(
            e instanceof Error && e.name !== "AbortError"
              ? e.message
              : "AI took too long. Retry or use the offline guide.",
          );
      }
    } finally {
      clearTimeout(timer);
      if (mounted.current) {
        setBusy(false);
        setAwaitingReply(false);
      }
    }
  }
  function coachAvatar() {
    return (
      <View style={[styles.messageAvatar, { backgroundColor: C.lime }]}>
        <MessageCircle size={14} color={C.onLime} strokeWidth={1.8} />
      </View>
    );
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
          <View style={[styles.drillIcon, { backgroundColor: C.pitchSoft }]}>
            <Footprints size={19} color={C.green} />
          </View>
          <View style={styles.grow}>
            <Text style={s.h3}>{drill.name}</Text>
            <Text style={[s.small, { fontSize: 12 }]}>{drill.skill} · View drill</Text>
          </View>
          <ChevronRight size={18} color={C.green} />
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
        scrollEventThrottle={100}
        onScroll={({ nativeEvent }) => {
          nearBottom.current =
            nativeEvent.contentSize.height -
              nativeEvent.layoutMeasurement.height -
              nativeEvent.contentOffset.y <
            90;
        }}
        onContentSizeChange={() => {
          if (turns.length && nearBottom.current)
            scroll.current?.scrollToEnd({ animated: false });
        }}
      >
        <View style={styles.assistantRow}>
          {coachAvatar()}
          <View style={[styles.assistantBubble, { backgroundColor: C.deep }]}>
            <Text style={[s.body, styles.chatText, { color: C.onDeep }]}>
              Hey, what are we working on today?
            </Text>
          </View>
        </View>
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
        ) : null}
        {turns.map((turn) => (
          <View key={turn.id} style={styles.turn}>
            <View style={styles.userColumn}>
              <View style={[styles.question, { backgroundColor: C.lime }]}>
                <Text selectable style={[s.body, styles.chatText, { color: C.onLime }]}>
                  {turn.question}
                </Text>
              </View>
              {turn.status !== "complete" ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[
                    s.small,
                    styles.status,
                    { color: turn.status === "failed" ? C.danger : C.muted },
                  ]}
                >
                  {turn.status === "failed" ? "Couldn’t send" : turn.note}
                </Text>
              ) : null}
              {turn.status === "failed" ? (
                <View style={styles.failure}>
                  <Text style={[s.small, { textAlign: "right" }]}>{turn.note}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Retry question: ${turn.question}`}
                    disabled={paused}
                    onPress={() => void send(turn.question, turn.id)}
                    style={styles.retry}
                  >
                    <RotateCcw size={14} color={C.green} />
                    <Text style={[s.small, { color: C.green }]}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
            {turn.answer ? (
              <View style={styles.assistantRow}>
                {coachAvatar()}
                <View style={styles.answerColumn}>
                  <View style={[styles.assistantBubble, { backgroundColor: C.deep }]}>
                    <Text
                      selectable
                      style={[s.body, styles.chatText, { color: C.onDeep }]}
                    >
                      {turn.answer.reply}
                    </Text>
                  </View>
                  {drillCards(turn.answer.drillIds)}
                  <Text style={[s.small, styles.source]}>
                    {turn.answer.source === "offline"
                      ? "Offline guide · fixed rules"
                      : `AI · ${turn.answer.source === "gemini" ? "Google Gemini" : "OpenAI"}`}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ))}
        {awaitingReply && focused ? (
          <View style={styles.assistantRow}>
            {coachAvatar()}
            <View style={[styles.assistantBubble, { backgroundColor: C.deep }]}>
              <CoachTyping color={C.onDeep} />
            </View>
          </View>
        ) : null}
        {COACH_REMOTE_ENABLED && !paused ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => (mode === "offline" ? setMode("auto") : chooseOffline())}
            style={styles.modeSwitch}
          >
            <Text style={s.small}>
              {mode === "offline" ? "Use AI coach" : "Use offline guide"}
            </Text>
          </Pressable>
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
      </ScrollView>
      <View style={[styles.composerArea, { backgroundColor: C.bg }]}>
        <View
          style={[
            styles.composer,
            { backgroundColor: C.white, borderColor: C.lineStrong },
          ]}
        >
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
            numberOfLines={1}
            placeholder={mode === "offline" ? "Ask the offline guide…" : "Message Coach…"}
            placeholderTextColor={C.muted}
            editable={!paused}
            style={[s.body, styles.input, { color: C.ink }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              mode === "offline" ? "Ask offline guide" : "Send question"
            }
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
        <Text style={[s.small, styles.composerHint]}>
          {mode === "offline" ? "Offline · no AI" : "AI can make mistakes."}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 12,
    gap: 18,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  headerIdentity: { flexDirection: "row", alignItems: "center", gap: 9, flexShrink: 1 },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAction: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  messageAvatar: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingRight: 18,
  },
  answerColumn: { flex: 1, maxWidth: 520, gap: 8 },
  assistantBubble: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 18,
    borderTopLeftRadius: 5,
    flexShrink: 1,
    maxWidth: 520,
  },
  chatText: { fontSize: 15, lineHeight: 23 },
  grow: { flex: 1, gap: 2 },
  starters: { paddingLeft: 34, gap: 8, flexDirection: "row", flexWrap: "wrap" },
  starter: {
    paddingHorizontal: 13,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
  },
  drill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 14,
  },
  drillIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  turn: { gap: 14 },
  userColumn: { alignSelf: "flex-end", alignItems: "flex-end", maxWidth: "86%", gap: 4 },
  question: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 18,
    borderBottomRightRadius: 5,
  },
  status: { fontSize: 11, paddingRight: 3 },
  source: { fontSize: 11, paddingLeft: 3 },
  failure: { alignItems: "flex-end", maxWidth: 290 },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  modeSwitch: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    paddingHorizontal: 12,
  },
  consent: { marginLeft: 34, padding: 16, gap: 12, borderRadius: 16 },
  pairInput: { minHeight: 52, padding: 14, borderWidth: 1, borderRadius: 12 },
  composerArea: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 5,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 6,
    paddingLeft: 15,
    borderWidth: 1,
    borderRadius: 28,
  },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingVertical: 11, paddingRight: 2 },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  composerHint: { fontSize: 11, textAlign: "center", paddingTop: 4 },
});
