import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";

export default function Syndicates() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [syndicates, setSyndicates] = useState([]);
  const [loading, setLoading] = useState(true);

  const canModerate = ["mayor", "municipal_staff", "super_admin"].includes(user?.role);

  const load = () => {
    setLoading(true);
    api
      .get("/syndicates")
      .then(({ data }) => setSyndicates(data.syndicates))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/syndicates/${id}/status`, { status });
    load();
  };

  const columns = [
    { key: "name", header: t("syndicates.name") },
    { key: "zone", header: t("syndicates.zone") },
    { key: "memberCount", header: t("syndicates.members") },
    {
      key: "trustScore",
      header: t("syndicates.trustScore"),
      render: (r) => <TrustPill score={r.trustScore} />,
    },
    {
      key: "status",
      header: t("syndicates.status"),
      render: (r) => (
        <StatusBadge status={r.status} label={t(`syndicates.status${cap(r.status)}`)} />
      ),
    },
    ...(canModerate
      ? [
          {
            key: "actions",
            header: t("syndicates.actions"),
            render: (r) => (
              <div className="flex flex-wrap gap-2">
                {r.status !== "approved" && (
                  <ActionBtn tone="emerald" onClick={() => updateStatus(r._id, "approved")}>
                    {t("syndicates.approve")}
                  </ActionBtn>
                )}
                {r.status !== "suspended" && (
                  <ActionBtn tone="rose" onClick={() => updateStatus(r._id, "suspended")}>
                    {t("syndicates.suspend")}
                  </ActionBtn>
                )}
                {r.status === "pending" && (
                  <ActionBtn tone="navy" onClick={() => updateStatus(r._id, "rejected")}>
                    {t("syndicates.reject")}
                  </ActionBtn>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">{t("syndicates.title")}</h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-400">{t("syndicates.subtitle")}</p>
      </div>
      <DataTable
        columns={columns}
        rows={syndicates}
        emptyLabel={loading ? t("common.loading") : t("dashboard.noActivity")}
      />
    </div>
  );
}

function TrustPill({ score }) {
  const tone = score >= 75 ? "text-emerald-600 dark:text-emerald-400" : score >= 50 ? "text-gold-600 dark:text-gold-400" : "text-rose-600 dark:text-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-navy-100 dark:bg-navy-700 overflow-hidden">
        <div className="h-full bg-current" style={{ width: `${score}%`, color: "inherit" }} />
      </div>
      <span className={`text-xs font-bold ${tone}`}>{score}</span>
    </div>
  );
}

function ActionBtn({ children, onClick, tone }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400",
    rose: "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400",
    navy: "bg-navy-100 text-navy-700 hover:bg-navy-200 dark:bg-navy-700/50 dark:text-navy-200",
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function cap(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
