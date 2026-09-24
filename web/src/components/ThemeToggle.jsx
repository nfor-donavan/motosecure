import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "react-i18next";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t("common.light") : t("common.dark")}
      title={isDark ? t("common.light") : t("common.dark")}
      className={`relative inline-flex h-9 w-16 items-center rounded-full border border-navy-200 dark:border-navy-700 bg-navy-50 dark:bg-navy-800 transition-colors ${className}`}
    >
      <span
        className={`inline-flex h-7 w-7 transform items-center justify-center rounded-full bg-white dark:bg-navy-950 shadow-panel transition-transform duration-200 ${
          isDark ? "translate-x-8" : "translate-x-1"
        }`}
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold-400" fill="currentColor">
            <path d="M12 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 15a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm9-6a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM6 12a1 1 0 01-1 1H4a1 1 0 110-2h1a1 1 0 011 1zm11.657-6.657a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM7.464 16.536a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zm11.607 1.414a1 1 0 01-1.414 0l-.707-.707a1 1 0 111.414-1.414l.707.707a1 1 0 010 1.414zM8.879 6.464a1 1 0 01-1.415 0l-.707-.707A1 1 0 118.17 4.343l.707.707a1 1 0 010 1.414zM12 7a5 5 0 100 10 5 5 0 000-10z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-navy-600" fill="currentColor">
            <path d="M21.64 13a1 1 0 00-1.05-.14 8.05 8.05 0 01-3.37.73 8.15 8.15 0 01-8.14-8.14c0-1.22.27-2.35.73-3.37a1 1 0 00-1.3-1.3A10.14 10.14 0 002 10.86 10.15 10.15 0 0012.14 21a10.14 10.14 0 009.6-6.95 1 1 0 00-.1-1.05z" />
          </svg>
        )}
      </span>
    </button>
  );
}
