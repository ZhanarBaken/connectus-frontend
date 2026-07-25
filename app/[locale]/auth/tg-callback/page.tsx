"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { telegramFinalize, fetchMe } from "@/lib/api"
import Icon from "@/components/Icon"
import Logo from "@/components/Logo"

type Status = "loading" | "success" | "error"

function TgCallbackContent() {
  const t = useTranslations("Auth.TgCallback")
  const params = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<Status>("loading")
  const [error, setError] = useState("")

  useEffect(() => {
    const urlToken = params.get("token")
    const savedToken = localStorage.getItem("tg_signup_token")
    const token = urlToken || savedToken

    if (!token) {
      setError(t("errorNoToken"))
      setStatus("error")
      return
    }

    localStorage.removeItem("tg_signup_token")

    telegramFinalize(token)
      .then(async (data) => {
        localStorage.setItem("access_token", data.access)
        localStorage.setItem("refresh_token", data.refresh)

        // The role was already chosen on the website before this deep
        // link was issued (telegramStart(role)) and the bot only relays
        // it — there is nothing left to ask, so route straight through.
        const me = await fetchMe(data.access)
        localStorage.setItem("role", me.role)
        setStatus("success")
        setTimeout(() => {
          if (data.created) {
            router.push(me.role === "mentor" ? "/onboarding/mentor/identity" : "/onboarding/student")
          } else if (me.role === "mentor") {
            router.push("/mentor/dashboard")
          } else {
            router.push("/student/dashboard")
          }
        }, 1500)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("errorGeneric"))
        setStatus("error")
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, router])

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <Logo size={32} className="text-gray-900" />
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
          {status === "loading" && (
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm">{t("connecting")}</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <Icon name="check_circle" size={36} className="text-emerald-600" filled />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">{t("successTitle")}</h1>
              <p className="text-gray-500 text-sm">
                {t("redirecting")}
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="error" size={36} className="text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">{t("errorTitle")}</h1>
              <p className="text-gray-500 text-sm mb-6">{error}</p>
              <button
                onClick={() => router.push("/auth/login")}
                className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:border-gray-300 transition-colors text-sm"
              >
                {t("retry")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TgCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TgCallbackContent />
    </Suspense>
  )
}
