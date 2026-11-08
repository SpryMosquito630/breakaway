import { Text, View } from "react-native";
import { type Drill } from "../domain/model";
import { drillDemos } from "../data/drill-demos";
import { drillMovements } from "../data/drill-movements";
import { drillInstructions } from "../data/drill-instruction";
import { DrillDemo, DrillDemoCredit } from "./DrillDemo";
import { DrillMovement } from "./DrillMovement";
import { Disclosure, Steps, useTheme } from "./ui";

/** Pre-practice learning only. Never mount a player under a running timer. */
export function DrillInstructions({ drill }: { drill: Drill }) {
  const { s } = useTheme();
  const instruction = drillInstructions[drill.id];
  const filmed = Boolean(drillDemos[drill.id]);
  return (
    <View style={{ gap: 12 }}>
      {filmed ? (
        <DrillDemo key={drill.id} id={drill.id} expanded />
      ) : (
        <DrillMovement drill={drill} />
      )}
      {!filmed && !drillMovements[drill.id] ? (
        <Text style={s.h3}>Written guide</Text>
      ) : null}
      <View style={{ gap: 8 }}>
        <Text style={s.body}>
          <Text style={s.h3}>Focus: </Text>
          {instruction?.watch ?? drill.cue}
        </Text>
        {instruction ? (
          <Text style={s.body}>
            <Text style={s.h3}>Common mistake: </Text>
            {instruction.mistake}
          </Text>
        ) : null}
      </View>
      <Disclosure label="Step-by-step instructions">
        <Steps drill={drill} />
        <Text style={s.small}>{drill.tip}</Text>
        {filmed ? <DrillMovement drill={drill} /> : null}
      </Disclosure>
      {filmed ? <DrillDemoCredit id={drill.id} /> : null}
    </View>
  );
}
