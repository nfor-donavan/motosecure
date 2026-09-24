import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import Logo from "../components/Logo";
import StatusPill from "../components/StatusPill";

const RECENT_KEY = "motosecure-recent-scans";

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [recent, setRecent] = useState([]);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(RECENT_KEY).then((raw) => {
        setRecent(raw ? JSON.parse(raw) : []);
      });
    }, [])
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.topRow}>
        <Logo size={34} withWordmark />
        <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={{ color: theme.onPrimary, fontWeight: "800", fontSize: 12 }}>
              {(user?.fullName || "?")
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <Text style={[styles.heroTitle, { color: theme.text }]}>{t("home.greeting")}</Text>
        <Text style={[styles.heroSubtitle, { color: theme.textMuted }]}>{t("home.subtitle")}</Text>
      </View>

      <TouchableOpacity
        style={[styles.scanCard, { backgroundColor: theme.primary }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("Scan")}
      >
        <View style={styles.qrIcon}>
          <View style={[styles.qrDot, { backgroundColor: theme.onPrimary }]} />
          <View style={[styles.qrDot, { backgroundColor: theme.onPrimary }]} />
          <View style={[styles.qrDot, { backgroundColor: theme.onPrimary }]} />
          <View style={[styles.qrDot, { backgroundColor: "transparent" }]} />
        </View>
        <Text style={[styles.scanCardText, { color: theme.onPrimary }]}>{t("home.scanButton")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.manualButton, { borderColor: theme.border }]}
        onPress={() => navigation.navigate("Manual")}
      >
        <Text style={{ color: theme.text, fontWeight: "700", fontSize: 14 }}>{t("home.manualButton")}</Text>
      </TouchableOpacity>

      <Text style={[styles.recentTitle, { color: theme.text }]}>{t("home.recentTitle")}</Text>
      <FlatList
        data={recent}
        keyExtractor={(item, i) => `${item.badgeId}-${i}`}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textMuted }]}>{t("home.noRecent")}</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.recentRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View>
              <Text style={[styles.recentName, { color: theme.text }]}>{item.fullName}</Text>
              <Text style={[styles.recentBadge, { color: theme.textMuted }]}>{item.badgeId}</Text>
            </View>
            <StatusPill status={item.result} label={t(`result.${item.result}`)} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

export async function pushRecentScan(entry) {
  const raw = await AsyncStorage.getItem(RECENT_KEY);
  const list = raw ? JSON.parse(raw) : [];
  const next = [entry, ...list].slice(0, 10);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  hero: { marginTop: 28 },
  heroTitle: { fontSize: 24, fontWeight: "800" },
  heroSubtitle: { fontSize: 13, marginTop: 6, lineHeight: 19 },
  scanCard: {
    marginTop: 24,
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  qrIcon: { flexDirection: "row", flexWrap: "wrap", width: 30, height: 30, gap: 3 },
  qrDot: { width: 13, height: 13, borderRadius: 3 },
  scanCardText: { fontWeight: "800", fontSize: 15 },
  manualButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  recentTitle: { fontSize: 14, fontWeight: "800", marginTop: 28, marginBottom: 10 },
  empty: { fontSize: 13, paddingVertical: 12 },
  recentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  recentName: { fontSize: 14, fontWeight: "700" },
  recentBadge: { fontSize: 11, marginTop: 2 },
});
