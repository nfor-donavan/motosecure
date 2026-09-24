import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import { IconQr, IconClose } from "../components/icons";

export default function Riders() {
  const { t } = useTranslation();
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [badge, setBadge] = useState(null);

  useEffect(() => {
    api
      .get("/riders")
      .then(({ data }) => setRiders(data.riders))
      .finally(() => setLoading(false));
  }, []);

  const viewBadge = async (rider) => {
    const { data } = await api.get(`/riders/${rider._id}/badge-qr`);
    setBadge({ ...data, fullName: rider.fullName });
  };

  const columns = [
    { key: "fullName", header: t("riders.name") },
    { key: "badgeId", header: t("riders.badgeId"), render: (r) => <span className="font-mono text-xs">{r.badgeId}</span> },
    { key: "syndicate", header: t("riders.syndicate"), render: (r) => r.syndicate?.name || "—" },
    { key: "bike", header: t("riders.bike"), render: (r) => r.bike?.plateNumber || "—" },
    { key: "phone", header: t("riders.phone") },
    { key: "verificationCount", header: t("riders.verifications") },
    {
      key: "status",
      header: t("riders.status"),
      render: (r) => <StatusBadge status={r.status} label={t(`riders.status${cap(r.status)}`)} />,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button
          onClick={() => viewBadge(r)}
          className="inline-flex items-center gap-1.5 rounded-full bg-navy-100 dark:bg-navy-700/50 px-3 py-1.5 text-xs font-semibold text-navy-700 dark:text-navy-200 hover:bg-navy-200 dark:hover:bg-navy-700 transition-colors"
        >
          <IconQr className="h-3.5 w-3.5" />
          {t("riders.viewBadge")}
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">{t("riders.title")}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-400">{t("riders.subtitle")}</p>
      </div>
      <DataTable columns={columns} rows={riders} emptyLabel={loading ? t("common.loading") : t("dashboard.noActivity")} />

      {badge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm p-4"
          onClick={() => setBadge(null)}
        >
          <div
            className="w-full max-w-xs rounded-3xl bg-white dark:bg-navy-850 p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button onClick={() => setBadge(null)} className="text-navy-400 hover:text-navy-700 dark:hover:text-white">
                <IconClose />
              </button>
            </div>
            <img src={badge.qrDataUrl} alt="Badge QR" className="mx-auto h-48 w-48 rounded-xl border border-navy-100 dark:border-navy-700" />
            <p className="mt-4 font-display font-bold text-navy-900 dark:text-white">{badge.fullName}</p>
            <p className="mt-1 font-mono text-xs text-navy-400">{badge.badgeId}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function cap(s = "") {
  return s
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}
