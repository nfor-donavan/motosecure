import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import LanguageToggle from "../components/LanguageToggle";

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const email = params.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError(t("auth.resetMismatch"));
      return;
    }
    if (newPassword.length < 8) {
      setError(t("auth.resetTooShort"));
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { email, token, newPassword });
      setDone(true);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const linkInvalid = !token || !email;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-navy-950">
      <div className="flex items-center justify-between p-5 sm:p-8">
        <Link to="/login">
          <Logo size={32} withWordmark />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">
            {t("auth.resetTitle")}
          </h1>
          <p className="mt-2 text-sm text-navy-500 dark:text-navy-400">{email}</p>

          {linkInvalid ? (
            <div className="mt-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 px-4 py-5 text-sm font-semibold text-rose-600 dark:text-rose-400">
              {t("auth.resetInvalidLink")}
            </div>
          ) : done ? (
            <div className="mt-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {t("auth.resetSuccess")}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-navy-600 dark:text-navy-300">
                  {t("auth.resetNewPassword")}
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-navy-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3.5 py-2.5 text-sm text-navy-900 dark:text-white focus:border-gold-400 focus:ring-1 focus:ring-gold-400 outline-none transition-colors"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-navy-600 dark:text-navy-300">
                  {t("auth.resetConfirmPassword")}
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-navy-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3.5 py-2.5 text-sm text-navy-900 dark:text-white focus:border-gold-400 focus:ring-1 focus:ring-gold-400 outline-none transition-colors"
                />
              </label>

              {error && (
                <p className="rounded-lg bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-navy-900 dark:bg-gold-500 py-3 text-sm font-semibold text-white dark:text-navy-900 shadow-panel hover:bg-navy-700 dark:hover:bg-gold-400 transition-colors disabled:opacity-60"
              >
                {submitting ? t("auth.resetSubmitting") : t("auth.resetSubmit")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
