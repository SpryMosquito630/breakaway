import { Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { ArrowRight, ArrowLeftRight, CalendarDays } from "lucide-react-native";
import { useApp } from "../state/AppState";
import { days, makeSession, time } from "../domain/model";
import { drills } from "../data/drills";
import {
  Page,
  IconButton,
  DrillRow,
  SettingRow,
  Disclosure,
  s,
  C,
} from "../components/ui";
export function Today({ navigation }: { navigation: any }) {
  const { data, update } = useApp();
  const { profile } = data;
  const today = days[(new Date().getDay() + 6) % 7];
  const start = () => {
    if (!data.active)
      update((st) => ({
        ...st,
        active: makeSession(st.plan, st.profile.minutes),
      }));
    navigation.navigate("Practice");
  };
  const duration = time(
    Math.floor((profile.minutes * 60 - 120) / data.plan.length),
  );
  return (
    <Page contentStyle={{ gap: 16, paddingTop: 8, paddingBottom: 16 }}>
      <View
        style={{
          flexDirection: "row",
          minHeight: 180,
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: C.green,
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
                color: "#D6E5D9",
              }}
            >
              {data.active
                ? "SESSION PAUSED"
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
                color: "white",
              }}
            >
              {data.active ? "Ready when you are" : profile.goal}
            </Text>
            <Text
              style={{
                fontFamily: "Archivo_400Regular",
                fontSize: 13,
                lineHeight: 19,
                color: "#D6E5D9",
              }}
            >
              {data.active
                ? `${time(data.active.elapsed)} practiced · ${data.active.index + 1}/${data.active.ids.length} drills`
                : `${profile.minutes} min · ${data.plan.length} drills`}
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
                color: C.ink,
              }}
            >
              {data.active ? "Resume" : "Start session"}
            </Text>
            <ArrowRight size={17} color={C.ink} />
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
          <Text style={s.small}>{profile.days.length} planned</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit weekly schedule"
          onPress={() =>
            navigation.navigate("Preferences", { section: "schedule" })
          }
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
                backgroundColor: d === today ? C.green : "transparent",
              }}
            >
              <Text
                style={{
                  fontFamily: "Archivo_500Medium",
                  fontSize: 12,
                  color: d === today ? "white" : C.muted,
                }}
              >
                {d.slice(0, 1)}
              </Text>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: profile.days.includes(d)
                    ? d === today
                      ? C.lime
                      : C.green
                    : "transparent",
                }}
              />
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
        {data.plan.map((id) => (
          <DrillRow
            key={id}
            duration={duration}
            drill={drills.find((d) => d.id === id)!}
            onPress={() => navigation.navigate("Detail", { id })}
          />
        ))}
      </View>
    </Page>
  );
}
export function Plan({ navigation }: { navigation: any }) {
  const { data } = useApp();
  const p = data.profile;
  const duration = time(Math.floor((p.minutes * 60 - 120) / data.plan.length));
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
          onPress={() =>
            navigation.navigate("Preferences", { section: "schedule" })
          }
        />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={s.h2}>Session drills</Text>
        <Text style={s.small}>Plus a 2-minute warm-up</Text>
        {data.plan.map((id, i) => (
          <DrillRow
            key={`${id}-${i}`}
            drill={drills.find((d) => d.id === id)!}
            duration={duration}
            onPress={() => navigation.navigate("Detail", { id })}
            trailing={
              <IconButton
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
                {p.days.includes(d) ? p.goal : "Rest"}
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
