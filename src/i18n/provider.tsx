"use client";

import { NextIntlClientProvider } from "next-intl";
import { ReactNode, useState, useEffect, createContext, useContext } from "react";
import { Locale, defaultLocale, locales } from "./config";

import enMessages from "../../messages/en.json";
import ptMessages from "../../messages/pt.json";
import daMessages from "../../messages/da.json";

const messages: Record<Locale, typeof enMessages> = {
  en: enMessages,
  pt: ptMessages,
  da: daMessages,
};

type LocaleContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextType>({
  locale: defaultLocale,
  setLocale: () => {},
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale;
    if (saved && locales.includes(saved)) {
      setLocaleState(saved);
    }
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  if (!mounted) {
    return (
      <NextIntlClientProvider locale={defaultLocale} messages={messages[defaultLocale]}>
        {children}
      </NextIntlClientProvider>
    );
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
