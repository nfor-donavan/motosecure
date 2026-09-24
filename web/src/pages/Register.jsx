import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import LanguageToggle from "../components/LanguageToggle";

const initialForm = {
  tenantSlug: "buea",
  syndicateName: "",
  zone: "",
  presidentName: "",
  presidentPhone: "",
  adminFullName: "",
  email: "",
  phone: "",
  password: "",
};

export default function Register() {
  const { t } = useTranslation();
  const { setUser, setTenant } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/register-syndicate", form);
      window.localStorage.setItem("motosecure-token", data.token);
      setUser(data.user);
      setTenant(null);
      setSuccess(true);
      setTimeout(() => navigate("/app"), 1400);
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-50/40 dark:bg-navy-950">
      <div className="flex items-center justify-between p-5 sm:p-8 max-w-3xl mx-auto">
        <Link to="/">
          <Logo size={32} withWordmark />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 pb-16 sm:px-8">
        <div className="rounded-3xl border border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-900 p-6 sm:p-10 shadow-panel dark:shadow-panel-dark">
          <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">
            {t("auth.registerTitle")}
          </h1>
          <p className="mt-2 text-sm text-navy-500 dark:text-navy-400">{t("auth.registerSubtitle")}</p>

          {success ? (
            <div className="mt-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {t("auth.registerSuccess")}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <Section title={t("auth.councilSlug")}>
                <Field label={t("auth.councilSlug")} value={form.tenantSlug} onChange={update("tenantSlug")} required />
              </Section>

              <Section title={t("syndicates.title")}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={t("auth.syndicateName")} value={form.syndicateName} onChange={update("syndicateName")} required />
                  <Field label={t("auth.zone")} value={form.zone} onChange={update("zone")} required />
                  <Field label={t("auth.presidentName")} value={form.presidentName} onChange={update("presidentName")} required />
                  <Field label={t("auth.presidentPhone")} value={form.presidentPhone} onChange={update("presidentPhone")} required />
                </div>
              </Section>

              <Section title={t("auth.adminFullName")}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={t("auth.adminFullName")} value={form.adminFullName} onChange={update("adminFullName")} required />
                  <Field label={t("auth.phone")} value={form.phone} onChange={update("phone")} required />
                  <Field label={t("auth.email")} type="email" value={form.email} onChange={update("email")} required />
                  <Field label={t("auth.password")} type="password" value={form.password} onChange={update("password")} required />
                </div>
              </Section>

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
                {submitting ? t("auth.submitting") : t("auth.submit")}
              </button>

              <Link to="/login" className="block text-center text-xs text-navy-400 hover:text-navy-600 dark:hover:text-navy-200">
                &larr; {t("auth.backToSite")}
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-400 dark:text-navy-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, type = "text", value, onChange, required }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-navy-600 dark:text-navy-300">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={onChange}
        className="w-full rounded-xl border border-navy-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3.5 py-2.5 text-sm text-navy-900 dark:text-white focus:border-gold-400 focus:ring-1 focus:ring-gold-400 outline-none transition-colors"
      />
    </label>
  );
}
