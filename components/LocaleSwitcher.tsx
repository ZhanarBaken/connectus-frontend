"use client"

import { useLocale } from "@/lib/i18n/LocaleProvider"
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/i18n/dict"

export default function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale()

  return (
    <div className={`inline-flex items-center gap-0.5 bg-[#fafafa] border border-gray-200/60 rounded-xl p-0.5 ${className}`}>
      {SUPPORTED_LOCALES.map((code) => {
        const active = code === locale
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              active
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
            aria-pressed={active}
          >
            {LOCALE_LABELS[code]}
          </button>
        )
      })}
    </div>
  )
}
