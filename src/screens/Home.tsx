import { DEVELOPER_FEATURES } from "../config/features";
import { trainingPlanToday, profileForToday } from "../domain/training";
import { haptic } from "../utils/haptics";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { ArrowRight, ArrowLeftRight, CalendarDays } from "lucide-react-native";
import { useApp } from "../state/AppState";
import { days, time, getDrillDuration } from "../domain/model";
import {
  sessionForToday,
  sessionMinutesToday,
  todayOverride,
} from "../domain/sessionTime";
import { useLocalDay } from "../hooks/useLocalDay";
import { WeeklyCalendar } from "../components/WeeklyCalendar";
import { trainHero } from "../data/train-hero";
import {
  Page,
  Note,
  IconButton,
  DrillRow,
  SettingRow,
  Disclosure,
  Button,
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
  const restDay =
    !data.active && !progress.doneToday && !override && !profile.days.includes(today);
  const nextDate = nextTrainingDate(profile, now);
  const nextLabel = nextDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
    <Page contentStyle={styles.todayContent}>
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
      <View style={[styles.session, { backgroundColor: C.deep }]}>
        <View style={styles.sessionSummary}>
          <View style={styles.sessionCopy}>
            <Text style={[styles.sessionStatus, { color: C.onDeep }]}>
              {data.active
                ? "Paused session"
                : progress.doneToday
                  ? "Session complete"
                  : override || profile.days.includes(today)
                    ? "Today"
                    : `Next session · ${nextLabel}`}
            </Text>
            <Text
              accessibilityRole="header"
              style={[styles.sessionTitle, { color: C.onDeep }]}
            >
              {data.active
                ? "Continue practice"
                : progress.doneToday
                  ? "Done for today"
                  : profile.goal}
            </Text>
            <Text style={[styles.sessionMetadata, { color: C.onDeep }]}>
              {data.active
                ? `${time(data.active.elapsed)} · drill ${data.active.index + 1}/${data.active.ids.length}`
                : `${minutes} min · ${ids.length} drills`}
            </Text>
          </View>
          <Image
            source={trainHero.source}
            contentFit="cover"
            contentPosition="center"
            style={styles.sessionImage}
            accessibilityLabel={trainHero.description}
          />
        </View>
        <View style={styles.sessionAction}>
          <Pressable
            accessibilityRole="button"
            onPress={start}
            style={({ pressed }) => ({
              minHeight: 52,
              alignSelf: "stretch",
              justifyContent: "space-between",
              backgroundColor: C.lime,
              borderRadius: 26,
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
                fontSize: 15,
                color: C.onLime,
              }}
            >
              {data.active
                ? "Resume"
                : !ids.length
                  ? "Review setup"
                  : progress.doneToday
                    ? "Train again"
                    : !profile.days.includes(today)
                      ? "Train now"
                      : "Start session"}
            </Text>
            <ArrowRight size={17} color={C.onLime} />
          </Pressable>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={s.h2}>
          This week
        </Text>
        <WeeklyCalendar
          now={now}
          scheduledDays={profile.days}
          completedDays={progress.completedDays}
          count={progress.count}
          target={progress.target}
          onEdit={() => {
            haptic("selection");
            navigation.navigate("Preferences", { section: "schedule" });
          }}
        />
      </View>
      <View>
        <View style={styles.drillHeading}>
          <Text
            accessibilityRole="header"
            style={s.h2}
          >{`${restDay ? "Next session’s drills" : "Today’s drills"} · ${ids.length}`}</Text>
        </View>
        {!ids.length ? (
          <Text style={s.body}>
            Update today’s check-in or choose a playlist for your equipment.
          </Text>
        ) : null}
        {ids.map((id) => (
          <DrillRow
            key={id}
            showArtworkPlayBadge={false}
            duration={duration}
            drill={catalog.find((d) => d.id === id)!}
            onPress={() => navigation.navigate("Detail", { id })}
          />
        ))}
      </View>
      <View>
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

const styles = StyleSheet.create({
  todayContent: { gap: 24, paddingTop: 8, paddingBottom: 24 },
  session: { borderRadius: 16, overflow: "hidden" },
  sessionSummary: { flexDirection: "row", minHeight: 128 },
  sessionCopy: { flex: 1, minWidth: 0, padding: 16, gap: 8, justifyContent: "center" },
  sessionStatus: { fontFamily: "Archivo_500Medium", fontSize: 12, lineHeight: 18 },
  sessionTitle: {
    fontFamily: "Archivo_700Bold",
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.8,
  },
  sessionMetadata: { fontFamily: "Archivo_400Regular", fontSize: 14, lineHeight: 20 },
  sessionImage: { width: "30%", alignSelf: "stretch", minHeight: 128 },
  sessionAction: { padding: 16, paddingTop: 0 },
  drillHeading: { paddingBottom: 4 },
});
