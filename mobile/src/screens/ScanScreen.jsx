import { useCallback, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeContext";

const GOLD = "#FFB627";
const MASK = "rgba(10, 22, 40, 0.78)";
const CORNER = 34;
const CORNER_W = 5;

export default function ScanScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.72, 320);

  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const scannedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      scannedRef.current = false;
      setCameraReady(false);
    }, [])
  );

  const handleScanned = ({ data }) => {
    if (scannedRef.current || !data) return;
    scannedRef.current = true;
    navigation.replace("Result", { badgeId: String(data).trim() });
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textMuted }}>{t("scan.checkingPermission")}</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.permTitle, { color: theme.text }]}>{t("scan.permissionTitle")}</Text>
        <Text style={[styles.permBody, { color: theme.textMuted }]}>{t("scan.permissionBody")}</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={requestPermission}>
          <Text style={{ color: theme.onPrimary, fontWeight: "700" }}>{t("scan.grantPermission")}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.replace("Manual")}>
          <Text style={{ color: theme.textMuted, fontWeight: "600", marginTop: 10 }}>{t("scan.enterManually")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleScanned}
          onCameraReady={() => setCameraReady(true)}
          onMountError={(e) => setCameraError(e?.message || "Camera failed to start")}
        />
      )}

      {/* Dimmed mask with a clear, centered scanning window */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.maskBlock, { flex: 1 }]} />
        <View style={{ flexDirection: "row", height: size }}>
          <View style={[styles.maskBlock, { flex: 1 }]} />
          <View style={{ width: size, height: size }}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <View style={[styles.maskBlock, { flex: 1 }]} />
        </View>
        <View style={[styles.maskBlock, { flex: 1, alignItems: "center", paddingTop: 22 }]}>
          <Text style={styles.instructions}>
            {cameraError ? cameraError : cameraReady ? t("scan.instructions") : t("scan.startingCamera")}
          </Text>
        </View>
      </View>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.title}>{t("scan.title")}</Text>
        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.pill} onPress={() => navigation.goBack()}>
            <Text style={styles.pillText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pill} onPress={() => navigation.replace("Manual")}>
            <Text style={styles.pillText}>{t("scan.enterManually")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  permTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  permBody: { fontSize: 13, textAlign: "center", maxWidth: 260 },
  button: { borderRadius: 999, paddingHorizontal: 22, paddingVertical: 13, marginTop: 8 },
  maskBlock: { backgroundColor: MASK },
  corner: { position: "absolute", width: CORNER, height: CORNER, borderColor: GOLD },
  tl: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: 14 },
  br: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between", alignItems: "center" },
  title: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: 14 },
  instructions: { color: "#fff", fontSize: 13, fontWeight: "600", textAlign: "center", paddingHorizontal: 32 },
  bottomRow: { flexDirection: "row", gap: 12, paddingBottom: 28 },
  pill: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingHorizontal: 22, paddingVertical: 12 },
  pillText: { color: "#fff", fontWeight: "700" },
});
