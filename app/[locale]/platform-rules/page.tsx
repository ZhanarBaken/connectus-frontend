"use client"

import { useEffect, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { fetchPublicSettings } from "@/lib/api"
import Logo from "@/components/Logo"
import MarkdownText from "@/components/MarkdownText"

type Status = "loading" | "ready" | "error"

export default function PlatformRulesPage() {
  const t = useTranslations("Legal")
  const locale = useLocale()
  const [status, setStatus] = useState<Status>("loading")
  const [text, setText] = useState("")

  useEffect(() => {
    fetchPublicSettings(locale)
      .then((s) => {
        setText(s.platform_rules_text)
        setStatus("ready")
      })
      .catch(() => setStatus("error"))
  }, [locale])

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <Logo size={32} className="text-gray-900" />
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("PlatformRules.title")}</h1>

          {status === "loading" && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {status === "error" && (
            <p className="text-sm text-red-600">{t("loadError")}</p>
          )}

          {status === "ready" && text.trim() === "" && (
            <p className="text-sm text-gray-500">{t("PlatformRules.empty")}</p>
          )}

          {status === "ready" && text.trim() !== "" && (
            <MarkdownText text={text} className="text-sm" />
          )}
        </div>
      </div>
    </div>
  )
}
