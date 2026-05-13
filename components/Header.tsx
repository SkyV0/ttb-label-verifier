"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, type Locale } from "./I18nProvider";
import { useTheme, type ThemePref } from "./ThemeProvider";

const LOCALES: Locale[] = ["en", "es"];

function ThemeButton() {
  const { pref, cycle, resolved } = useTheme();
  const { t } = useI18n();
  const icon = resolved === "dark" ? "☾" : "☀";
  const labelKey: Record<ThemePref, "nav.theme_light" | "nav.theme_dark" | "nav.theme_system"> = {
    light: "nav.theme_light",
    dark: "nav.theme_dark",
    system: "nav.theme_system",
  };
  return (
    <button
      type="button"
      className="icon-button"
      onClick={cycle}
      aria-label={`${t("nav.theme")}: ${t(labelKey[pref])}`}
      title={`${t("nav.theme")}: ${t(labelKey[pref])}`}
    >
      <span aria-hidden>{icon}</span> {t(labelKey[pref])}
    </button>
  );
}

function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <select
      aria-label={t("nav.language")}
      className="icon-button"
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {l.toUpperCase()}
        </option>
      ))}
    </select>
  );
}

export function Header() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link href="/" className="app-header__brand">
          <span className="app-header__brand-mark" aria-hidden>TTB</span>
          <span>{t("app.title")}</span>
        </Link>
        <nav className="app-header__nav" aria-label="primary">
          <Link href="/" className="nav-link" aria-current={pathname === "/" ? "page" : undefined}>
            {t("nav.single")}
          </Link>
          <Link href="/batch" className="nav-link" aria-current={pathname === "/batch" ? "page" : undefined}>
            {t("nav.batch")}
          </Link>
          <LocaleSwitcher />
          <ThemeButton />
        </nav>
      </div>
    </header>
  );
}
