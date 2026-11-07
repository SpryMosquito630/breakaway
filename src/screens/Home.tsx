import { DEVELOPER_FEATURES } from "../config/features";
import { trainingPlanToday, profileForToday } from "../domain/training";
import { useState } from "react";
import { haptic } from "../utils/haptics";
import { Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { ArrowRight, ArrowLeftRight, CalendarDays, Check } from "lucide-react-native";
import { useApp } from "../state/AppState";
import { days, time, getDrillDuration } from "../domain/model";
import {
  sessionForToday,
  sessionMinutesToday,
  setTodayMinutes,
  todayMinuteChoices,
  todayOverride,
} from "../domain/sessionTime";
import { useLocalDay } from "../hooks/useLocalDay";
import {
  Page,
  Note,
  IconButton,
  DrillRow,
  SettingRow,
  Disclosure,
  Button,
  Chip,
} from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import {
  adaptDrill,
  planForDate,
  weeklyProgress,
  nextTrainingDate,
} from "../domain/planning";
export function Today({ navigation }: { navigation: any }) {
  const { data, update, catalog: drills } = useApp();
  const { C, s } = useTheme();
  const now = useLocalDay();
  const [editingTime, setEditingTime] = useState(false);
  const override = todayOverride(data, now);
  const minutes = sessionMinutesToday(data, now);
  const progress = weeklyProgress(data.history, data.profile, now);
  const catalog = drills.map((d) => {
    const earned = adaptDrill(d, data.history);
    const snapshot = data.active?.snapshots?.[d.id];
    const variant = snapshot
      ? d.variants?.find((v) => v.difficulty === snapshot.difficulty)
      : undefined;
    return variant ? { ...d, ...variant } : earned;
  });
  const ids = data.active?.ids ?? trainingPlanToday(data, catalog, now);
  const profile = profileForToday(data, now);
  const today = days[(now.getDay() + 6) % 7];
  const start = () => {
    if (!data.active && !ids.length) {
      navigation.navigate("TrainingPlanner");
      return;
    }
    haptic("medium");
    if (!data.active)
      update((st) => ({
        ...st,
        active: sessionForToday(st, catalog, new Date()),
      }));
    navigation.navigate("Practice");
  };
  const duration = time(data.active?.duration ?? getDrillDuration(minutes, ids.length));
  return (
    <Page contentStyle={{ gap: 16, paddingTop: 8, paddingBottom: 16 }}>
      {data.trainingRecoveryNotice ? (
        <View style={{ gap: 8 }}>
          <Note>{data.trainingRecoveryNotice}</Note>
          <Button
            kind="secondary"
            label="Dismiss recovery notice"
            onPress={() => update((st) => ({ ...st, trainingRecoveryNotice: undefined }))}
          />
        </View>
      ) : null}
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
                ? "Paused session"
                : progress.doneToday
                  ? "Session complete"
                  : override || profile.days.includes(today)
                    ? "Today"
                    : "Next session"}
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
                ? "Continue practice"
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
                ? `${time(data.active.elapsed)} · drill ${data.active.index + 1}/${data.active.ids.length}`
                : `${minutes} min · ${ids.length} drills`}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={start}
            style={({ pressed }) => ({
              minHeight: 48,
              alignSelf: "stretch",
              justifyContent: "space-between",
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
                : !ids.length
                  ? "Review setup"
                  : progress.doneToday
                    ? "Train again"
                    : !profile.days.includes(today) && override
                      ? "Train now"
                      : "Start session"}
            </Text>
            <ArrowRight size={17} color={C.onLime} />
          </Pressable>
        </View>
        <Image
          source={require("../../assets/training-editorial.webp")}
          contentFit="cover"
          contentPosition={{ left: "52%", top: "82%" }}
          style={{ width: 116, alignSelf: "stretch", minHeight: 180 }}
          accessibilityLabel="Ball and boots on the pitch"
        />
      </View>
      {!data.active ? (
        <View style={{ gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change time today. ${minutes} minutes${override ? ", just for today" : ", usual schedule"}`}
            accessibilityState={{ expanded: editingTime }}
            onPress={() => {
              haptic("selection");
              setEditingTime(!editingTime);
            }}
            style={[s.row, { minHeight: 48 }]}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.h3}>{minutes} minutes today</Text>
            </View>
            <Text style={[s.h3, { color: C.green }]}>
              {editingTime ? "Close" : "Change"}
            </Text>
          </Pressable>
          {editingTime ? (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {todayMinuteChoices.map((value) => (
                  <Chip
                    key={value}
                    label={`${value} min`}
                    selected={minutes === value}
                    onPress={() => update((st) => setTodayMinutes(st, value))}
                  />
                ))}
              </View>
              <Text style={s.small}>
                Includes a 2-minute warm-up. Your usual schedule stays at{" "}
                {profile.minutes} minutes.
              </Text>
              {override ? (
                <Button
                  label="Use usual schedule"
                  kind="secondary"
                  onPress={() => update((st) => setTodayMinutes(st, undefined))}
                />
              ) : null}
              <Button label="Done" onPress={() => setEditingTime(false)} />
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        <View style={s.row}>
          <Text style={s.h2}>This week</Text>
          <Text style={s.small}>
            {progress.count} / {progress.target} sessions
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
      <View style={{ gap: 12 }}>
        <Text style={s.h2}>{`Today’s drills · ${ids.length}`}</Text>
        <Text style={s.small}>
          Ball{profile.gear.length ? " + " + profile.gear.join(" + ") : " only"}
        </Text>
        {!ids.length ? (
          <Text style={s.body}>
            Update today’s check-in or choose another playlist to use the equipment you
            have.
          </Text>
        ) : null}
        {ids.map((id) => (
          <DrillRow
            key={id}
            duration={duration}
            drill={catalog.find((d) => d.id === id)!}
            onPress={() => navigation.navigate("Detail", { id })}
          />
        ))}
      </View>
      <View style={s.group}>
        <SettingRow
          label="My plan"
          value={profile.goal}
          onPress={() => navigation.navigate("MyPlan")}
        />
        {DEVELOPER_FEATURES ? (
          <SettingRow
            label="Video replay (developer)"
            onPress={() => navigation.navigate("Replay")}
          />
        ) : null}
      </View>
    </Page>
  );
}
export function Plan({ navigation }: { navigation: any }) {
  const { data, catalog: drills } = useApp();
  const { C, s } = useTheme();
  const catalog = drills.map((d) => adaptDrill(d, data.history));
  const ids = trainingPlanToday({ ...data, dailyReadiness: undefined }, catalog);
  const p = data.profile;
  const duration = time(getDrillDuration(p.minutes, ids.length));
  return (
    <Page>
      <View style={s.group}>
        <SettingRow
          label={p.goal}
          value={`${p.experience} · ${p.space}`}
          onPress={() => navigation.navigate("Preferences", { section: "goal" })}
        />
        <SettingRow
          icon={CalendarDays}
          label={`${p.minutes} minutes per session`}
          value={p.days.join(" · ")}
          onPress={() => {
            navigation.navigate("Preferences", { section: "schedule" });
          }}
        />
      </View>
      <Button
        kind="secondary"
        label="Weekly planner"
        onPress={() => navigation.navigate("TrainingPlanner")}
      />
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
                onPress={() => navigation.navigate("Replace", { index: i, mode: "plan" })}
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
                        date.getDate() - ((date.getDay() + 6) % 7) + days.indexOf(d),
                      );
                      return planForDate(catalog, p, data.plan, date, data.planCustomized)
                        .map((id) => catalog.find((x) => x.id === id)?.name)
                        .join(" · ");
                    })()
                  : "Rest"}
              </Text>
              {p.days.includes(d) ? <Text style={s.small}>{p.minutes} min</Text> : null}
            </View>
          ))}
        </View>
      </Disclosure>
    </Page>
  );
}
