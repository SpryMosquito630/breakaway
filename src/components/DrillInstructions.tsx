import { Linking, Text, View } from "react-native";
import { Image } from "expo-image";
import { useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { type Drill } from "../domain/model";
import { drillDemos } from "../data/drill-demos";
import { drillPhotos } from "../data/drill-media";
import { drillMovements } from "../data/drill-movements";
import { drillInstructions } from "../data/drill-instruction";
import { DrillDemo, DrillDemoCredit } from "./DrillDemo";
import { DrillMovement } from "./DrillMovement";
import { AnimatedDrillGuide } from "./AnimatedDrillGuide";
import { Chip, Disclosure, Link, Steps, useTheme } from "./ui";

/** Pre-practice learning only. Never mount a player under a running timer. */
export function DrillInstructions({ drill, note }: { drill: Drill; note?: string }) {
  const { C, s } = useTheme();
  const [creditError, setCreditError] = useState("");
  const photo = drillPhotos[drill.id];
  const focused = useIsFocused();
  const [showGuide, setShowGuide] = useState(false);
  const openCredit = (url: string) => {
    setCreditError("");
    void Linking.openURL(url).catch(() => setCreditError("Could not open the link."));
  };
  const instruction = drillInstructions[drill.id];
  const filmed = Boolean(drillDemos[drill.id]);
  return (
    <View style={{ gap: 12 }}>
      {filmed ? (
        <DrillDemo key={drill.id} id={drill.id} expanded />
      ) : drillMovements[drill.id] && (showGuide || !photo) ? (
        <AnimatedDrillGuide
          key={drill.id}
          drillId={drill.id}
          active={focused}
          compact
          autoPlay={showGuide}
        />
      ) : photo ? (
        <View style={{ gap: 6 }}>
          <Image
            source={photo.source}
            contentFit="cover"
            accessibilityLabel={photo.description}
            style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 12 }}
          />
        </View>
      ) : (
        <DrillMovement drill={drill} compact />
      )}
      {!filmed && photo && drillMovements[drill.id] ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip label="Photo" selected={!showGuide} onPress={() => setShowGuide(false)} />
          <Chip
            label="Movement guide"
            selected={showGuide}
            onPress={() => setShowGuide(true)}
          />
        </View>
      ) : null}
      <Text style={s.body}>{instruction?.watch ?? drill.cue}</Text>
      <Disclosure label="Instructions & notes">
        <Steps drill={drill} />
        {instruction ? (
          <Text style={s.body}>
            <Text style={s.h3}>Common mistake: </Text>
            {instruction.mistake}
          </Text>
        ) : null}
        <Text style={s.small}>{drill.tip}</Text>
        {note ? <Text style={s.small}>{note}</Text> : null}
        {!filmed && drillMovements[drill.id] ? (
          <Text style={s.small}>
            Animated guides illustrate the written ball and foot paths from above, rather
            than filmed technique. Follow the selected stage’s steps and spacing.
          </Text>
        ) : null}
        {filmed ? (
          <DrillMovement drill={drill} />
        ) : drillMovements[drill.id] ? (
          <Text style={s.small}>{drillMovements[drill.id].caption}</Text>
        ) : null}
        {filmed ? (
          <DrillDemoCredit id={drill.id} />
        ) : photo ? (
          <View style={{ gap: 8 }}>
            <Text style={s.small}>
              {photo.credit} · Training context photo, not a movement demonstration.
            </Text>
            <Link label="Photo source" onPress={() => openCredit(photo.page)} />
            <Link label="Photo license" onPress={() => openCredit(photo.license)} />
            {creditError ? (
              <Text accessibilityRole="alert" style={[s.small, { color: C.danger }]}>
                {creditError}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Disclosure>
    </View>
  );
}
