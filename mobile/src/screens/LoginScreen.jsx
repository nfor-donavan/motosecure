import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeContext";
import { useAuth } from "../lib/AuthContext";
import Logo from "../components/Logo";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || t("login.invalidCredentials"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Logo size={56} />
          <Text style={[styles.title, { color: theme.text }]}>{t("login.title")}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t("login.subtitle")}</Text>
        </View>

        <View style={styles.form}>
          <Field
            theme={theme}
            label={t("login.email")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            theme={theme}
            label={t("login.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: palette_roseBg }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: theme.onPrimary }]}>
              {submitting ? t("login.signingIn") : t("login.signIn")}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.hint, { color: theme.textMuted }]}>{t("login.demoHint")}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const palette_roseBg = "#FFF1F2";

function Field({ theme, label, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface },
        ]}
        placeholderTextColor={theme.textMuted}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  title: { fontSize: 22, fontWeight: "800", marginTop: 16 },
  subtitle: { fontSize: 13, marginTop: 6, textAlign: "center", maxWidth: 280 },
  form: { gap: 4 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  button: { borderRadius: 999, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  buttonText: { fontSize: 15, fontWeight: "700" },
  errorBox: { borderRadius: 10, padding: 10, marginBottom: 8 },
  errorText: { color: "#E11D48", fontSize: 13 },
  hint: { fontSize: 11, textAlign: "center", marginTop: 16 },
});
