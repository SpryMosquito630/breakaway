import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { days, type Profile } from "../domain/model";
import { useTheme } from "../theme/ThemeProvider";

type Props = {
  now: Date;
  scheduledDays: Profile["days"];
  completedDays: Profile["days"];
  count: number;
  target: number;
  onEdit: () => void;
};

/** One schedule control; individual dates are status indicators, not tiny buttons. */
export function WeeklyCalendar({
  now,
  scheduledDays,
  completedDays,
  count,
  target,
  onEdit,
}: Props) {
  const { C } = useTheme();
  const todayIndex = (now.getDay() + 6) % 7;
  const week = days.map((day, index) => {
    // Calendar arithmetic preserves local dates through DST and month/year changes.
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - todayIndex + index,
      12,
    );
    return {
      day,
      date,
      today: index === todayIndex,
      past: index < todayIndex,
      planned: scheduledDays.includes(day),
      complete: completedDays.includes(day),
    };
  });
  const description = week
    .map(
      ({ date, today, planned, complete }) =>
        `${date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}${today ? ", today" : ""}, ${complete ? "completed" : planned ? "planned" : "rest day"}`,
    )
    .join(". ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit weekly schedule. ${count} of ${target} sessions complete this week. ${description}`}
      accessibilityHint="Opens your training schedule preferences"
      onPress={onEdit}
      style={({ pressed }) => [styles.control, { opacity: pressed ? 0.65 : 1 }]}
    >
      <View style={styles.week}>
        {week.map(({ day, date, today, past, planned, complete }) => (
          <View key={day} style={styles.day}>
            <Text
              style={[
                styles.weekday,
                { color: today ? C.ink : C.muted },
                planned && { fontFamily: "Archivo_500Medium" },
                today && styles.todayText,
              ]}
            >
              {day}
            </Text>
            <View
              style={[
                styles.date,
                {
                  // Only today gets the reference's quiet neutral circle.
                  // Planned/rest status must not change date shading.
                  borderColor: "transparent",
                  backgroundColor: today ? C.line : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.dateText,
                  { color: today || past || complete ? C.ink : C.muted },
                  today && styles.todayText,
                ]}
              >
                {date.getDate()}
              </Text>
              {complete ? (
                <View
                  style={[
                    styles.completed,
                    { backgroundColor: C.green, borderColor: C.bg },
                  ]}
                >
                  <Check size={14} strokeWidth={3} color={C.onPrimary} />
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: { minHeight: 76, paddingTop: 4 },
  week: { flexDirection: "row" },
  day: { flex: 1, minWidth: 0, alignItems: "center", gap: 7 },
  weekday: { fontFamily: "Archivo_400Regular", fontSize: 12, lineHeight: 16 },
  date: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: { fontFamily: "Archivo_500Medium", fontSize: 14, lineHeight: 18 },
  todayText: { fontFamily: "Archivo_700Bold" },
  completed: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
