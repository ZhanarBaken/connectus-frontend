"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter, Link } from "@/i18n/navigation"
import { fetchOrders, fetchMentors, clearAuth } from "@/lib/api"
import { Order } from "@/types"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"
import { Avatar } from "@/components/Avatar"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"

const STATUS_KEY: Record<string, string> = {
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

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  pending_payment: "bg-yellow-50 text-yellow-700",
  paid: "bg-blue-50 text-blue-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  completed: "bg-green-50 text-green-700",
  disputed: "bg-red-50 text-red-700",
  payout_pending: "bg-gray-100 text-gray-500",
  paid_out: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-400",
}

export default function MessagesPage() {
  const t = useTranslations("Messages")
  const tStatus = useTranslations("OrderStatus")
  const router = useRouter()
  const { isInTelegram, webApp } = useTelegramWebApp()
  useEffect(() => {
    if (webApp) {
      try { webApp.expand() } catch { /* older clients */ }
    }
  }, [webApp])
  const [role, setRole] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Order[]>([])
  const [mentorNames, setMentorNames] = useState<Record<number, string>>({})
  const [mentorPhotos, setMentorPhotos] = useState<Record<number, string | null>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { router.replace("/auth/login?next=/messages"); return }
    const r = localStorage.getItem("role")
    setRole(r)

    fetchOrders()
      .then(async (orders) => {
        // Show only orders that already have a chat conversation.
        // The backend creates one when a mentor accepts a free consultation.
        const withChat = orders
          .filter((o) => o.conversation_id !== null)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
        // De-dupe by conversation_id (multiple orders can share one conversation)
        const seen = new Set<number>()
        const unique: Order[] = []
        for (const o of withChat) {
          if (o.conversation_id === null) continue
          if (seen.has(o.conversation_id)) continue
          seen.add(o.conversation_id)
          unique.push(o)
        }
        setConversations(unique)

        if (r !== "mentor") {
          try {
            const mentors = await fetchMentors()
            const nameMap: Record<number, string> = {}
            const photoMap: Record<number, string | null> = {}
            for (const m of mentors) {
              nameMap[m.id] = m.full_name
              photoMap[m.id] = m.profile_photo
            }
            setMentorNames(nameMap)
            setMentorPhotos(photoMap)
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        clearAuth()
        router.replace("/auth/login")
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`bg-[#fafafa] ${isInTelegram ? "min-h-[100dvh]" : "min-h-screen"}`}>
      <div className={`max-w-3xl mx-auto ${isInTelegram ? "px-3 py-3" : "px-4 py-10"}`}>
        {!isInTelegram && (
          <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-4 transition-colors group [-webkit-tap-highlight-color:transparent]" />
        )}
        <div className={isInTelegram ? "mb-4" : "mb-8"}>
          <h1 className={`font-bold text-gray-900 ${isInTelegram ? "text-xl" : "text-2xl"}`}>{t("title")}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {role === "mentor"
              ? t("subtitleMentor")
              : t("subtitleStudent")}
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="mb-4 flex justify-center">
              <Icon name="chat" size={48} className="text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{t("emptyTitle")}</h3>
            <p className="text-sm text-gray-400 mb-6">
              {role === "mentor"
                ? t("emptyBodyMentor")
                : t("emptyBodyStudent")}
            </p>
            {role !== "mentor" && (
              <Link
                href="/mentors"
                className="inline-flex bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                {t("findMentor")}
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {conversations.map((order, i) => {
              const counterpartName = role === "mentor"
                ? (order.student_info?.full_name?.trim().split(/\s+/)[0] || t("applicantDefault"))
                : (mentorNames[order.mentor] || t("mentorDefault"))
              const counterpartPhoto = role === "mentor"
                ? (order.student_info?.profile_photo ?? null)
                : (mentorPhotos[order.mentor] ?? null)
              const dateLabel = new Date(order.created_at).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
              })

              const statusLabel = STATUS_KEY[order.order_status] ? tStatus(STATUS_KEY[order.order_status]) : order.order_status
              const statusStyle = STATUS_STYLE[order.order_status] || "bg-gray-100 text-gray-500"

              return (
                <Link
                  key={order.conversation_id ?? order.id}
                  // Inside the Mini App, the order page hides the chat behind a CTA
                  // by default — but from the inbox the user clearly wants the chat,
                  // so reuse the existing `?chat=open` deep-link param that TG
                  // notifications already use to land straight in the fullscreen chat.
                  href={isInTelegram ? `/orders/${order.id}?chat=open` : `/orders/${order.id}`}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                    i < conversations.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <Avatar
                    src={counterpartPhoto}
                    name={counterpartName}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500"
                    letterClassName="text-white font-bold"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{counterpartName}</h3>
                      <span className="text-xs text-gray-400 flex-shrink-0">{dateLabel}</span>
                    </div>
                    <p className="text-xs text-indigo-600 truncate mt-0.5">{order.service_title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusStyle}`}>
                        {statusLabel}
                      </span>
                      <span className="text-xs text-gray-400 truncate">{t("openChat")}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
