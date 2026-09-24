import { View, Text, StyleSheet } from "react-native";
import { palette } from "../theme/colors";

const TONES = {
  valid: { bg: palette.emeraldBg, fg: palette.emerald },
  active: { bg: palette.emeraldBg, fg: palette.emerald },
  expired: { bg: palette.roseBg, fg: palette.rose },
  suspended: { bg: palette.roseBg, fg: palette.rose },
  flagged: { bg: palette.roseBg, fg: palette.rose },
  not_found: { bg: "#F1F3F9", fg: "#5A6B8C" },
};

export default function StatusPill({ status, label }) {
  const tone = TONES[status] || TONES.not_found;
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.text, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "700" },
});
