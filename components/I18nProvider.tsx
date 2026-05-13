"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import en from "@/lib/i18n/en.json";
import es from "@/lib/i18n/es.json";

export type Locale = "en" | "es";

const DICTIONARIES = { en, es } as const;

type Dictionary = typeof en;

type DotPath<T, P extends string = ""> = {
  [K in keyof T]: T[K] extends string
    ? `${P}${K & string}`
    : DotPath<T[K], `${P}${K & string}.`>;
}[keyof T];

export type I18nKey = DotPath<Dictionary>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem("locale");
  if (stored === "en" || stored === "es") return stored;
  const nav = navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("es")) return "es";
  return "en";
}

function lookup(dict: unknown, key: string): string {
  const parts = key.split(".");
  let cursor: unknown = dict;
  for (const part of parts) {
    if (cursor && typeof cursor === "object" && part in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof cursor === "string" ? cursor : key;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(detectInitialLocale());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("locale", next);
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTIONARIES[locale];
    return {
      locale,
      setLocale,
      t: (key, vars) => interpolate(lookup(dict, key), vars),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return ctx;
}
