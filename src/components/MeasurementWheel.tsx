import { useEffect, useId, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  createWheelSelection,
  measurementRowHeight,
  type MeasurementKind,
} from "../domain/measurementWheel";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { haptic } from "../utils/haptics";

export function MeasurementWheel({
  kind,
  label,
  unit,
  values,
  value,
  onChange,
  onInteractionChange,
  showReadout = true,
  formatValue = (number: number) => String(number),
  rowHeight = measurementRowHeight,
}: {
  kind: MeasurementKind;
  label: string;
  unit: string;
  values: readonly number[];
  value?: number;
  onChange: (value: number) => void;
  onInteractionChange: (active: boolean) => void;
  showReadout?: boolean;
  formatValue?: (number: number) => string;
  rowHeight?: number;
}) {
  const fadeId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const interaction = useRef(onInteractionChange);
  interaction.current = onInteractionChange;
  const [selection] = useState(() =>
    createWheelSelection(
      values,
      (selected) => {
        haptic("selection");
        change.current(selected);
      },
      rowHeight,
    ),
  );
  const [initialOffset] = useState(() => selection.position(value));
  const offset = useRef(initialOffset);
  const touched = useRef(false);
  const dragging = useRef(false);
  const initialized = useRef(false);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearIdle = () => {
    if (idle.current !== undefined) clearTimeout(idle.current);
    idle.current = undefined;
  };
  const begin = () => {
    touched.current = true;
    selection.begin();
    interaction.current(true);
    clearIdle();
  };
  const finish = () => {
    clearIdle();
    const y = selection.finish(offset.current);
    offset.current = y;
    scroll.current?.scrollTo({ y, animated: false });
    interaction.current(false);
  };
  const settleWhenIdle = () => {
    clearIdle();
    idle.current = setTimeout(finish, 160);
  };
  const sync = () => {
    if (initialized.current || touched.current) return;
    initialized.current = true;
    scroll.current?.scrollTo({ y: initialOffset, animated: false });
  };
  useEffect(
    () => () => {
      clearIdle();
      selection.cancel();
      interaction.current(false);
    },
    [],
  );
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 10 }}>
      {showReadout ? (
        <>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.readout}>
            {value === undefined ? "–" : formatValue(value)}
          </Text>
          <Text style={styles.unit}>{unit}</Text>
        </>
      ) : null}
      <View style={{ height: rowHeight * 3, width: "100%" }}>
        <View
          pointerEvents="none"
          style={[styles.center, { top: rowHeight, height: rowHeight }]}
        />
        <ScrollView
          ref={scroll}
          nestedScrollEnabled
          style={{ height: rowHeight * 3, width: "100%" }}
          contentContainerStyle={{ paddingVertical: rowHeight }}
          showsVerticalScrollIndicator={false}
          snapToInterval={rowHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          bounces={false}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          accessibilityLabel={`${kind}, scroll or tap to choose ${unit}`}
          onContentSizeChange={sync}
          onTouchStart={() => {
            dragging.current = true;
            begin();
          }}
          onTouchEnd={() => {
            dragging.current = false;
            settleWhenIdle();
          }}
          onTouchCancel={() => {
            dragging.current = false;
            clearIdle();
            selection.cancel();
            finish();
          }}
          onScrollBeginDrag={() => {
            dragging.current = true;
            begin();
          }}
          onScrollEndDrag={(event) => {
            dragging.current = false;
            offset.current = event.nativeEvent.contentOffset.y;
            selection.move(offset.current);
            settleWhenIdle();
          }}
          onMomentumScrollEnd={(event) => {
            offset.current = event.nativeEvent.contentOffset.y;
            finish();
          }}
          onScroll={(event) => {
            offset.current = event.nativeEvent.contentOffset.y;
            selection.move(offset.current);
            if (selection.active && !dragging.current) settleWhenIdle();
          }}
          {...(Platform.OS === "web" ? { onWheel: begin } : {})}
        >
          {values.map((n) => (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityLabel={`${n} ${unit}`}
              accessibilityState={{ checked: value === n, selected: value === n }}
              aria-checked={value === n}
              onPress={() => {
                clearIdle();
                touched.current = true;
                const y = selection.tap(n);
                offset.current = y;
                scroll.current?.scrollTo({ y, animated: false });
                interaction.current(false);
              }}
              hitSlop={4}
              style={[styles.row, { height: rowHeight }]}
            >
              <Text style={[styles.value, value === n && { color: "#F7FAF2" }]}>
                {formatValue(n)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width="100%"
          height={rowHeight * 3}
        >
          <Defs>
            <LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#080F0B" stopOpacity={0.9} />
              <Stop offset="0.34" stopColor="#080F0B" stopOpacity={0} />
              <Stop offset="0.66" stopColor="#080F0B" stopOpacity={0} />
              <Stop offset="1" stopColor="#080F0B" stopOpacity={0.9} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${fadeId})`} />
        </Svg>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  label: {
    fontFamily: "Archivo_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1,
    color: "#ADB7A8",
  },
  readout: {
    fontFamily: "Archivo_700Bold",
    fontSize: 38,
    lineHeight: 44,
    color: "#F7FAF2",
  },
  unit: {
    fontFamily: "Archivo_400Regular",
    fontSize: 12,
    lineHeight: 22,
    color: "#B6FF3B",
  },
  center: {
    position: "absolute",
    width: "100%",
    borderRadius: 18,
    backgroundColor: "#1B241D",
  },
  row: {
    height: measurementRowHeight,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontFamily: "Archivo_400Regular",
    fontSize: 20,
    lineHeight: 26,
    color: "#ADB7A8",
  },
});
