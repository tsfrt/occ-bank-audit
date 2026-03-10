"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme-preference";

function getSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function applyTheme(resolvedDark: boolean) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolvedDark ? "dark" : "light");
}

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  resolved: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    const resolvedDark = value === "dark" || (value === "system" && getSystemDark());
    setResolved(resolvedDark ? "dark" : "light");
    applyTheme(resolvedDark);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, value);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredPreference();
    setPreferenceState(stored);
    const resolvedDark = stored === "dark" || (stored === "system" && getSystemDark());
    setResolved(resolvedDark ? "dark" : "light");
    applyTheme(resolvedDark);
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const resolvedDark = mq.matches;
      setResolved(resolvedDark ? "dark" : "light");
      applyTheme(resolvedDark);
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, setPreference, resolved }),
    [preference, setPreference, resolved]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
