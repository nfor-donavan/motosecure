export default function StatCard({ label, value, icon, accent = "navy", hint }) {
  const accents = {
    navy: "text-navy-600 dark:text-navy-300 bg-navy-50 dark:bg-navy-800/60",
    gold: "text-gold-600 dark:text-gold-400 bg-gold-50 dark:bg-gold-500/10",
    green: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
    red: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10",
  };

  return (
    <div className="rounded-2xl border border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-850 p-5 shadow-panel dark:shadow-panel-dark">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-400">
            {label}
          </p>
          <p className="stat-number mt-2 text-3xl font-display font-bold text-navy-900 dark:text-white">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-navy-400 dark:text-navy-500">{hint}</p>}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accents[accent]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
