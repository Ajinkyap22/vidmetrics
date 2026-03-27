"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "vidmetrics-theme";
const THEME_EVENT = "vidmetrics-theme-change";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
} | null>(null);

function applyClass(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (typeof window === "undefined") {
    return () => listeners.delete(callback);
  }

  const mm = window.matchMedia("(prefers-color-scheme: dark)");
  const onMm = () => notify();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) notify();
  };
  const onCustom = () => notify();

  mm.addEventListener("change", onMm);
  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_EVENT, onCustom);

  return () => {
    listeners.delete(callback);
    mm.removeEventListener("change", onMm);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_EVENT, onCustom);
  };
}

function readStoredOrSystem(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getSnapshot(): Theme {
  if (typeof window === "undefined") return "light";
  if (!hydrated) return "light";
  return readStoredOrSystem();
}

function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useLayoutEffect(() => {
    if (!hydrated) {
      hydrated = true;
      notify();
    }
  }, []);

  useLayoutEffect(() => {
    applyClass(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
