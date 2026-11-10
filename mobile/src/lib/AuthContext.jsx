import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { setUnauthorizedHandler } from "./api";
import { clearOfflineData } from "./offlineCache";

const AuthContext = createContext(null);
const USER_KEY = "motosecure-user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);
  userRef.current = user;

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(["motosecure-token", USER_KEY]);
    // Never leave one officer's cached rider data or queued scans on the device for the next user.
    await clearOfflineData();
    setUser(null);
  }, []);

  useEffect(() => {
    // An expired/revoked session (401) signs the officer out; a failed request while offline does not.
    setUnauthorizedHandler(() => {
      if (userRef.current) logout();
    });
  }, [logout]);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("motosecure-token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
      } catch (err) {
        if (err.response?.status === 401) {
          // The server says this session is no longer valid.
          await AsyncStorage.multiRemove(["motosecure-token", USER_KEY]);
        } else {
          // No connection (or server unavailable): keep the officer signed in with the
          // last known profile so offline scanning still works on a cold start.
          const cached = await AsyncStorage.getItem(USER_KEY);
          if (cached) setUser(JSON.parse(cached));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    await AsyncStorage.setItem("motosecure-token", data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
