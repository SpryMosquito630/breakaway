import { useState } from "react";
import { Alert, Text, View } from "react-native";
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
import {
  Button,
  Disclaimer,
  Page,
  SettingRow,
  Title,
  s,
} from "../components/ui";
export function Settings({ navigation }: { navigation: any }) {
  const { data, update } = useApp();
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
                  onPress: () => update(() => initialData()),
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
  const [profile, setProfile] = useState(data.profile);
  const section = route.params?.section || "all";
  return (
    <Page
      footer={
        <Button
          disabled={!profile.days.length}
          label="Save changes"
          onPress={() => {
            update((st) => ({
              ...st,
              profile,
              plan: matchPlan(drills, profile),
            }));
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
