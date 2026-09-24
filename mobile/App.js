import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { AuthProvider } from "./src/lib/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { initLanguage } from "./src/i18n";

function StatusBarBridge() {
  const { mode } = useTheme();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initLanguage().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <StatusBarBridge />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
