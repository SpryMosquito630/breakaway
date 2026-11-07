import { useEffect, useRef, useState } from "react";
import { AppState, Modal, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/ui";
import { useTheme } from "../theme/ThemeProvider";
import { registerFeatureReset } from "../features/localStore";
import { validBarcode } from "./food";
export function BarcodeScanner({
  onRead,
  disabled = false,
}: {
  onRead: (barcode: string) => void;
  disabled?: boolean;
}) {
  const { s } = useTheme(),
    insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [visible, setVisible] = useState(false),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState("");
  const locked = useRef(false),
    generation = useRef(0),
    live = useRef(true);
  useEffect(() => {
    live.current = true;
    const unregister = registerFeatureReset(
      "athlete-barcode-camera",
      async () => {
        generation.current++;
        setVisible(false);
        setPending("");
      },
    );
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        generation.current++;
        setVisible(false);
        setPending("");
      }
    });
    return () => {
      live.current = false;
      generation.current++;
      sub.remove();
      unregister();
    };
  }, []);
  useEffect(() => {
    if (!visible && pending) {
      const value = pending;
      setPending("");
      onRead(value);
    }
  }, [visible, pending, onRead]);
  async function open() {
    const epoch = ++generation.current;
    try {
      const allowed = permission?.granted
        ? permission
        : await requestPermission();
      if (!live.current || epoch !== generation.current) return;
      if (!allowed.granted) {
        setMessage(
          "Camera permission was declined. Enter the barcode digits instead.",
        );
        return;
      }
      locked.current = false;
      setMessage("");
      setVisible(true);
    } catch {
      if (live.current && epoch === generation.current)
        setMessage(
          "The camera is unavailable. Enter the barcode digits instead.",
        );
    }
  }
  return (
    <>
      <Button
        label="Scan barcode"
        kind="secondary"
        disabled={disabled}
        onPress={() => void open()}
      />
      {message ? <Text style={s.body}>{message}</Text> : null}
      <Modal
        visible={visible}
        onRequestClose={() => setVisible(false)}
        animationType="slide"
      >
        {visible ? (
          <View
            style={[
              s.page,
              {
                paddingTop: insets.top + 16,
                paddingBottom: insets.bottom + 16,
                gap: 16,
                paddingHorizontal: 20,
              },
            ]}
          >
            <Text style={s.h2}>Scan the food package barcode</Text>
            <Text style={s.body}>
              Place the printed barcode inside the camera view.
            </Text>
            <CameraView
              style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "itf14"],
              }}
              onMountError={() => {
                setVisible(false);
                setMessage(
                  "The camera could not start. Enter the barcode digits instead.",
                );
              }}
              onBarcodeScanned={(event) => {
                if (locked.current || !validBarcode(event.data)) return;
                locked.current = true;
                setVisible(false);
                setPending(event.data);
              }}
            />
            <Button
              label="Cancel scanner"
              kind="secondary"
              onPress={() => setVisible(false)}
            />
          </View>
        ) : null}
      </Modal>
    </>
  );
}
