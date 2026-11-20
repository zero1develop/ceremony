"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getClientConfig, type ClientCeremonyConfig } from "@/lib/ceremony-config";
import { zhCNCopy } from "@/copy.zh-CN";

export type Locale = "en" | "zh-CN";

const CeremonyConfigContext = createContext<ClientCeremonyConfig | null>(null);
const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
} | null>(null);

const clientConfig = getClientConfig();

export function CeremonyConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("ceremony-locale");
    const detected = navigator.language.toLowerCase().startsWith("zh")
      ? "zh-CN"
      : "en";
    setLocaleState(saved === "zh-CN" || saved === "en" ? saved : detected);
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem("ceremony-locale", next);
    document.documentElement.lang = next;
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const localizedConfig = useMemo(
    () => ({ ...clientConfig, copy: locale === "zh-CN" ? zhCNCopy : clientConfig.copy }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <CeremonyConfigContext.Provider value={localizedConfig}>
        {children}
      </CeremonyConfigContext.Provider>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within CeremonyConfigProvider");
  return ctx;
}

export function useCeremonyConfig(): ClientCeremonyConfig {
  const ctx = useContext(CeremonyConfigContext);
  if (!ctx) {
    throw new Error(
      "useCeremonyConfig must be used within CeremonyConfigProvider",
    );
  }
  return ctx;
}
