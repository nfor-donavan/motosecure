import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import LanguageToggle from "../components/LanguageToggle";
import { IconDashboard, IconUnion, IconShield, IconChevronRight } from "../components/icons";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

export default function Landing() {
  const { t } = useTranslation();

  const pillars = [
    { icon: IconDashboard, titleKey: "landing.pillarMayorTitle", descKey: "landing.pillarMayorDesc" },
    { icon: IconUnion, titleKey: "landing.pillarSyndicateTitle", descKey: "landing.pillarSyndicateDesc" },
    { icon: IconShield, titleKey: "landing.pillarEnforcementTitle", descKey: "landing.pillarEnforcementDesc" },
  ];

  const steps = [
    { titleKey: "landing.how1Title", descKey: "landing.how1Desc" },
    { titleKey: "landing.how2Title", descKey: "landing.how2Desc" },
    { titleKey: "landing.how3Title", descKey: "landing.how3Desc" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-navy-950 text-navy-900 dark:text-navy-50">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-navy-100 dark:border-navy-800 bg-white/90 dark:bg-navy-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo size={36} withWordmark />
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle className="hidden sm:inline-flex" />
            <ThemeToggle />
            <Link
              to="/login"
              className="ml-1 rounded-full bg-navy-900 dark:bg-gold-500 px-4 py-2 text-sm font-semibold text-white dark:text-navy-900 hover:bg-navy-700 dark:hover:bg-gold-400 transition-colors"
            >
              {t("auth.signIn")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-gradient opacity-[0.04] dark:opacity-20" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <div>
            <motion.h1
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={0}
              className="font-display text-4xl sm:text-5xl lg:text-[3.3rem] font-extrabold leading-[1.08] tracking-tight text-navy-900 dark:text-white"
            >
              {t("landing.heroTitle")}
            </motion.h1>
            <motion.p
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={1}
              className="mt-6 max-w-xl text-lg leading-relaxed text-navy-600 dark:text-navy-300"
            >
              {t("landing.heroSubtitle")}
            </motion.p>
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={2}
              className="mt-9 flex flex-col sm:flex-row gap-3"
            >
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-navy-900 dark:bg-gold-500 px-6 py-3.5 text-sm font-semibold text-white dark:text-navy-900 shadow-panel hover:bg-navy-700 dark:hover:bg-gold-400 transition-colors"
              >
                {t("landing.ctaPrimary")}
                <IconChevronRight />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-navy-200 dark:border-navy-700 px-6 py-3.5 text-sm font-semibold text-navy-800 dark:text-navy-100 hover:bg-navy-50 dark:hover:bg-navy-800 transition-colors"
              >
                {t("landing.ctaSecondary")}
              </Link>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              custom={3}
              className="mt-12 grid grid-cols-3 gap-6 border-t border-navy-100 dark:border-navy-800 pt-8"
            >
              <Stat value="10,000+" label={t("landing.statRiders")} />
              <Stat value="15+" label={t("landing.statCouncils")} />
              <Stat value="99.9%" label={t("landing.statUptime")} />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative"
          >
            <div className="rounded-3xl bg-brand-gradient p-1.5 shadow-2xl">
              <div className="rounded-[1.3rem] bg-navy-900 p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <Logo size={32} />
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                    Live
                  </span>
                </div>
                <div className="mt-6 space-y-3">
                  <MockRow name="Enow Peter" zone="Molyko" status="Valid" tone="emerald" />
                  <MockRow name="Ashu Collins" zone="Molyko" status="Valid" tone="emerald" />
                  <MockRow name="Tabe Junior" zone="Great Soppo" status="Flagged" tone="rose" />
                  <MockRow name="Divine Ngala" zone="Molyko" status="Review" tone="gold" />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {["Riders", "Bikes", "Incidents"].map((l, i) => (
                    <div key={l} className="rounded-xl bg-white/5 p-3 text-center">
                      <p className="font-display text-xl font-bold text-white">
                        {["1,248", "1,190", "6"][i]}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-navy-400">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden sm:block rounded-2xl bg-gold-500 px-4 py-3 shadow-xl">
              <p className="text-xs font-semibold text-navy-900">Badge scanned</p>
              <p className="text-[11px] text-navy-800">Molyko Roundabout · 0.4s</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 border-t border-navy-100 dark:border-navy-800">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-900 dark:text-white max-w-xl">
          {t("landing.pillarsTitle")}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map(({ icon: Icon, titleKey, descKey }, i) => (
            <motion.div
              key={titleKey}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={i}
              className="rounded-2xl border border-navy-100 dark:border-navy-800 p-6 hover:border-gold-400/60 dark:hover:border-gold-500/40 transition-colors"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 dark:bg-gold-500 text-white dark:text-navy-900">
                <Icon />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-navy-900 dark:text-white">
                {t(titleKey)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500 dark:text-navy-400">
                {t(descKey)}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-navy-100 dark:border-navy-800 bg-navy-50/60 dark:bg-navy-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-900 dark:text-white max-w-xl">
            {t("landing.howTitle")}
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.titleKey} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 dark:bg-gold-500 text-sm font-bold text-white dark:text-navy-900">
                    {i + 1}
                  </span>
                  <h3 className="font-display font-bold text-navy-900 dark:text-white">{t(s.titleKey)}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-navy-500 dark:text-navy-400">
                  {t(s.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-100 dark:border-navy-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size={28} withWordmark />
          <p className="text-xs text-navy-400 dark:text-navy-500 text-center sm:text-right">
            &copy; {new Date().getFullYear()} MotoSecure. {t("landing.footerRights")}
            <br className="sm:hidden" /> {t("landing.footerBuilt")}
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <p className="font-display text-2xl font-extrabold text-navy-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs leading-snug text-navy-500 dark:text-navy-400">{label}</p>
    </div>
  );
}

function MockRow({ name, zone, status, tone }) {
  const tones = {
    emerald: "bg-emerald-500/15 text-emerald-400",
    rose: "bg-rose-500/15 text-rose-400",
    gold: "bg-gold-500/15 text-gold-400",
  };
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5">
      <div>
        <p className="text-sm font-semibold text-white">{name}</p>
        <p className="text-xs text-navy-400">{zone}</p>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>{status}</span>
    </div>
  );
}
