import { haptic } from "../utils/haptics";
import { Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import {
  ArrowRight,
  ArrowLeftRight,
  CalendarDays,
  Check,
  Settings2,
} from "lucide-react-native";
import { useApp } from "../state/AppState";
import { days, makeSession, time, getDrillDuration } from "../domain/model";
import { drills } from "../data/drills";
import {
  Page,
  IconButton,
  DrillRow,
  SettingRow,
  Disclosure,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import {
  adaptDrill,
  planForDate,
  weeklyProgress,
  nextTrainingDate,
} from "../domain/planning";
export function Today({ navigation }: { navigation: any }) {
  const { data, update } = useApp();
  const { C, s } = useTheme();
  const now = new Date();
  const progress = weeklyProgress(data.history, data.profile, now);
  const catalog = drills.map((d) => {
    const earned = adaptDrill(d, data.history);
    const snapshot = data.active?.snapshots?.[d.id];
    const variant = snapshot
      ? d.variants?.find((v) => v.difficulty === snapshot.difficulty)
      : undefined;
    return variant ? { ...d, ...variant } : earned;
  });
  const ids =
    data.active?.ids ??
    planForDate(catalog, data.profile, data.plan, now, data.planCustomized);
  const { profile } = data;
  const today = days[(new Date().getDay() + 6) % 7];
  const start = () => {
    haptic("medium");
    if (!data.active)
      update((st) => ({
        ...st,
        active: makeSession(ids, st.profile.minutes, Date.now(), catalog),
      }));
    navigation.navigate("Practice");
  };
  const duration = time(
    data.active?.duration ?? getDrillDuration(profile.minutes, ids.length),
  );
  return (
    <Page contentStyle={{ gap: 16, paddingTop: 8, paddingBottom: 16 }}>
      <View
        style={{
          flexDirection: "row",
          minHeight: 180,
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: C.deep,
        }}
      >
        <View
          style={{
            flex: 1,
            padding: 16,
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontFamily: "Archivo_500Medium",
                fontSize: 12,
                lineHeight: 18,
                color: C.onDeep,
              }}
            >
              {data.active
                ? "SESSION PAUSED"
                : progress.doneToday
                  ? "SESSION COMPLETE"
                  : profile.days.includes(today)
                    ? "TODAY’S SESSION"
                    : "NEXT SESSION"}
            </Text>
            <Text
              style={{
                fontFamily: "Archivo_600SemiBold",
                fontSize: 27,
                lineHeight: 33,
                letterSpacing: -0.8,
                color: C.onDeep,
              }}
            >
              {data.active
                ? "Ready when you are"
                : progress.doneToday
                  ? "Done for today"
                  : profile.goal}
            </Text>
            <Text
              style={{
                fontFamily: "Archivo_400Regular",
                fontSize: 13,
                lineHeight: 19,
                color: C.onDeep,
              }}
            >
              {data.active
                ? `${time(data.active.elapsed)} practiced · ${data.active.index + 1}/${data.active.ids.length} drills`
                : `${profile.minutes} min · ${ids.length} drills`}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={start}
            style={({ pressed }) => ({
              minHeight: 48,
              alignSelf: "flex-start",
              backgroundColor: C.lime,
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: "Archivo_600SemiBold",
                fontSize: 14,
                color: C.onLime,
              }}
            >
              {data.active
                ? "Resume"
                : progress.doneToday
                  ? "Train again"
                  : "Start session"}
            </Text>
            <ArrowRight size={17} color={C.onLime} />
          </Pressable>
        </View>
        <Image
          source={require("../../assets/training-editorial.png")}
          contentFit="cover"
          contentPosition={{ left: "52%", top: "82%" }}
          style={{ width: 116, alignSelf: "stretch", minHeight: 180 }}
          accessibilityLabel="Ball and boots on the pitch"
        />
      </View>
      <View style={{ gap: 8 }}>
        <View style={s.row}>
          <Text style={s.h2}>This week</Text>
          <Text style={s.small}>
            {progress.count} of {progress.target} this week
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit weekly schedule. ${progress.count} of ${progress.target} complete this week. Completed days: ${progress.completedDays.join(", ") || "none"}`}
          onPress={() => {
            haptic("selection");
            navigation.navigate("Preferences", { section: "schedule" });
          }}
          style={{
            flexDirection: "row",
            backgroundColor: C.white,
            borderRadius: 12,
            padding: 4,
          }}
        >
          {days.map((d) => (
            <View
              key={d}
              style={{
                flex: 1,
                height: 40,
                justifyContent: "center",
                alignItems: "center",
                gap: 7,
                borderRadius: 9,
                backgroundColor:
                  d === today
                    ? C.green
                    : progress.completedDays.includes(d)
                      ? C.pitchSoft
                      : "transparent",
              }}
            >
              <Text
                style={{
                  fontFamily: "Archivo_500Medium",
                  fontSize: 12,
                  color: d === today ? C.onPrimary : C.muted,
                }}
              >
                {d.slice(0, 1)}
              </Text>
              {progress.completedDays.includes(d) ? (
                <Check size={12} color={d === today ? C.onPrimary : C.green} />
              ) : (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: profile.days.includes(d)
                      ? d === today
                        ? C.onPrimary
                        : C.green
                      : "transparent",
                  }}
                />
              )}
            </View>
          ))}
        </Pressable>
      </View>
      <View style={{ gap: 0 }}>
        <View style={s.row}>
          <Text style={s.h2}>Session drills</Text>
          <Text numberOfLines={1} style={[s.small, { maxWidth: 160 }]}>
            Ball
            {profile.gear.length ? " + " + profile.gear.join(" + ") : " only"}
          </Text>
        </View>
        {ids.map((id) => (
          <DrillRow
            key={id}
            duration={duration}
            drill={catalog.find((d) => d.id === id)!}
            onPress={() => navigation.navigate("Detail", { id })}
          />
        ))}
      </View>
    </Page>
  );
}
export function Plan({ navigation }: { navigation: any }) {
  const { data } = useApp();
  const { C, s } = useTheme();
  const catalog = drills.map((d) => adaptDrill(d, data.history));
  const ids = planForDate(
    catalog,
    data.profile,
    data.plan,
    new Date(),
    data.planCustomized,
  );
  const p = data.profile;
  const duration = time(getDrillDuration(p.minutes, ids.length));
  return (
    <Page>
      <View style={s.group}>
        <SettingRow
          label={p.goal}
          value={`${p.experience} · ${p.space}`}
          onPress={() =>
            navigation.navigate("Preferences", { section: "goal" })
          }
        />
        <SettingRow
          icon={CalendarDays}
          label={`${p.minutes} minutes per session`}
          value={p.days.join(" · ")}
          onPress={() => {
            navigation.navigate("Preferences", { section: "schedule" });
          }}
        />
        <SettingRow
          icon={Settings2}
          label="Settings"
          value="Appearance, reminders and onboarding"
          onPress={() => navigation.navigate("Settings")}
        />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={s.h2}>Session drills</Text>
        <Text style={s.small}>
          {data.planCustomized
            ? "Your custom plan"
            : `For ${days[(nextTrainingDate(p).getDay() + 6) % 7]} · rotates each training day`}{" "}
          · 2-minute warm-up
        </Text>
        {ids.map((id, i) => (
          <DrillRow
            key={`${id}-${i}`}
            drill={catalog.find((d) => d.id === id)!}
            duration={duration}
            onPress={() => navigation.navigate("Detail", { id })}
            trailing={
              <IconButton
                feedback="light"
                icon={ArrowLeftRight}
                label={`Swap ${drills.find((d) => d.id === id)!.name}`}
                onPress={() =>
                  navigation.navigate("Replace", { index: i, mode: "plan" })
                }
              />
            }
          />
        ))}
      </View>
      <Disclosure label="Weekly schedule">
        <View style={s.group}>
          {days.map((d) => (
            <View
              key={d}
              style={{
                paddingHorizontal: 16,
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                borderBottomWidth: 1,
                borderColor: C.line,
              }}
            >
              <Text style={[s.body, { width: 52, color: C.ink }]}>{d}</Text>
              <Text
                style={[
                  s.small,
                  { flex: 1, color: p.days.includes(d) ? C.green : C.muted },
                ]}
              >
                {p.days.includes(d)
                  ? (() => {
                      const date = new Date();
                      date.setDate(
                        date.getDate() -
                          ((date.getDay() + 6) % 7) +
                          days.indexOf(d),
                      );
                      return planForDate(
                        catalog,
                        p,
                        data.plan,
                        date,
                        data.planCustomized,
                      )
                        .map((id) => catalog.find((x) => x.id === id)?.name)
                        .join(" · ");
                    })()
                  : "Rest"}
              </Text>
              {p.days.includes(d) ? (
                <Text style={s.small}>{p.minutes} min</Text>
              ) : null}
            </View>
          ))}
        </View>
      </Disclosure>
    </Page>
  );
}
