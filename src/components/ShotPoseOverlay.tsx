import { useState } from "react";
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
  const [viewport, setViewport] = useState({ width: 350, height: 420 });
  const frame = shotPoseAt(pose, time);
  if (!frame) return null;
  const points = frame.joints;
  // Match VideoView's contain transform. Labels stay >=14.5 rendered points,
  // including portrait footage letterboxed inside a shorter review viewport.
  const scale = Math.max(
    0.001,
    Math.min(viewport.width / pose.width, viewport.height / pose.height),
  );
  const font = 14.5 / scale;
  const callouts = [
    { label: "Torso lean", a: 11, b: 23, side: "left", position: 0.22 },
    { label: "Arm position", a: 14, b: 16, side: "left", position: 0.42 },
    ...(kickingFoot
      ? [
          {
            label: "Kicking knee",
            a: kickingFoot === "right" ? 26 : 25,
            b: kickingFoot === "right" ? 24 : 23,
            side: "right",
            position: 0.62,
          },
          {
            label: "Support leg",
            a: kickingFoot === "right" ? 25 : 26,
            b: kickingFoot === "right" ? 27 : 28,
            side: "left",
            position: 0.81,
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
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (
          width > 0 &&
          height > 0 &&
          (width !== viewport.width || height !== viewport.height)
        )
          setViewport({ width, height });
      }}
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
            stroke="#B6FF00"
            strokeWidth={2.3 / scale}
          />
        ) : null,
      )}
      {points.map((point, index) =>
        index >= 11 && visibleJoint(point) ? (
          <Circle
            key={index}
            cx={point.x * pose.width}
            cy={point.y * pose.height}
            r={3.1 / scale}
            fill="#B6FF00"
            stroke="#10271D"
            strokeWidth={0.8 / scale}
          />
        ) : null,
      )}
      {labels
        ? callouts.map((item) => {
            const a = points[item.a],
              b = points[item.b];
            if (!visibleJoint(a) || !visibleJoint(b)) return null;
            const x = ((a.x + b.x) / 2) * pose.width,
              y = ((a.y + b.y) / 2) * pose.height;
            const width = font * (item.label.length * 0.54 + 1.45);
            const height = font * 2.1;
            const margin = font * 0.35;
            const labelX = item.side === "left" ? margin : pose.width - width - margin;
            const labelY = Math.max(
              margin,
              Math.min(pose.height - height - margin, pose.height * item.position),
            );
            const endX =
              x < labelX
                ? labelX
                : x > labelX + width
                  ? labelX + width
                  : labelX + width / 2;
            return (
              <SvgTextCallout
                key={item.label}
                {...{ x, y, width, height, labelX, labelY, font, endX, scale }}
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
  height,
  labelX,
  labelY,
  font,
  label,
  endX,
  scale,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  labelX: number;
  labelY: number;
  font: number;
  label: string;
  endX: number;
  scale: number;
}) {
  return (
    <>
      <Line
        x1={x}
        y1={y}
        x2={endX}
        y2={labelY + height / 2}
        stroke="#B6FF00"
        strokeWidth={1.6 / scale}
      />
      <Circle
        cx={x}
        cy={y}
        r={3.4 / scale}
        fill="#B6FF00"
        stroke="#10271D"
        strokeWidth={1.8 / scale}
      />
      <Rect
        x={labelX}
        y={labelY}
        width={width}
        height={height}
        rx={height / 2}
        fill="#FFFFFF"
        stroke="#B6FF00"
        strokeWidth={1.5 / scale}
      />
      <SvgText
        x={labelX + width / 2}
        y={labelY + height / 2 + font * 0.34}
        textAnchor="middle"
        fill="#14231C"
        fontSize={font}
        fontFamily="Archivo_600SemiBold"
        fontWeight="600"
      >
        {label}
      </SvgText>
    </>
  );
}
