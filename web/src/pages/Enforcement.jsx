import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";

export default function Enforcement() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/enforcement/logs?limit=200")
      .then(({ data }) => setLogs(data.logs))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: "type",
      header: t("enforcement.type"),
      render: (l) => <StatusBadge status={l.type} label={t(`enforcement.type${cap(l.type)}`)} />,
    },
    {
      key: "result",
      header: t("enforcement.result"),
      render: (l) => <StatusBadge status={l.result} label={t(`enforcement.result${cap(l.result)}`)} />,
    },
    { key: "rider", header: t("enforcement.rider"), render: (l) => l.rider?.fullName || "—" },
    { key: "officer", header: t("enforcement.officer"), render: (l) => l.officer?.fullName || "—" },
    { key: "location", header: t("enforcement.location"), render: (l) => l.location?.label || "—" },
    {
      key: "createdAt",
      header: t("enforcement.date"),
      render: (l) => new Date(l.createdAt).toLocaleString(),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">{t("enforcement.title")}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-400">{t("enforcement.subtitle")}</p>
      </div>
      <DataTable columns={columns} rows={logs} emptyLabel={loading ? t("common.loading") : t("dashboard.noActivity")} />
    </div>
  );
}

function cap(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
