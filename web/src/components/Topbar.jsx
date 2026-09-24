import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import { IconMenu, IconLogout } from "./icons";

export default function Topbar({ onMenuClick }) {
  const { t } = useTranslation();
  const { user, tenant, logout } = useAuth();

  const initials = (user?.fullName || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-navy-100 dark:border-navy-800 bg-white/90 dark:bg-navy-900/90 backdrop-blur px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden text-navy-500 dark:text-navy-300"
          onClick={onMenuClick}
          aria-label="Menu"
        >
          <IconMenu />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-navy-900 dark:text-white">
            {tenant?.name || "MotoSecure"}
          </p>
          <p className="text-xs text-navy-400 dark:text-navy-500">
            {tenant?.region ? `${tenant.region} · Cameroon` : "Platform overview"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <LanguageToggle className="hidden sm:inline-flex" />
        <ThemeToggle />
        <div className="mx-1 hidden h-6 w-px bg-navy-200 dark:bg-navy-700 sm:block" />
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-700 dark:bg-gold-500 text-xs font-bold text-white dark:text-navy-900">
            {initials}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-semibold text-navy-900 dark:text-white leading-tight">
              {user?.fullName}
            </p>
            <p className="text-xs capitalize text-navy-400 dark:text-navy-500 leading-tight">
              {user?.role?.replace("_", " ")}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          title={t("nav.logout")}
          className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-navy-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
        >
          <IconLogout />
        </button>
      </div>
    </header>
  );
}
