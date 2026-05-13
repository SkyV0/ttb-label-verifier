"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, type Locale } from "./I18nProvider";
import { useTheme, type ThemePref } from "./ThemeProvider";

const LOCALES: Locale[] = ["en", "es"];

function ThemeButton() {
  const { pref, cycle, resolved } = useTheme();
  const { t } = useI18n();
  const labelKey: Record<ThemePref, "nav.theme_light" | "nav.theme_dark" | "nav.theme_system"> = {
    light: "nav.theme_light",
    dark: "nav.theme_dark",
    system: "nav.theme_system",
  };
  const fullLabel = `${t("nav.theme")}: ${t(labelKey[pref])}`;

  return (
    <button
      type="button"
      className="icon-button icon-button--square"
      onClick={cycle}
      aria-label={fullLabel}
      title={fullLabel}
    >
      {pref === "light" ? (
        <SunIcon />
      ) : pref === "dark" ? (
        <MoonIcon />
      ) : (
        <SystemIcon resolved={resolved} />
      )}
    </button>
  );
}

function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="locale-switch" aria-label={t("nav.language")}>
      <select
        className="locale-switch__select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {l.toUpperCase()}
          </option>
        ))}
      </select>
      <span className="locale-switch__chevron" aria-hidden>
        ▾
      </span>
    </label>
  );
}

function BrandMark() {
  // Inline SVG: rounded-square badge in accent color with a checkmark. Signals
  // "verification" without repeating "TTB" right next to the wordmark.
  return (
    <span className="app-header__brand-mark" aria-hidden>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5l4.5 4.5L19 7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SystemIcon({ resolved }: { resolved: "light" | "dark" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {resolved === "dark" ? (
        <path d="M3 11h18" stroke="currentColor" strokeWidth="2" />
      ) : null}
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link href="/" className="app-header__brand">
          <BrandMark />
          <span className="app-header__brand-text">{t("app.title")}</span>
        </Link>
        <nav className="app-header__nav" aria-label="primary">
          <Link
            href="/"
            className="nav-link"
            aria-current={pathname === "/" ? "page" : undefined}
          >
            {t("nav.single")}
          </Link>
          <Link
            href="/batch"
            className="nav-link"
            aria-current={pathname === "/batch" ? "page" : undefined}
          >
            {t("nav.batch")}
          </Link>
          <span className="app-header__divider" aria-hidden />
          <LocaleSwitcher />
          <ThemeButton />
        </nav>
      </div>
    </header>
  );
}
