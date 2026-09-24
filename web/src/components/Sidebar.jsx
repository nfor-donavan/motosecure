import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "./Logo";
import {
  IconDashboard,
  IconUnion,
  IconRider,
  IconBike,
  IconShield,
  IconClose,
} from "./icons";

const items = [
  { to: "/app", label: "nav.dashboard", icon: IconDashboard, end: true },
  { to: "/app/syndicates", label: "nav.syndicates", icon: IconUnion },
  { to: "/app/riders", label: "nav.riders", icon: IconRider },
  { to: "/app/bikes", label: "nav.bikes", icon: IconBike },
  { to: "/app/enforcement", label: "nav.enforcement", icon: IconShield },
];

export default function Sidebar({ open, onClose }) {
  const { t } = useTranslation();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-navy-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-72 transform bg-navy-900 text-navy-100 transition-transform duration-200 lg:static lg:translate-x-0 lg:shrink-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/10">
          <Logo size={36} withWordmark />
          <button
            className="lg:hidden text-navy-300 hover:text-white"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <IconClose />
          </button>
        </div>

        <nav className="mt-4 px-3 space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gold-500 text-navy-900 shadow-panel"
                    : "text-navy-200 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon />
              {t(label)}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 inset-x-0 p-4">
          <div className="rounded-xl bg-white/5 p-4 text-xs text-navy-300 leading-relaxed">
            {t("landing.footerBuilt")}
          </div>
        </div>
      </aside>
    </>
  );
}
