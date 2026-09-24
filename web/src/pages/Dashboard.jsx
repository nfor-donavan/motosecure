import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { IconRider, IconBike, IconUnion, IconAlert } from "../components/icons";

const PIE_COLORS = ["#1B3A6B", "#F5A623", "#C8272B", "#7E9CCC"];

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [riders, setRiders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get("/enforcement/stats"),
      api.get("/riders"),
      api.get("/enforcement/logs?limit=6"),
    ])
      .then(([s, r, l]) => {
        if (!mounted) return;
        setStats(s.data.stats);
        setRiders(r.data.riders);
        setLogs(l.data.logs);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const statusCounts = riders.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([status, value]) => ({
    name: t(`riders.status${toPascal(status)}`),
    value,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">
          {t("dashboard.welcome")}, {user?.fullName?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-400">{t("dashboard.overview")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("dashboard.totalRiders")} value={stats?.totalRiders ?? "—"} icon={<IconRider />} accent="navy" />
        <StatCard label={t("dashboard.activeRiders")} value={stats?.activeRiders ?? "—"} icon={<IconRider />} accent="green" />
        <StatCard label={t("dashboard.totalBikes")} value={stats?.totalBikes ?? "—"} icon={<IconBike />} accent="navy" />
        <StatCard label={t("dashboard.totalSyndicates")} value={stats?.totalSyndicates ?? "—"} icon={<IconUnion />} accent="gold" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("dashboard.pendingSyndicates")} value={stats?.pendingSyndicates ?? "—"} icon={<IconUnion />} accent="gold" />
        <StatCard label={t("dashboard.incidents30d")} value={stats?.incidents30d ?? "—"} icon={<IconAlert />} accent="red" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-850 p-5 shadow-panel dark:shadow-panel-dark">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-navy-900 dark:text-white">
              {t("dashboard.recentActivity")}
            </h2>
          </div>
          <div className="mt-4 divide-y divide-navy-100 dark:divide-navy-800">
            {loading && <p className="py-6 text-sm text-navy-400">{t("common.loading")}</p>}
            {!loading && logs.length === 0 && (
              <p className="py-6 text-sm text-navy-400">{t("dashboard.noActivity")}</p>
            )}
            {logs.map((log) => (
              <div key={log._id} className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-semibold text-navy-800 dark:text-navy-100">
                    {log.rider?.fullName || "—"}
                    <span className="ml-2 font-mono text-xs text-navy-400">{log.rider?.badgeId}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-navy-400">
                    {log.location?.label || "—"} · {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={log.result} label={t(`enforcement.result${toPascal(log.result)}`)} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-850 p-5 shadow-panel dark:shadow-panel-dark">
          <h2 className="font-display font-bold text-navy-900 dark:text-white">
            {t("dashboard.riderStatusBreakdown")}
          </h2>
          <div className="mt-2 h-56">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-navy-400">
                {t("common.loading")}
              </p>
            )}
          </div>
          <div className="mt-2 space-y-1.5">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-navy-500 dark:text-navy-400">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {d.name}
                </span>
                <span className="font-semibold text-navy-700 dark:text-navy-200">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function toPascal(s = "") {
  return s
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}
