import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Point this at your deployed MotoSecure API. For local development on a
// physical device using Expo Go, use your machine's LAN IP instead of
// localhost. For EAS preview/production builds, this must be a real,
// publicly reachable URL (a device can never reach your laptop's
// localhost), so it's set to the live Render deployment.
const BASE_URL = "https://motosecure-api.onrender.com/api";

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("motosecure-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
