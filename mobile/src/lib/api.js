import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Public URL of the deployed MotoSecure API.
const BASE_URL = "https://motosecure-api.onrender.com/api";

// A request that has not completed in this time is treated as a network
// failure, so a weak connection falls back to offline mode instead of
// leaving the officer watching a spinner.
const api = axios.create({ baseURL: BASE_URL, timeout: 12000 });

let onUnauthorized = null;
/** Registered by AuthProvider so an expired session returns to the login screen. */
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("motosecure-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only treat a 401 on an authenticated request as "session expired".
    if (err.response?.status === 401 && err.config?.headers?.Authorization && onUnauthorized) onUnauthorized();
    return Promise.reject(err);
  }
);

export default api;
