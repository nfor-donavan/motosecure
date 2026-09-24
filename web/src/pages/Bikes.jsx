import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";

export default function Bikes() {
  const { t } = useTranslation();
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/bikes")
      .then(({ data }) => setBikes(data.bikes))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: "plateNumber", header: t("bikes.plate"), render: (b) => <span className="font-mono">{b.plateNumber}</span> },
    { key: "makeModel", header: t("bikes.makeModel"), render: (b) => `${b.make || ""} ${b.model || ""}`.trim() || "—" },
    { key: "rider", header: t("bikes.rider"), render: (b) => b.rider?.fullName || "—" },
    {
      key: "insuranceExpiresAt",
      header: t("bikes.insurance"),
      render: (b) => (b.insuranceExpiresAt ? new Date(b.insuranceExpiresAt).toLocaleDateString() : "—"),
    },
    {
      key: "roadworthy",
      header: t("bikes.roadworthy"),
      render: (b) => (
        <span className={b.roadworthy ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
          {b.roadworthy ? "✓" : "✕"}
        </span>
      ),
    },
    {
      key: "status",
      header: t("bikes.status"),
      render: (b) => <StatusBadge status={b.status} label={b.status} />,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">{t("bikes.title")}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-400">{t("bikes.subtitle")}</p>
      </div>
      <DataTable columns={columns} rows={bikes} emptyLabel={loading ? t("common.loading") : t("dashboard.noActivity")} />
    </div>
  );
}
