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

export type ThemePref = "light" | "dark" | "system";
export type ThemeResolved = "light" | "dark";

interface ThemeContextValue {
  pref: ThemePref;
  resolved: ThemeResolved;
  setPref: (next: ThemePref) => void;
  cycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolve(pref: ThemePref): ThemeResolved {
  if (pref !== "system") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => {
    if (typeof document === "undefined") return "system";
    return (document.documentElement.getAttribute("data-theme-pref") as ThemePref) ?? "system";
  });
  const [resolved, setResolved] = useState<ThemeResolved>(() => {
    if (typeof document === "undefined") return "light";
    return (document.documentElement.getAttribute("data-theme") as ThemeResolved) ?? "light";
  });

  const apply = useCallback((next: ThemePref) => {
    const r = resolve(next);
    setResolved(r);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", r);
      document.documentElement.setAttribute("data-theme-pref", next);
    }
  }, []);

  const setPref = useCallback(
    (next: ThemePref) => {
      setPrefState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("theme", next);
      }
      apply(next);
    },
    [apply],
  );

  useEffect(() => {
    if (typeof window === "undefined" || pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => apply("system");
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [pref, apply]);

  const cycle = useCallback(() => {
    setPref(pref === "light" ? "dark" : pref === "dark" ? "system" : "light");
  }, [pref, setPref]);

  const value = useMemo<ThemeContextValue>(() => ({ pref, resolved, setPref, cycle }), [pref, resolved, setPref, cycle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
