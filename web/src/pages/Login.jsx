import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import LanguageToggle from "../components/LanguageToggle";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.message || t("auth.invalidCredentials"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-navy-950">
      <div className="hidden lg:flex flex-col justify-between bg-brand-gradient p-10 text-white">
        <Logo size={40} withWordmark />
        <div>
          <p className="font-display text-3xl font-bold leading-tight max-w-md">
            {t("landing.heroTitle")}
          </p>
          <p className="mt-4 max-w-sm text-sm text-navy-200">{t("brand.tagline")}</p>
        </div>
        <p className="text-xs text-navy-400">&copy; {new Date().getFullYear()} MotoSecure</p>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-5 sm:p-8">
          <Link to="/" className="lg:hidden">
            <Logo size={32} withWordmark />
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <div className="w-full max-w-sm">
            <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">
              {t("auth.loginTitle")}
            </h1>
            <p className="mt-2 text-sm text-navy-500 dark:text-navy-400">{t("auth.loginSubtitle")}</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <Field
                label={t("auth.email")}
                type="email"
                value={email}
                onChange={setEmail}
                required
                autoComplete="email"
              />
              <Field
                label={t("auth.password")}
                type="password"
                value={password}
                onChange={setPassword}
                required
                autoComplete="current-password"
              />

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
                {submitting ? t("auth.signingIn") : t("auth.signIn")}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-navy-500 dark:text-navy-400">
              {t("auth.noAccount")}{" "}
              <Link to="/register" className="font-semibold text-navy-800 dark:text-gold-400 hover:underline">
                {t("auth.registerLink")}
              </Link>
            </p>

            <details className="mt-8 rounded-xl border border-navy-100 dark:border-navy-800 p-4 text-xs text-navy-500 dark:text-navy-400">
              <summary className="cursor-pointer font-semibold text-navy-700 dark:text-navy-300">
                {t("auth.demoAccounts")}
              </summary>
              <ul className="mt-3 space-y-1.5 font-mono">
                <li>mayor@buea.cm / Mayor123!</li>
                <li>syndicate@buea.cm / Syndicate123!</li>
                <li>officer@buea.cm / Officer123!</li>
              </ul>
            </details>

            <Link
              to="/"
              className="mt-6 inline-block text-center w-full text-xs text-navy-400 hover:text-navy-600 dark:hover:text-navy-200"
            >
              &larr; {t("auth.backToSite")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, required, autoComplete }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-navy-600 dark:text-navy-300">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-navy-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3.5 py-2.5 text-sm text-navy-900 dark:text-white placeholder:text-navy-300 focus:border-gold-400 focus:ring-1 focus:ring-gold-400 outline-none transition-colors"
      />
    </label>
  );
}
