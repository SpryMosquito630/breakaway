import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { ArrowLeft, ArrowRight, Check } from "lucide-react-native";
import { useApp } from "../state/AppState";
import { matchPlan, time, getDrillDuration, completeOnboarding } from "../domain/model";
import {
  OnboardingDraft,
  isOnboardingStepReady,
  profileFromDraft,
} from "../domain/onboarding";
import { planForDate } from "../domain/planning";
import { Page, Title, Button, IconButton, Choice } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { PreferenceFields } from "../components/Preferences";
export function Onboarding({
  onComplete,
  replay = false,
}: { onComplete?: () => void; replay?: boolean } = {}) {
  const { C, s } = useTheme();
  const { data, update, catalog: drills } = useApp();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const profile = profileFromDraft(draft);
  const sections = ["position", "goal", "experience", "schedule", "setup"] as const;
  const titles = [
    "",
    "How old are you?",
    "Where do you usually play?",
    "What do you want to work on?",
    "Your training experience",
    "When can you practice?",
    "What’s your setup?",
    "Your starting session",
  ];
  const nextData = profile
    ? completeOnboarding(data, profile, matchPlan(drills, profile), replay)
    : null;
  const ids = nextData
    ? planForDate(
        drills,
        nextData.profile,
        nextData.plan,
        new Date(),
        nextData.planCustomized,
      )
    : [];
  const finish = () => {
    const complete = profileFromDraft(draft);
    if (!complete) return;
    update((st) =>
      completeOnboarding(
        st,
        {
          ...complete,
          ageBand: st.profile.ageBand === "under13" ? "under13" : complete.ageBand,
        },
        matchPlan(drills, complete),
        replay,
      ),
    );
    onComplete?.();
  };
  const proceed = () => {
    if (!isOnboardingStepReady(draft, step)) return;
    if (step === 7) finish();
    else setStep(step + 1);
  };
  const footer = (
    <Button
      label={step === 0 ? "Get started" : step === 7 ? "Use this plan" : "Continue"}
      icon={ArrowRight}
      feedback={step === 7 ? "success" : "medium"}
      disabled={!isOnboardingStepReady(draft, step)}
      onPress={proceed}
    />
  );
  if (step === 0)
    return (
      <Page footer={footer} contentStyle={{ gap: 24, paddingTop: 16 }}>
        <Text
          style={{
            fontFamily: "BarlowCondensed_800ExtraBold",
            fontSize: 30,
            lineHeight: 34,
            color: C.green,
          }}
        >
          Breakaway
        </Text>
        <Image
          source={require("../../assets/training-editorial.webp")}
          contentFit="cover"
          contentPosition={{ left: "50%", top: "75%" }}
          accessibilityLabel="Soccer player controlling a ball on a grass pitch"
          style={{
            height: 340,
            borderRadius: 18,
            backgroundColor: C.pitchSoft,
          }}
        />
        <View style={{ gap: 10 }}>
          <Text
            style={{
              fontFamily: "Archivo_600SemiBold",
              fontSize: 30,
              lineHeight: 37,
              letterSpacing: -1,
              color: C.ink,
            }}
          >
            Make time{`\n`}for your game.
          </Text>
          <Text style={s.body}>
            Short sessions built around your space and your goals.
          </Text>
        </View>
      </Page>
    );
  return (
    <Page footer={footer} contentStyle={{ gap: 24 }}>
      <View style={[s.row, { marginLeft: -12 }]}>
        <IconButton label="Back" icon={ArrowLeft} onPress={() => setStep(step - 1)} />
        <Text style={s.small}>{step} of 7</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <View
            key={n}
            style={{
              height: 3,
              flex: 1,
              backgroundColor: n <= step ? C.green : C.line,
              borderRadius: 2,
            }}
          />
        ))}
      </View>
      <Title title={titles[step]} />
      {step === 1 ? (
        <View style={{ gap: 12 }}>
          {(
            [
              ["under13", "Under 13"],
              ["13to17", "13–17"],
              ["adult", "18 or older"],
            ] as const
          ).map(([value, label]) => (
            <Choice
              key={value}
              label={label}
              selected={draft.ageBand === value}
              onPress={() => setDraft({ ...draft, ageBand: value })}
            />
          ))}
          <Text style={s.small}>
            Your age range stays on this device. Training works without an account.
          </Text>
        </View>
      ) : step < 7 ? (
        <PreferenceFields
          profile={draft}
          onChange={setDraft}
          explicitEquipment
          section={sections[step - 2]}
        />
      ) : profile ? (
        <>
          <View style={[s.row, { paddingVertical: 8 }]}>
            <View style={{ gap: 6 }}>
              <Text style={s.h2}>{profile.goal}</Text>
              <Text style={s.small}>{profile.position}</Text>
              <Text style={s.body}>
                {profile.minutes} min · {profile.days.join(", ")}
              </Text>
              <Text style={s.small}>
                {profile.space} ·{" "}
                {profile.gear.length ? profile.gear.join(" + ") : "Ball only"}
              </Text>
            </View>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: C.pitchSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={22} color={C.green} />
            </View>
          </View>
          <View>
            {ids.map((id) => (
              <View
                key={id}
                style={{
                  minHeight: 64,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottomWidth: 1,
                  borderColor: C.line,
                }}
              >
                <Text style={s.h3}>{drills.find((d) => d.id === id)!.name}</Text>
                <Text style={s.small}>
                  {time(getDrillDuration(profile.minutes, ids.length))}
                </Text>
              </View>
            ))}
          </View>
          <Text style={s.small}>
            Includes a 2-minute warm-up.{" "}
            {nextData?.planCustomized
              ? "Your custom drill choices stay in place."
              : "Your focus leads; position helps choose supporting drills."}{" "}
            You can swap drills anytime.
          </Text>
        </>
      ) : null}
    </Page>
  );
}

export function ReplayOnboarding({ navigation }: { navigation: any }) {
  return <Onboarding replay onComplete={() => navigation.goBack()} />;
}
