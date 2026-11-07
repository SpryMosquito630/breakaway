import { useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Button, Page, Title } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../state/AppState";
import { localGuide, trainingContext } from "../coachAi/guide";
import { discoverService, requestService, type ServiceState } from "../coachAi/service";
import { VideoReview } from "./PoseReview";
export function CoachAI({ navigation }: { navigation: any }) {
  const { s, C } = useTheme();
  const { data, catalog } = useApp();
  const [message, setMessage] = useState("What should I practice today?");
  const [reply, setReply] = useState("");
  const [source, setSource] = useState("Local guide");
  const [drillIds, setDrillIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [service, setService] = useState<ServiceState | null>(null);
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  async function connect() {
    try {
      setService(await discoverService());
    } catch {
      setService(null);
    }
  }
  useEffect(() => {
    void connect();
    return () => request.current?.abort();
  }, []);
  function guide() {
    setReply(localGuide(message, data, catalog));
    setSource("Local guide · device only");
    setDrillIds([]);
    setError("");
  }
  async function send() {
    if (!service?.aiAvailable || busy || !message.trim()) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    const timeout = setTimeout(() => controller.abort(), 70000);
    try {
      const value = await requestService<{ reply: string; drillIds: string[] }>(
        service,
        "chat",
        JSON.stringify({
          message: message.trim(),
          context: trainingContext(data, catalog),
        }),
        controller.signal,
        true,
      );
      setReply(value.reply);
      setSource("AI reply · OpenAI");
      setDrillIds(value.drillIds.filter((id) => catalog.some((d) => d.id === id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI could not respond.");
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  return (
    <Page>
      <Title
        title="Training guide"
        eyebrow="PLAN • PRACTICE • RETEST"
        body="Ask about your plan, saved sessions and self-reported tests."
      />
      <View style={{ gap: 12 }}>
        <TextInput
          accessibilityLabel="Training question"
          value={message}
          onChangeText={setMessage}
          maxLength={1500}
          multiline
          placeholder="Ask a training question"
          style={[
            s.body,
            {
              padding: 16,
              borderWidth: 1,
              borderColor: C.lineStrong,
              borderRadius: 12,
              minHeight: 90,
              color: C.ink,
            },
          ]}
        />
        <Button label="Ask local guide" onPress={guide} />
        <Text style={s.small}>
          Local guide summarizes your saved facts using fixed rules. It does not analyze
          video.
        </Text>
        <Button
          label={busy ? "Asking AI…" : "Send to AI"}
          disabled={!service?.aiAvailable || busy || !message.trim()}
          onPress={() => void send()}
          kind="secondary"
        />
        <Text style={s.small}>
          {service?.aiAvailable
            ? "Send to AI shares this message, your position, goal, recent practice and self-reported tests with OpenAI. Feedback is guidance and does not change your rating."
            : "AI is not configured or the analysis computer is disconnected. Local guide is available."}
        </Text>
        <Button
          label="Check AI connection"
          kind="secondary"
          onPress={() => void connect()}
        />
        {error ? (
          <Text accessibilityRole="alert" style={s.body}>
            {error}
          </Text>
        ) : null}
        {reply ? (
          <View
            style={{ gap: 10, padding: 16, backgroundColor: C.white, borderRadius: 12 }}
          >
            <Text style={s.small}>{source}</Text>
            <Text selectable style={s.body}>
              {reply}
            </Text>
            {drillIds.map((id) => (
              <Button
                key={id}
                label={`Practice ${catalog.find((d) => d.id === id)?.name}`}
                kind="secondary"
                onPress={() => navigation.navigate("Detail", { id })}
              />
            ))}
          </View>
        ) : null}
        <Button
          label="Review a video"
          kind="secondary"
          onPress={() => navigation.navigate("VideoFeedback")}
        />
        <Button
          label="Retest a skill"
          kind="secondary"
          onPress={() => navigation.navigate("Assessment")}
        />
      </View>
    </Page>
  );
}
export function VideoFeedback({ navigation }: { navigation: any }) {
  return <VideoReview mode="coach" navigation={navigation} />;
}
