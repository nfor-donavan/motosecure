import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeContext";
import { palette } from "../theme/colors";
import api from "../lib/api";
import StatusPill from "../components/StatusPill";
import { pushRecentScan } from "./HomeScreen";

const RESULT_TONE = {
  valid: { bg: palette.emeraldBg, fg: palette.emerald },
  expired: { bg: palette.roseBg, fg: palette.rose },
  suspended: { bg: palette.roseBg, fg: palette.rose },
  flagged: { bg: palette.roseBg, fg: palette.rose },
  not_found: { bg: "#F1F3F9", fg: "#5A6B8C" },
};

export default function ResultScreen({ route, navigation }) {
  const { badgeId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    api
      .get(`/enforcement/verify/${encodeURIComponent(badgeId)}`)
      .then(async ({ data: res }) => {
        if (!mounted) return;
        setData(res);
        await pushRecentScan({
          badgeId,
          fullName: res.rider?.fullName || "—",
          result: res.result,
        });
      })
      .catch(() => mounted && setError(true))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [badgeId]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t("result.loading")}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safe, styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t("result.errorTitle")}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t("result.errorBody")}</Text>
        <DoneButton theme={theme} t={t} navigation={navigation} />
      </SafeAreaView>
    );
  }

  const tone = RESULT_TONE[data.result] || RESULT_TONE.not_found;
  const rider = data.rider;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.banner, { backgroundColor: tone.bg }]}>
        <View style={[styles.bannerDot, { backgroundColor: tone.fg }]} />
        <Text style={[styles.bannerText, { color: tone.fg }]}>{t(`result.${data.result}`)}</Text>
      </View>

      {rider ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.name, { color: theme.text }]}>{rider.fullName}</Text>
          <Text style={[styles.badge, { color: theme.textMuted }]}>{rider.badgeId}</Text>

          <View style={styles.rowsWrap}>
            <InfoRow theme={theme} label={t("result.syndicate")} value={rider.syndicate?.name || "—"} />
            <InfoRow theme={theme} label={t("result.bike")} value={rider.bike?.plateNumber || "—"} />
            {rider.licenseExpiresAt && (
              <InfoRow
                theme={theme}
                label={t("result.licenseExpires")}
                value={new Date(rider.licenseExpiresAt).toLocaleDateString()}
              />
            )}
          </View>

          <StatusPill status={data.result} label={t(`result.${data.result}`)} />
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.badge, { color: theme.textMuted }]}>{badgeId}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {rider && (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.border }]}
            onPress={() => navigation.navigate("Incident", { riderId: rider.id, riderName: rider.fullName })}
          >
            <Text style={{ color: theme.text, fontWeight: "700" }}>{t("result.reportIncident")}</Text>
          </TouchableOpacity>
        )}
        <DoneButton theme={theme} t={t} navigation={navigation} />
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ theme, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function DoneButton({ theme, t, navigation }) {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.primary }]}
      onPress={() => navigation.popToTop()}
      activeOpacity={0.85}
    >
      <Text style={{ color: theme.onPrimary, fontWeight: "700" }}>{t("result.done")}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20 },
  center: { alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { fontSize: 13 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 13, textAlign: "center", maxWidth: 260 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  bannerDot: { width: 10, height: 10, borderRadius: 5 },
  bannerText: { fontSize: 16, fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: 20, padding: 18, marginTop: 16, gap: 14 },
  name: { fontSize: 19, fontWeight: "800" },
  badge: { fontSize: 12, marginTop: 2 },
  rowsWrap: { gap: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { fontSize: 12, fontWeight: "600" },
  infoValue: { fontSize: 13, fontWeight: "700" },
  actions: { marginTop: 20, gap: 10 },
  button: { borderRadius: 999, paddingVertical: 15, alignItems: "center" },
  secondaryButton: { borderWidth: 1, borderRadius: 999, paddingVertical: 15, alignItems: "center" },
});
