import { haptic } from "../utils/haptics";
import { Text, View, ScrollView, Pressable } from "react-native";
import { Profile, days, goals, positions } from "../domain/model";
import { Chip, Choice } from "./ui";
import { useTheme } from "../theme/ThemeProvider";
export function PreferenceFields({
  profile,
  onChange,
  section = "all",
  explicitEquipment = false,
}: {
  profile: Partial<Profile>;
  onChange: (p: Partial<Profile>) => void;
  explicitEquipment?: boolean;
  section?: "all" | "position" | "goal" | "experience" | "schedule" | "setup";
}) {
  const { C, s } = useTheme();
  const set = <K extends keyof Profile>(
    key: K,
    value: Profile[K] | undefined,
  ) => onChange({ ...profile, [key]: value });
  const toggle = (key: "days" | "gear", v: string) => {
    const current = profile[key] ?? [];
    const next = current.includes(v)
      ? current.filter((x) => x !== v)
      : [...current, v];
    set(
      key,
      key === "gear" && explicitEquipment && next.length === 0
        ? undefined
        : next,
    );
  };
  return (
    <View style={{ gap: 28 }}>
      {section === "all" || section === "position" ? <View style={s.stack}>
        {section === "all" ? <Text style={s.h2}>Position</Text> : null}
        {positions.map((position) => <Choice key={position} label={position} selected={profile.position === position} detail={position === "Goalkeeper" ? "Ball work and distribution" : position === "Defender" ? "Receiving and playing out" : position === "Midfielder" ? "Passing and both-foot confidence" : position === "Forward" ? "Dribbling and close control" : "Keep your training balanced"} onPress={() => set("position", position)} />)}
        <Text style={s.small}>Your focus comes first. Position helps choose supporting drills.</Text>
      </View> : null}
      {section === "all" || section === "goal" ? (
        <View style={s.stack}>
          {section === "all" ? <Text style={s.h2}>Focus</Text> : null}
          {goals.map((g) => (
            <Choice
              key={g}
              label={g}
              detail={
                g === "Ball control"
                  ? "Close touches and receiving"
                  : g === "Dribbling"
                    ? "Turns and changes of direction"
                    : g === "Passing"
                      ? "Weight, accuracy and receiving"
                      : "Build confidence on both sides"
              }
              selected={profile.goal === g}
              onPress={() => set("goal", g)}
            />
          ))}
        </View>
      ) : null}
      {section === "all" || section === "experience" ? (
        <View style={s.stack}>
          {section === "all" ? <Text style={s.h2}>Experience</Text> : null}
          {["New to training", "Some experience"].map((v) => (
            <Choice
              key={v}
              label={v}
              detail={
                v === "New to training"
                  ? "Start with the foundations"
                  : "Build on a familiar routine"
              }
              selected={profile.experience === v}
              onPress={() => set("experience", v)}
            />
          ))}
        </View>
      ) : null}
      {section === "all" || section === "schedule" ? (
        <View style={{ gap: 20 }}>
          <View style={s.stack}>
            <Text style={s.h3}>Training days</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 2 }}
            >
              {days.map((d) => (
                <Pressable
                  key={d}
                  accessibilityRole="checkbox"
                  accessibilityLabel={d}
                  accessibilityState={{
                    checked: profile.days?.includes(d) ?? false,
                  }}
                  onPress={() => {
                    haptic(
                      profile.days?.includes(d) ? "toggle-off" : "toggle-on",
                    );
                    toggle("days", d);
                  }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      (profile.days?.includes(d) ?? false) ? C.green : C.white,
                  }}
                >
                  <Text
                    style={[
                      s.h3,
                      {
                        color:
                          (profile.days?.includes(d) ?? false)
                            ? C.onPrimary
                            : C.muted,
                      },
                    ]}
                  >
                    {d.slice(0, 1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {profile.days !== undefined && !profile.days.length ? (
              <Text style={[s.small, { color: C.danger }]}>
                Choose at least one day.
              </Text>
            ) : null}
          </View>
          <View style={s.stack}>
            <Text style={s.h3}>Session length</Text>
            <View style={s.row}>
              {[15, 20, 30].map((n) => (
                <View style={{ flex: 1 }} key={n}>
                  <Chip
                    label={`${n} min`}
                    selected={profile.minutes === n}
                    onPress={() => set("minutes", n)}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}
      {section === "all" || section === "setup" ? (
        <View style={{ gap: 24 }}>
          <View style={s.stack}>
            <Text style={s.h3}>Space</Text>
            {["Small space", "Open space"].map((v) => (
              <Choice
                key={v}
                label={v}
                detail={
                  v === "Small space"
                    ? "Room for a few steps and a turn"
                    : "Room to move between markers"
                }
                selected={profile.space === v}
                onPress={() => set("space", v)}
              />
            ))}
          </View>
          <View style={s.stack}>
            <Text style={s.h3}>Equipment</Text>
            <Text style={s.small}>
              A ball is included. Select your equipment.
            </Text>
            {explicitEquipment ? (
              <Choice
                label="Ball only"
                multiple
                selected={
                  profile.gear !== undefined && profile.gear.length === 0
                }
                onPress={() =>
                  set(
                    "gear",
                    profile.gear !== undefined && profile.gear.length === 0
                      ? undefined
                      : [],
                  )
                }
              />
            ) : null}
            {[
              ["markers", "Markers"],
              ["wall", "Safe wall"],
              ["partner", "A partner"],
            ].map(([v, l]) => (
              <Choice
                key={v}
                label={l}
                multiple
                selected={profile.gear?.includes(v) ?? false}
                onPress={() => toggle("gear", v)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function Preferences({
  profile,
  onChange,
  section = "all",
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
  section?: "all" | "position" | "goal" | "experience" | "schedule" | "setup";
}) {
  return (
    <PreferenceFields
      profile={profile}
      section={section}
      onChange={(p) => {
        if (
          p.goal !== undefined &&
          p.experience !== undefined &&
          p.days !== undefined &&
          p.minutes !== undefined &&
          p.gear !== undefined &&
          p.space !== undefined
        )
          onChange({
            ...(p.position !== undefined ? { position: p.position } : {}),
            goal: p.goal,
            experience: p.experience,
            days: p.days,
            minutes: p.minutes,
            gear: p.gear,
            space: p.space,
          });
      }}
    />
  );
}
