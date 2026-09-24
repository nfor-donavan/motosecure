import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./en.json";
import fr from "./fr.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

const STORAGE_KEY = "motosecure-lang";

export const initLanguage = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      i18n.changeLanguage(stored);
      return;
    }
    i18n.changeLanguage("en");
  } catch {
    i18n.changeLanguage("en");
  }
};

export const setLanguage = async (lng) => {
  await AsyncStorage.setItem(STORAGE_KEY, lng);
  i18n.changeLanguage(lng);
};

export default i18n;
