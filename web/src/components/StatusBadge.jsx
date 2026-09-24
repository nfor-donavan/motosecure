const TONES = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  valid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",

  pending: "bg-gold-50 text-gold-700 ring-gold-600/20 dark:bg-gold-500/10 dark:text-gold-400 dark:ring-gold-500/20",
  under_review: "bg-gold-50 text-gold-700 ring-gold-600/20 dark:bg-gold-500/10 dark:text-gold-400 dark:ring-gold-500/20",
  warning: "bg-gold-50 text-gold-700 ring-gold-600/20 dark:bg-gold-500/10 dark:text-gold-400 dark:ring-gold-500/20",

  suspended: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  rejected: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  revoked: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  flagged: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  expired: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  impound: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",

  not_found: "bg-navy-100 text-navy-600 ring-navy-500/20 dark:bg-navy-700/40 dark:text-navy-300 dark:ring-navy-500/30",
  verification: "bg-navy-100 text-navy-600 ring-navy-500/20 dark:bg-navy-700/40 dark:text-navy-300 dark:ring-navy-500/30",
  incident: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
};

export default function StatusBadge({ status, label }) {
  const tone = TONES[status] || TONES.not_found;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
