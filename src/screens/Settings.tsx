import { haptic } from "../utils/haptics";
import { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useReminders } from "../notifications/RemindersProvider";
import {
  CalendarDays,
  SlidersHorizontal,
  Goal,
  Trash2,
  RotateCcw,
} from "lucide-react-native";
import { useApp } from "../state/AppState";
import { initialData, matchPlan, pause } from "../domain/model";
import { drills } from "../data/drills";
import { Preferences } from "../components/Preferences";
import { Button, Disclaimer, Page, SettingRow, Title } from "../components/ui";
export function Settings({ navigation }: { navigation: any }) {
  const { data, update } = useApp();
  const { C, s, mode, setMode, error: themeError } = useTheme();
  const reminders = useReminders();
  return (
    <Page>
      <View style={s.group}>
        <SettingRow
          icon={Goal}
          label="Focus"
          value={data.profile.goal}
          onPress={() =>
            navigation.navigate("Preferences", { section: "goal" })
          }
        />
        <SettingRow
          icon={CalendarDays}
          label="Schedule"
          value={`${data.profile.days.join(", ")} · ${data.profile.minutes} min`}
          onPress={() =>
            navigation.navigate("Preferences", { section: "schedule" })
          }
        />
        <SettingRow
          icon={SlidersHorizontal}
          label="Training setup"
          value={`${data.profile.space} · ${data.profile.gear.length ? "Ball + " + data.profile.gear.join(" + ") : "Ball only"}`}
          onPress={() => navigation.navigate("Preferences", { section: "all" })}
        />
      </View>
      <View style={{ gap: 12 }}>
        <Text style={s.h2}>Appearance</Text>
        <View style={s.chips}>
          {(["system", "light", "dark"] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === value }}
              onPress={() => {
                if (mode === value) return;
                haptic("selection");
                setMode(value);
              }}
              style={({ pressed }) => ({
                minHeight: 48,
                paddingHorizontal: 18,
                justifyContent: "center",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: mode === value ? C.green : C.lineStrong,
                backgroundColor: mode === value ? C.green : C.white,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={[s.h3, { color: mode === value ? C.onPrimary : C.ink }]}
              >
                {value === "system"
                  ? "System"
                  : value === "light"
                    ? "Light"
                    : "Dark"}
              </Text>
            </Pressable>
          ))}
        </View>
        {themeError ? (
          <Text
            accessibilityRole="alert"
            style={[s.small, { color: C.danger }]}
          >
            {themeError}
          </Text>
        ) : null}
      </View>
      <ReminderSettings />
      <View style={s.group}>
        <SettingRow
          icon={RotateCcw}
          label="Replay onboarding"
          onPress={() => {
            if (data.active?.running)
              update((st) => ({
                ...st,
                active: st.active ? pause(st.active) : null,
              }));
            navigation.navigate("ReplayOnboarding");
          }}
        />
      </View>
      <View style={{ gap: 12 }}>
        <Text style={s.h2}>On this device</Text>
        <Text style={s.body}>
          Your plan and results stay here. No account or cloud backup.
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        <Text style={s.h2}>Practice safely</Text>
        <Disclaimer />
      </View>
      <View style={s.group}>
        <SettingRow
          icon={Trash2}
          label="Reset all data"
          danger
          onPress={() =>
            Alert.alert(
              "Reset all data?",
              "Your preferences, sessions and benchmarks will be permanently cleared.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset all data",
                  style: "destructive",
                  onPress: () => {
                    haptic("warning");
                    void reminders.reset();
                    update(() => initialData());
                  },
                },
              ],
            )
          }
        />
      </View>
    </Page>
  );
}
export function EditPreferences({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const { data, update } = useApp();
  const { s } = useTheme();
  const [profile, setProfile] = useState(data.profile);
  const section = route.params?.section || "all";
  return (
    <Page
      footer={
        <Button
          disabled={!profile.days.length}
          label="Save changes"
          feedback="success"
          onPress={() => {
            update((st) => {
              const normalized = (p: typeof profile) =>
                JSON.stringify({
                  ...p,
                  days: [...p.days].sort(),
                  gear: [...p.gear].sort(),
                });
              const changed = normalized(profile) !== normalized(st.profile);
              return {
                ...st,
                profile,
                plan: changed ? matchPlan(drills, profile) : st.plan,
                planCustomized: changed ? false : st.planCustomized,
              };
            });
            navigation.goBack();
          }}
        />
      }
    >
      {section !== "all" ? (
        <Title
          title={section === "schedule" ? "Your schedule" : "Training focus"}
        />
      ) : null}
      <Preferences profile={profile} onChange={setProfile} section={section} />
      {data.active ? (
        <Text style={s.small}>Changes apply after your current session.</Text>
      ) : null}
    </Page>
  );
}

function ReminderSettings() {
  const { C, s } = useTheme();
  const { data } = useApp();
  const { preferences, busy, ready, supported, message, setEnabled, setTime } =
    useReminders();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const clock = `${String(preferences.hour).padStart(2, "0")}:${String(preferences.minute).padStart(2, "0")}`;
  return (
    <View style={{ gap: 12 }}>
      <View style={s.row}>
        <Text style={s.h2}>Training reminders</Text>
        <Switch
          accessibilityLabel="Training reminders"
          disabled={!ready || busy || !supported}
          value={preferences.enabled}
          onValueChange={(value) => {
            if (!ready || busy || !supported) return;
            haptic(value ? "toggle-on" : "toggle-off");
            void setEnabled(value);
          }}
          trackColor={{ false: C.lineStrong, true: C.green }}
          thumbColor={C.white}
        />
      </View>
      <Text style={s.small}>
        On this device · {data.profile.days.join(", ")} · local time
      </Text>
      {supported ? (
        <>
          <Text style={s.small}>Reminder time (24-hour HH:MM)</Text>
          <TextInput
            style={s.input}
            value={draft ?? clock}
            accessibilityLabel="Reminder time, 24-hour HH:MM"
            placeholder="18:00"
            placeholderTextColor={C.muted}
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            maxLength={5}
            editable={ready && !busy}
            onChangeText={(value) => {
              setDraft(value);
              setError("");
            }}
          />
          {error ? (
            <Text
              accessibilityRole="alert"
              style={[s.small, { color: C.danger }]}
            >
              {error}
            </Text>
          ) : null}
          <Button
            label={busy ? "Updating reminders…" : "Save reminder time"}
            feedback={false}
            kind="secondary"
            disabled={!ready || busy}
            onPress={() => {
              const match = /^(\d{1,2}):(\d{2})$/.exec(draft ?? clock);
              if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
                haptic("error");
                setError("Use a time from 00:00 to 23:59.");
                return;
              }
              haptic("light");
              void setTime(Number(match[1]), Number(match[2]));
              setDraft(null);
            }}
          />
        </>
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={s.small}>
          {message}
        </Text>
      ) : null}
      {message.includes("blocked") ? (
        <Button
          label="Open device Settings"
          kind="secondary"
          onPress={() => {
            void Linking.openSettings().catch(() =>
              Alert.alert(
                "Open device Settings",
                "Allow notifications for Breakaway in your device Settings.",
              ),
            );
          }}
        />
      ) : null}
    </View>
  );
}
