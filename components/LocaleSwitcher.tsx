"use client"

import { useLocale } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { updateUserLocale } from "@/lib/api"

const LOCALE_LABELS: Record<(typeof routing.locales)[number], string> = {
  ru: "RU",
  en: "EN",
  kk: "KZ",
}

export default function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className={`inline-flex items-center gap-0.5 bg-[#fafafa] border border-gray-200/60 rounded-xl p-0.5 ${className}`}>
      {routing.locales.map((code) => {
        const active = code === locale
        return (
          <button
            key={code}
            type="button"
            onClick={() => {
              router.replace(pathname, { locale: code })
              // Best-effort — keeps Telegram-generated links in the
              // right language later. Not blocking the route switch.
              // Failure here isn't always harmless: updateUserLocale
              // goes through authFetch, and an expired session's
              // refresh failure forces a full-page redirect to
              // /auth/login (same as any other authFetch call) rather
              // than just leaving the backend record stale — same
              // trade-off every other best-effort authFetch call in
              // the app already accepts.
              if (typeof window !== "undefined" && localStorage.getItem("access_token")) {
                void updateUserLocale(code).catch(() => {})
              }
            }}
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
