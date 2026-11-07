import { Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
export function BarcodeScanner(_props: {
  onRead: (barcode: string) => void;
  disabled?: boolean;
}) {
  const { s } = useTheme();
  return (
    <Text style={s.small}>
      On the web, enter the digits printed beneath the barcode. Camera scanning is
      available in the native app.
    </Text>
  );
}
