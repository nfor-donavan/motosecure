import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Point this at your deployed MotoSecure API. For local development on a
// physical device, use your machine's LAN IP instead of localhost.
const BASE_URL = "http://localhost:5000/api";

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("motosecure-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
