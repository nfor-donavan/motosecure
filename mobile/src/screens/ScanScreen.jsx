import { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeContext";

export default function ScanScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  const handleScanned = ({ data }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    navigation.replace("Result", { badgeId: data });
  };

  if (!permission) {
    return <View style={[styles.safe, { backgroundColor: theme.background }]} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.safe, styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.permTitle, { color: theme.text }]}>{t("scan.permissionTitle")}</Text>
        <Text style={[styles.permBody, { color: theme.textMuted }]}>{t("scan.permissionBody")}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={requestPermission}
        >
          <Text style={{ color: theme.onPrimary, fontWeight: "700" }}>{t("scan.grantPermission")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleScanned}
      />
      <SafeAreaView style={styles.overlay}>
        <View style={styles.frameWrap}>
          <View style={styles.frame} />
          <Text style={styles.instructions}>{t("scan.instructions")}</Text>
        </View>
        <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>{t("common.cancel")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  permTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  permBody: { fontSize: 13, textAlign: "center", maxWidth: 260 },
  button: { borderRadius: 999, paddingHorizontal: 22, paddingVertical: 13, marginTop: 8 },
  overlay: { flex: 1, justifyContent: "space-between", alignItems: "center", paddingVertical: 40 },
  frameWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "#FFB627",
  },
  instructions: { color: "#fff", marginTop: 20, fontSize: 13, fontWeight: "600" },
  cancel: { backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12 },
  cancelText: { color: "#fff", fontWeight: "700" },
});
