import { useEffect, useRef, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import { exportRawRecovery } from "../recovery/exportRaw";
import { Button } from "./ui";
import { useTheme } from "../theme/ThemeProvider";

/** Recovery actions are explicit; opening this screen never exports or resets data. */
export function RecoveryActions({
  readRaw,
  startFresh,
}: {
  readRaw: () => Promise<string>;
  startFresh: () => Promise<void>;
}) {
  const { C, s } = useTheme();
  const [busy, setBusy] = useState<"export" | "confirm" | "fresh" | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const finish = () => {
    locked.current = false;
    if (mounted.current) setBusy(null);
  };
  const exportData = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy("export");
    setError("");
    setStatus("");
    try {
      const result = await exportRawRecovery(await readRaw());
      if (mounted.current)
        setStatus(
          result === "download-requested"
            ? "Download requested. If you cancelled it, choose Export my data again. Your saved data is unchanged."
            : "Share sheet closed. If you cancelled or did not save a copy, choose Export my data again. Your saved data is unchanged.",
        );
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not export raw data. Try again. Your saved data is unchanged.",
        );
    } finally {
      finish();
    }
  };
  const confirmFresh = () => {
    if (locked.current) return;
    locked.current = true;
    setBusy("confirm");
    setError("");
    setStatus("");
    const cancel = () => {
      if (mounted.current) setStatus("Cancelled. Your saved data is unchanged.");
      finish();
    };
    const proceed = async () => {
      if (mounted.current) setBusy("fresh");
      try {
        await startFresh();
      } catch (cause) {
        if (mounted.current)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not start fresh safely. Try again.",
          );
      } finally {
        finish();
      }
    };
    const message =
      "Replace your active training with a new setup? A verified raw backup stays on this device. Export a copy first if you want one outside the app.";
    if (Platform.OS === "web") {
      try {
        if (window.confirm(message)) void proceed();
        else cancel();
      } catch {
        cancel();
      }
      return;
    }
    let decided = false;
    Alert.alert(
      "Start fresh?",
      message,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            decided = true;
            cancel();
          },
        },
        {
          text: "Start fresh",
          style: "destructive",
          onPress: () => {
            decided = true;
            void proceed();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          if (!decided) cancel();
        },
      },
    );
  };
  return (
    <View style={{ gap: 12 }}>
      <Button
        label={busy === "export" ? "Preparing export…" : "Export my data"}
        disabled={busy !== null}
        kind="secondary"
        onPress={() => void exportData()}
      />
      <Button
        label={busy === "fresh" ? "Starting fresh…" : "Start fresh (keeps a backup)"}
        disabled={busy !== null}
        kind="secondary"
        onPress={confirmFresh}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[s.small, { color: C.danger }]}>
          {error}
        </Text>
      ) : null}
      {status ? (
        <Text accessibilityRole="alert" style={s.small}>
          {status}
        </Text>
      ) : null}
    </View>
  );
}
