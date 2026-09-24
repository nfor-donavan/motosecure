import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeContext";
import api from "../lib/api";

const TYPES = ["incident", "warning", "impound"];
const SEVERITIES = ["low", "medium", "high", "critical"];

export default function IncidentScreen({ route, navigation }) {
  const { riderId, riderName } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [type, setType] = useState("incident");
  const [severity, setSeverity] = useState("low");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post("/enforcement/incident", { riderId, type, severity, description });
      setSubmitted(true);
      setTimeout(() => navigation.popToTop(), 1200);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={[styles.title, { color: theme.text }]}>{t("incident.title")}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{riderName}</Text>

        {submitted ? (
          <View style={[styles.successBox, { backgroundColor: "#ECFDF5" }]}>
            <Text style={{ color: "#059669", fontWeight: "700" }}>{t("incident.submitted")}</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.label, { color: theme.textMuted }]}>{t("incident.typeLabel")}</Text>
            <View style={styles.chipsRow}>
              {TYPES.map((tp) => (
                <Chip
                  key={tp}
                  active={type === tp}
                  theme={theme}
                  label={t(`incident.type${cap(tp)}`)}
                  onPress={() => setType(tp)}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: theme.textMuted }]}>{t("incident.severityLabel")}</Text>
            <View style={styles.chipsRow}>
              {SEVERITIES.map((sv) => (
                <Chip
                  key={sv}
                  active={severity === sv}
                  theme={theme}
                  label={t(`incident.severity${cap(sv)}`)}
                  onPress={() => setSeverity(sv)}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: theme.textMuted }]}>{t("incident.descriptionLabel")}</Text>
            <TextInput
              style={[
                styles.textarea,
                { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface },
              ]}
              placeholder={t("incident.descriptionPlaceholder")}
              placeholderTextColor={theme.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={submit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={{ color: theme.onPrimary, fontWeight: "700" }}>{t("incident.submit")}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ active, label, onPress, theme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.primary : theme.surface,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}
    >
      <Text style={{ color: active ? theme.onPrimary : theme.text, fontWeight: "700", fontSize: 12 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  textarea: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, textAlignVertical: "top", minHeight: 100 },
  button: { borderRadius: 999, paddingVertical: 15, alignItems: "center", marginTop: 24 },
  successBox: { borderRadius: 14, padding: 16, marginTop: 10 },
});
