"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { fetchMentorEarnings, type MentorEarnings } from "@/lib/api"
import { useMentorOnboardingGate } from "@/lib/useMentorOnboardingGate"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"
import MentorStatusBanner from "@/components/MentorStatusBanner"

function formatAmount(value: string): string {
  const num = Number(value)
  if (Number.isNaN(num)) return `${value} ₸`
  return `${num.toLocaleString("ru-RU")} ₸`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default function MentorEarningsPage() {
  const t = useTranslations("Dashboard.MentorEarnings")
  const router = useRouter()
  useMentorOnboardingGate()
  const [data, setData] = useState<MentorEarnings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const METHOD_LABEL: Record<string, string> = {
    kaspi: t("methodKaspi"),
    bank: t("methodBank"),
    cash: t("methodCash"),
    other: t("methodOther"),
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/auth/login?next=/mentor/earnings")
      return
    }
    fetchMentorEarnings()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : t("errorLoading")))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#fafafa] px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <BackButton fallbackHref="/mentor/dashboard" />
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mt-4">
            {error || t("errorGeneric")}
          </div>
        </div>
      </div>
    )
  }

  const hasPayouts = data.payouts.length > 0

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <MentorStatusBanner />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <BackButton fallbackHref="/mentor/dashboard" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-4">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        {/* Three KPI tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Icon name="schedule" size={16} className="text-amber-500" />
              {t("inProgress")}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatAmount(data.pending_amount)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t("inProgressHint")}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Icon name="account_balance_wallet" size={16} className="text-indigo-500" />
              {t("toBePaid")}
            </div>
            <p className="text-2xl font-bold text-indigo-700">
              {formatAmount(data.earned_unpaid_amount)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t("toBePaidHint")}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Icon name="check_circle" size={16} className="text-emerald-500" />
              {t("paidOut")}
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              {formatAmount(data.earned_paid_amount)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t("paidOutHint")}
            </p>
          </div>
        </div>

        {/* How payouts work */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-indigo-900 mb-2 inline-flex items-center gap-1.5">
            <Icon name="info" size={16} className="text-indigo-600" filled />
            {t("howPayoutsWorkTitle")}
          </h2>
          <p className="text-xs text-indigo-800 leading-relaxed">
            {t("howPayoutsWorkBody")}
          </p>
        </div>

        {/* Payouts history */}
        <h2 className="text-base font-semibold text-gray-900 mb-3">{t("payoutHistory")}</h2>
        {!hasPayouts ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Icon name="receipt_long" size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t("noPayoutsTitle")}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t("noPayoutsBody")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.payouts.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-lg font-bold text-gray-900">
                        +{formatAmount(p.amount)}
                      </p>
                      <span className="text-xs text-gray-500">{formatDate(p.paid_at)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        {METHOD_LABEL[p.method] || p.method}
                      </span>
                      {p.note && (
                        <span className="text-gray-500">{p.note}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
