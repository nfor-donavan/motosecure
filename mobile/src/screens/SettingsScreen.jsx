import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import { setLanguage } from "../i18n";
import Logo from "../components/Logo";

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { theme, mode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const isFr = i18n.language === "fr";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Logo size={40} />
        <Text style={[styles.title, { color: theme.text }]}>{t("settings.title")}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{t("settings.signedInAs")}</Text>
        <Text style={[styles.rowValue, { color: theme.text }]}>{user?.fullName}</Text>
        <Text style={[styles.rowSub, { color: theme.textMuted }]}>{user?.email}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{t("settings.language")}</Text>
        <View style={styles.segment}>
          <SegmentButton active={!isFr} label="English" theme={theme} onPress={() => setLanguage("en")} />
          <SegmentButton active={isFr} label="Français" theme={theme} onPress={() => setLanguage("fr")} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{t("settings.theme")}</Text>
        <View style={styles.segment}>
          <SegmentButton active={mode === "light"} label={t("settings.light")} theme={theme} onPress={mode === "dark" ? toggleTheme : undefined} />
          <SegmentButton active={mode === "dark"} label={t("settings.dark")} theme={theme} onPress={mode === "light" ? toggleTheme : undefined} />
        </View>
      </View>

      <TouchableOpacity style={[styles.logoutButton, { borderColor: theme.border }]} onPress={logout}>
        <Text style={{ color: "#E11D48", fontWeight: "700" }}>{t("settings.logout")}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function SegmentButton({ active, label, onPress, theme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.segmentBtn,
        { backgroundColor: active ? theme.primary : "transparent" },
      ]}
    >
      <Text style={{ color: active ? theme.onPrimary : theme.text, fontWeight: "700", fontSize: 13 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20 },
  header: { alignItems: "center", marginVertical: 20, gap: 10 },
  title: { fontSize: 20, fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 },
  rowLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  rowValue: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  rowSub: { fontSize: 12, marginTop: 2 },
  segment: { flexDirection: "row", gap: 8, marginTop: 10 },
  segmentBtn: { flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  logoutButton: { borderWidth: 1, borderRadius: 999, paddingVertical: 15, alignItems: "center", marginTop: 8 },
});
