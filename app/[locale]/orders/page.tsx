"use client"

import { useState, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { authFetch, fetchOrders, fetchMentors } from "@/lib/api"
import { useStudentOnboardingGate } from "@/lib/useStudentOnboardingGate"
import { Order } from "@/types"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"

const STATUS_STYLE: Record<Order["order_status"], string> = {
  draft: "bg-gray-50 text-gray-500",
  pending_payment: "bg-yellow-50 text-yellow-700",
  paid: "bg-blue-50 text-blue-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  completed: "bg-green-50 text-green-700",
  disputed: "bg-red-50 text-red-700",
  payout_pending: "bg-gray-100 text-gray-500",
  paid_out: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-400",
}

const STATUS_KEY: Record<Order["order_status"], string> = {
  draft: "draft",
  pending_payment: "pendingPayment",
  paid: "paid",
  in_progress: "inProgress",
  completed: "completed",
  disputed: "disputed",
  payout_pending: "payoutPending",
  paid_out: "paidOut",
  cancelled: "cancelled",
}

// Student-only order list — a mentor's equivalent view is the unified
// client window (/mentor/clients/[id]), which shows this same history
// grouped by client alongside tasks/documents/chat, so a mentor landing
// here (old bookmark, stale link) gets redirected there instead.
export default function OrdersPage() {
  const t = useTranslations("Orders.List")
  const tStatus = useTranslations("OrderStatus")
  const locale = useLocale()
  const router = useRouter()
  useStudentOnboardingGate()
  const [orders, setOrders] = useState<Order[]>([])
  const [mentorNames, setMentorNames] = useState<Record<number, string>>({})
  const [mentorNamesLoadError, setMentorNamesLoadError] = useState(false)
  const [loading, setLoading] = useState(true)

  // Small extra tag alongside the status pill for a support installment
  // that's overdue or paused — null when neither applies.
  const dunningTag = (order: Order): { text: string; className: string } | null => {
    if (order.order_status !== "pending_payment") return null
    if (order.engagement_status === "paused") {
      return { text: t("paused"), className: "bg-red-50 text-red-700" }
    }
    if (order.due_at && new Date(order.due_at) < new Date()) {
      return { text: t("overdue"), className: "bg-red-50 text-red-700" }
    }
    return null
  }

  const loadMentorNames = async () => {
    setMentorNamesLoadError(false)
    try {
      const mentors = await fetchMentors()
      const map: Record<number, string> = {}
      for (const m of mentors) map[m.id] = m.full_name
      setMentorNames(map)
    } catch {
      setMentorNamesLoadError(true)
    }
  }

  useEffect(() => {
    const r = localStorage.getItem("role")
    if (r === "mentor") {
      router.replace("/mentor/clients")
      return
    }
    fetchOrders()
      .then(async (list) => {
        setOrders(list)
        await loadMentorNames()
      })
      .finally(() => setLoading(false))
    authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me/`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-4 transition-colors group [-webkit-tap-highlight-color:transparent]" />
        <h1 className="text-2xl font-bold text-gray-900 mb-8">{t("titleStudent")}</h1>

        {mentorNamesLoadError && (
          <p className="text-xs text-red-600 mb-4">
            {t("mentorNamesLoadError")}{" "}
            <button type="button" onClick={loadMentorNames} className="font-semibold underline hover:no-underline">
              {t("retry")}
            </button>
          </p>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="mb-4 flex justify-center">
              <Icon name="description" size={48} className="text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{t("noOrdersTitle")}</h3>
            <p className="text-sm text-gray-400 mb-6">{t("noOrdersBody")}</p>
            <Link href="/mentors" className="inline-flex bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
              {t("findMentor")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start justify-between gap-4 hover:border-gray-300 hover:shadow-sm transition-all group block"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                    {order.service_title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">
                    {mentorNames[order.mentor] || t("mentorDefault")}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    {new Date(order.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {dunningTag(order) && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${dunningTag(order)!.className}`}>
                      {dunningTag(order)!.text}
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[order.order_status]}`}>
                    {tStatus(STATUS_KEY[order.order_status])}
                  </span>
                  <span className="text-lg font-bold text-gray-900">{Number(order.total_price).toLocaleString("ru-RU")} ₸</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
