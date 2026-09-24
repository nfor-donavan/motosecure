import { useTranslation } from "react-i18next";

/**
 * A responsive table: renders as a normal <table> on wider screens and
 * collapses to stacked cards on narrow mobile viewports so nothing is
 * ever cut off or force-scrolled horizontally.
 */
export default function DataTable({ columns, rows, keyField = "_id", emptyLabel }) {
  const { t } = useTranslation();

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-navy-200 dark:border-navy-700 p-10 text-center text-sm text-navy-400">
        {emptyLabel || t("common.loading")}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-850 shadow-panel dark:shadow-panel-dark overflow-hidden">
      {/* Desktop / tablet table */}
      <div className="hidden sm:block overflow-x-auto brand-scroll">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-navy-100 dark:border-navy-800 bg-navy-50/60 dark:bg-navy-900/40">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-navy-400 dark:text-navy-500"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
            {rows.map((row) => (
              <tr key={row[keyField]} className="hover:bg-navy-50/60 dark:hover:bg-navy-900/40 transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3.5 align-middle text-navy-700 dark:text-navy-200">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="divide-y divide-navy-100 dark:divide-navy-800 sm:hidden">
        {rows.map((row) => (
          <div key={row[keyField]} className="p-4 space-y-2">
            {columns.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">
                  {c.header}
                </span>
                <span className="text-right text-sm text-navy-700 dark:text-navy-200">
                  {c.render ? c.render(row) : row[c.key]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
