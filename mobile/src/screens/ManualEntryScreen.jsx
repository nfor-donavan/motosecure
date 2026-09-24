import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeContext";

export default function ManualEntryScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [badgeId, setBadgeId] = useState("");

  const handleVerify = () => {
    if (!badgeId.trim()) return;
    navigation.replace("Result", { badgeId: badgeId.trim() });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t("manual.title")}</Text>
      <TextInput
        style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
        placeholder={t("manual.placeholder")}
        placeholderTextColor={theme.textMuted}
        autoCapitalize="characters"
        value={badgeId}
        onChangeText={setBadgeId}
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={handleVerify}
        activeOpacity={0.85}
      >
        <Text style={{ color: theme.onPrimary, fontWeight: "700" }}>{t("manual.verify")}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 24 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  button: { borderRadius: 999, paddingVertical: 15, alignItems: "center", marginTop: 16 },
});
