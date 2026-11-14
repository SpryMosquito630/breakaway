import { memo, useId } from "react";
import Svg, { Circle, Defs, Line, Marker, Path, Rect } from "react-native-svg";
import { drillMovements } from "../data/drill-movements";
import { useTheme } from "../theme/ThemeProvider";

/** Static authored paths only: no player, animation, timer or inferred technique. */
export const DrillMovementThumbnail = memo(function DrillMovementThumbnail({
  drillId,
}: {
  drillId: string;
}) {
  const { C } = useTheme();
  const markerId = `thumb-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const movement = drillMovements[drillId];
  if (!movement) return null;
  const stationaryBall = drillId === "toe-taps" || drillId === "step-over";
  const ballX = stationaryBall ? 160 : Number(movement.path.match(/M(\d+)/)?.[1] ?? 100);
  const ballY =
    drillId === "toe-taps"
      ? 95
      : drillId === "step-over"
        ? 100
        : Number(movement.path.match(/M\d+ (\d+)/)?.[1] ?? 140);
  const gates =
    drillId === "gates"
      ? [
          [125, 70],
          [195, 70],
          [65, 100],
          [120, 130],
          [200, 130],
          [245, 95],
          [220, 40],
          [265, 60],
        ]
      : [
          [125, 70],
          [195, 70],
        ];
  return (
    <Svg width={100} height={76} viewBox="40 10 240 160" accessible={false}>
      <Defs>
        <Marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth={14}
          markerHeight={14}
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <Path d="M0 0 L10 5 L0 10 Z" fill={C.green} />
        </Marker>
      </Defs>
      {movement.equipment === "wall" ? (
        <Line x1={70} y1={28} x2={245} y2={28} stroke={C.green} strokeWidth={9} />
      ) : null}
      {movement.equipment === "partner" ? (
        <Circle cx={230} cy={38} r={12} stroke={C.green} strokeWidth={4} fill="none" />
      ) : null}
      {movement.equipment === "gate"
        ? gates.map(([x, y], i) => (
            <Rect key={i} x={x} y={y} width={9} height={9} fill={C.green} />
          ))
        : null}
      {movement.equipment === "slalom"
        ? [45, 75, 105, 135].map((y) => (
            <Rect key={y} x={150} y={y} width={9} height={9} fill={C.green} />
          ))
        : null}
      <Path
        d={movement.path}
        stroke={C.green}
        strokeWidth={5}
        fill="none"
        markerEnd={`url(#${markerId})`}
      />
      {movement.footPath ? (
        <Path
          d={movement.footPath}
          stroke={C.green}
          strokeWidth={4}
          strokeDasharray="7 5"
          fill="none"
          markerEnd={`url(#${markerId})`}
        />
      ) : null}
      <Circle
        cx={ballX}
        cy={ballY}
        r={10}
        stroke={C.green}
        strokeWidth={3}
        fill={C.white}
      />
    </Svg>
  );
});
