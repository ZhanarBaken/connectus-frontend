"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { DEFAULT_LOCALE, dict, SUPPORTED_LOCALES, type Locale } from "./dict"

const STORAGE_KEY = "locale"

interface LocaleContextValue {
  locale: Locale
  setLocale: (next: Locale) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function isLocale(value: string | null): value is Locale {
  return value !== null && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) {
      if (stored !== locale) setLocaleState(stored)
      document.documentElement.lang = stored
    }
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next
  }, [])

  const t = useCallback(
    (key: string) => {
      return dict[locale][key] ?? dict[DEFAULT_LOCALE][key] ?? key
    },
    [locale]
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider")
  return ctx
}

export function useT() {
  return useLocale().t
}
