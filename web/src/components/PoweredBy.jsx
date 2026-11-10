import { useTranslation } from "react-i18next";
import nexus from "../assets/nexus-logo.png";

/** "A NEXUS Tech Labs product" credit. tone="light" is for dark backgrounds. */
export default function PoweredBy({ className = "", tone = "auto" }) {
  const { t } = useTranslation();
  const text =
    tone === "light" ? "text-navy-200" : "text-navy-500 dark:text-navy-300";
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-black/5">
        <img src={nexus} alt="NEXUS Tech Labs" className="h-8 w-auto" />
      </span>
      <span className={`text-xs font-semibold ${text}`}>{t("brand.poweredBy")}</span>
    </div>
  );
}
