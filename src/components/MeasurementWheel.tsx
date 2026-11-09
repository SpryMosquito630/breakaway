import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  createWheelSelection,
  measurementRowHeight,
  type MeasurementKind,
} from "../domain/measurementWheel";
import { haptic } from "../utils/haptics";

export function MeasurementWheel({
  kind,
  label,
  unit,
  values,
  value,
  onChange,
  onInteractionChange,
}: {
  kind: MeasurementKind;
  label: string;
  unit: string;
  values: readonly number[];
  value?: number;
  onChange: (value: number) => void;
  onInteractionChange: (active: boolean) => void;
}) {
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const interaction = useRef(onInteractionChange);
  interaction.current = onInteractionChange;
  const [selection] = useState(() =>
    createWheelSelection(values, (selected) => {
      haptic("selection");
      change.current(selected);
    }),
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
      interaction.current(false);
    },
    [],
  );
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.readout}>{value === undefined ? "–" : value}</Text>
      <Text style={styles.unit}>{unit}</Text>
      <View style={{ height: measurementRowHeight * 3, width: "100%" }}>
        <View
          pointerEvents="none"
          style={[styles.center, value !== undefined && { backgroundColor: "#263A17" }]}
        />
        <ScrollView
          ref={scroll}
          nestedScrollEnabled
          style={{ height: measurementRowHeight * 3, width: "100%" }}
          contentContainerStyle={{ paddingVertical: measurementRowHeight }}
          showsVerticalScrollIndicator={false}
          snapToInterval={measurementRowHeight}
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
              style={styles.row}
            >
              <Text style={[styles.value, value === n && { color: "#F7FAF2" }]}>{n}</Text>
            </Pressable>
          ))}
        </ScrollView>
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
    top: measurementRowHeight,
    height: measurementRowHeight,
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#35432F",
  },
  row: {
    height: measurementRowHeight,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontFamily: "Archivo_400Regular",
    fontSize: 22,
    lineHeight: 28,
    color: "#ADB7A8",
  },
});
