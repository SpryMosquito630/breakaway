import { StyleSheet } from "react-native";
import Svg, { Circle, Line, Rect, Text as SvgText } from "react-native-svg";
import type { JointResult } from "../coachAi/service";
import { BODY_EDGES, shotPoseAt, visibleJoint } from "../domain/shotPose";

export function ShotPoseOverlay({
  pose,
  time,
  labels,
  kickingFoot,
}: {
  pose: JointResult;
  time: number;
  labels: boolean;
  kickingFoot: "left" | "right" | null;
}) {
  const frame = shotPoseAt(pose, time);
  if (!frame) return null;
  const points = frame.joints;
  const font = Math.max(13, pose.width / 34);
  const callouts = [
    { label: "Torso lean", a: 11, b: 23, side: "left" },
    { label: "Arm position", a: 14, b: 16, side: "right" },
    ...(kickingFoot
      ? [
          {
            label: "Kicking knee",
            a: kickingFoot === "right" ? 26 : 25,
            b: kickingFoot === "right" ? 24 : 23,
            side: "right",
          },
          {
            label: "Support leg",
            a: kickingFoot === "right" ? 25 : 26,
            b: kickingFoot === "right" ? 27 : 28,
            side: "left",
          },
        ]
      : []),
  ];
  return (
    <Svg
      width="100%"
      height="100%"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      viewBox={`0 0 ${pose.width} ${pose.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={StyleSheet.absoluteFill}
    >
      {BODY_EDGES.map(([a, b]) =>
        visibleJoint(points[a]) && visibleJoint(points[b]) ? (
          <Line
            key={`${a}-${b}`}
            x1={points[a]!.x * pose.width}
            y1={points[a]!.y * pose.height}
            x2={points[b]!.x * pose.width}
            y2={points[b]!.y * pose.height}
            stroke="#C6EF2E"
            strokeWidth={Math.max(2, pose.width / 220)}
          />
        ) : null,
      )}
      {points.map((point, index) =>
        index >= 11 && visibleJoint(point) ? (
          <Circle
            key={index}
            cx={point.x * pose.width}
            cy={point.y * pose.height}
            r={Math.max(3, pose.width / 140)}
            fill="#C6EF2E"
            stroke="#10271D"
            strokeWidth={1}
          />
        ) : null,
      )}
      {labels
        ? callouts.map((item, index) => {
            const a = points[item.a],
              b = points[item.b];
            if (!visibleJoint(a) || !visibleJoint(b)) return null;
            const x = ((a.x + b.x) / 2) * pose.width,
              y = ((a.y + b.y) / 2) * pose.height;
            const width = font * (item.label.length * 0.59 + 1.2);
            const labelX =
              item.side === "left" ? font * 0.4 : pose.width - width - font * 0.4;
            const labelY =
              pose.height * (index < 2 ? 0.15 + index * 0.16 : 0.62 + (index - 2) * 0.16);
            return (
              <SvgTextCallout
                key={item.label}
                {...{ x, y, width, labelX, labelY, font }}
                label={item.label}
              />
            );
          })
        : null}
    </Svg>
  );
}
function SvgTextCallout({
  x,
  y,
  width,
  labelX,
  labelY,
  font,
  label,
}: {
  x: number;
  y: number;
  width: number;
  labelX: number;
  labelY: number;
  font: number;
  label: string;
}) {
  return (
    <>
      <Line
        x1={x}
        y1={y}
        x2={labelX + width / 2}
        y2={labelY}
        stroke="#FFFFFF"
        strokeWidth={Math.max(1, font / 14)}
      />
      <Rect
        x={labelX}
        y={labelY - font}
        width={width}
        height={font * 1.7}
        rx={font * 0.25}
        fill="#10271D"
        fillOpacity={0.92}
      />
      <SvgText
        x={labelX + font * 0.5}
        y={labelY + font * 0.2}
        fill="#FFFFFF"
        fontSize={font}
        fontWeight="600"
      >
        {label}
      </SvgText>
    </>
  );
}
