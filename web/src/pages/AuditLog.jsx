import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import DataTable from "../components/DataTable";

export default function AuditLog() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/audit-logs?limit=200")
      .then(({ data }) => setLogs(data.logs))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: "action", header: t("audit.action"), render: (l) => <ActionLabel action={l.action} /> },
    { key: "targetLabel", header: t("audit.target"), render: (l) => l.targetLabel || "—" },
    { key: "actorName", header: t("audit.actor"), render: (l) => `${l.actorName || "—"} (${l.actorRole?.replace("_", " ") || "—"})` },
    {
      key: "metadata",
      header: t("audit.details"),
      render: (l) =>
        l.metadata?.from && l.metadata?.to ? (
          <span>
            {l.metadata.from} &rarr; <strong>{l.metadata.to}</strong>
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "createdAt",
      header: t("audit.date"),
      render: (l) => new Date(l.createdAt).toLocaleString(),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">{t("audit.title")}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-400">{t("audit.subtitle")}</p>
      </div>
      <DataTable columns={columns} rows={logs} emptyLabel={loading ? t("common.loading") : t("dashboard.noActivity")} />
    </div>
  );
}

function ActionLabel({ action }) {
  const map = {
    "syndicate.created": { label: "Syndicate created", tone: "text-navy-600 dark:text-navy-300" },
    "syndicate.approved": { label: "Syndicate approved", tone: "text-emerald-600 dark:text-emerald-400" },
    "syndicate.rejected": { label: "Syndicate rejected", tone: "text-rose-600 dark:text-rose-400" },
    "syndicate.suspended": { label: "Syndicate suspended", tone: "text-rose-600 dark:text-rose-400" },
    "rider.status_changed": { label: "Rider status changed", tone: "text-gold-600 dark:text-gold-400" },
  };
  const entry = map[action] || { label: action, tone: "text-navy-600 dark:text-navy-300" };
  return <span className={`text-xs font-bold ${entry.tone}`}>{entry.label}</span>;
}
