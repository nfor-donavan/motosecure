import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import fr from "./fr.json";

const storedLang = window.localStorage.getItem("motosecure-lang");

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: storedLang || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  window.localStorage.setItem("motosecure-lang", lng);
  document.documentElement.setAttribute("lang", lng);
});

export default i18n;
