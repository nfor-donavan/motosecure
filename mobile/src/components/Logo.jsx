import { Image, View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function Logo({ size = 40, withWordmark = false }) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <Image source={require("../../assets/logo.png")} style={{ width: size, height: size, borderRadius: size * 0.22 }} />
      {withWordmark && (
        <Text style={[styles.wordmark, { color: theme.text }]}>
          Moto<Text style={{ color: theme.accent }}>Secure</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  wordmark: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
});
