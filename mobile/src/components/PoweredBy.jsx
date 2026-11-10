import { Image, View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeContext";

/** Small "A NEXUS Tech Labs product" credit shown on the login and settings screens. */
export default function PoweredBy() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.chip}>
        <Image source={require("../../assets/nexus-logo.png")} style={styles.logo} resizeMode="contain" />
      </View>
      <Text style={[styles.text, { color: theme.textMuted }]}>{t("app.poweredBy")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginTop: 28, gap: 8 },
  chip: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  logo: { width: 76, height: 40 },
  text: { fontSize: 11, fontWeight: "600" },
});
