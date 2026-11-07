import { Text, View } from "react-native";
import Svg, { Circle, Defs, Line, Marker, Path, Rect } from "react-native-svg";
import { type Drill } from "../domain/model";
import { drillMovements } from "../data/drill-movements";
import { useTheme } from "./ui";
export function DrillMovement({ drill }: { drill: Drill }) {
  const { C, s } = useTheme();
  const movement = drillMovements[drill.id];
  if (!movement) return null;
  return <View style={{ gap: 8 }}>
    <Text style={s.small}>Movement diagram · top view</Text>
    <View accessible accessibilityLabel={`${drill.name}: ${movement.caption}`} style={{ backgroundColor: C.pitchSoft, borderRadius: 12 }}>
      <Svg width="100%" height={170} viewBox="0 0 320 180">
        <Defs><Marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><Path d="M0 0 L10 5 L0 10 Z" fill={C.green} /></Marker></Defs>
        {movement.equipment === "wall" ? <Line x1={70} y1={28} x2={245} y2={28} strokeWidth={8} stroke={C.green} /> : null}
        {movement.equipment === "partner" ? <Circle cx={230} cy={38} r={12} stroke={C.green} strokeWidth={3} fill="none" /> : null}
        {movement.equipment === "gate" ? <>{[[125, 70], [195, 70], ...(drill.id === "gates" ? [[65, 100], [120, 130], [200, 130], [245, 95], [220, 40], [265, 60]] : [])].map(([x,y],i) => <Rect key={i} x={x} y={y} width={8} height={8} fill={C.green} />)}</> : null}
        {movement.equipment === "slalom" ? <>{[45,75,105,135].map(y => <Rect key={y} x={150} y={y} width={8} height={8} fill={C.green} />)}</> : null}
        <Path d={movement.path} stroke={C.green} strokeWidth={3} fill="none" markerEnd="url(#arrow)" />
        {movement.footPath ? <Path d={movement.footPath} stroke={C.green} strokeWidth={2} strokeDasharray="5 4" fill="none" markerEnd="url(#arrow)" /> : null}
        <Circle cx={drill.id === "toe-taps" || drill.id === "step-over" ? 160 : Number(movement.path.match(/M(\d+)/)?.[1] ?? 100)} cy={drill.id === "toe-taps" || drill.id === "step-over" ? 100 : Number(movement.path.match(/M\d+ (\d+)/)?.[1] ?? 140)} r={8} stroke={C.green} strokeWidth={2} fill={C.white} />
      </Svg>
    </View>
    <Text style={s.body}>{movement.caption}</Text>
    <Text style={s.small}>Solid arrow: ball path{movement.footPath ? " · Dashed arrow: foot movement" : ""}. Follow the steps for foot placement; diagram is not to scale.</Text>
  </View>;
}
