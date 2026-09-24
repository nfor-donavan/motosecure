import { useTranslation } from "react-i18next";

export default function LanguageToggle({ className = "" }) {
  const { i18n } = useTranslation();
  const isFr = i18n.language === "fr";

  const setLang = (lng) => i18n.changeLanguage(lng);

  return (
    <div
      className={`inline-flex items-center rounded-full border border-navy-200 dark:border-navy-700 bg-navy-50 dark:bg-navy-800 p-0.5 text-xs font-semibold ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-2.5 py-1.5 rounded-full transition-colors ${
          !isFr
            ? "bg-navy-700 text-white dark:bg-gold-500 dark:text-navy-900"
            : "text-navy-500 dark:text-navy-300"
        }`}
        aria-pressed={!isFr}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("fr")}
        className={`px-2.5 py-1.5 rounded-full transition-colors ${
          isFr
            ? "bg-navy-700 text-white dark:bg-gold-500 dark:text-navy-900"
            : "text-navy-500 dark:text-navy-300"
        }`}
        aria-pressed={isFr}
      >
        FR
      </button>
    </div>
  );
}
