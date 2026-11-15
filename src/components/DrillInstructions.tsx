import { Text, View } from "react-native";
import { type Drill } from "../domain/model";
import { drillDemos } from "../data/drill-demos";
import { drillMovements } from "../data/drill-movements";
import { drillInstructions } from "../data/drill-instruction";
import { DrillDemo, DrillDemoCredit } from "./DrillDemo";
import { DrillMovement } from "./DrillMovement";
import { Disclosure, Steps, useTheme } from "./ui";

/** Pre-practice learning only. Never mount a player under a running timer. */
export function DrillInstructions({ drill, note }: { drill: Drill; note?: string }) {
  const { s } = useTheme();
  const instruction = drillInstructions[drill.id];
  const filmed = Boolean(drillDemos[drill.id]);
  return (
    <View style={{ gap: 12 }}>
      {filmed ? (
        <DrillDemo key={drill.id} id={drill.id} expanded />
      ) : (
        <DrillMovement drill={drill} compact />
      )}
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
        {filmed ? (
          <DrillMovement drill={drill} />
        ) : drillMovements[drill.id] ? (
          <Text style={s.small}>{drillMovements[drill.id].caption}</Text>
        ) : null}
        {filmed ? <DrillDemoCredit id={drill.id} /> : null}
      </Disclosure>
    </View>
  );
}
