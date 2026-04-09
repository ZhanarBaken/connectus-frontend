"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchOrders, fetchMentors } from "@/lib/api"
import { Order } from "@/types"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"

const STATUS_LABEL: Record<string, string> = {
  draft: "Запрос",
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  in_progress: "В работе",
  completed: "Завершён",
  disputed: "Спор",
  payout_pending: "Ожидает выплаты",
  paid_out: "Выплачен",
  cancelled: "Отменён",
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
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Order[]>([])
  const [mentorNames, setMentorNames] = useState<Record<number, string>>({})
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
            const map: Record<number, string> = {}
            for (const m of mentors) map[m.id] = m.full_name
            setMentorNames(map)
          } catch {
            // ignore
          }
        }
      })
      .catch(() => router.replace("/auth/login"))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-4 transition-colors group [-webkit-tap-highlight-color:transparent]" />
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Сообщения</h1>
          <p className="text-sm text-gray-400 mt-1">
            {role === "mentor"
              ? "Чаты со студентами по принятым консультациям"
              : "Чаты с менторами по твоим заказам"}
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="mb-4 flex justify-center">
              <Icon name="chat" size={48} className="text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Пока нет чатов</h3>
            <p className="text-sm text-gray-400 mb-6">
              {role === "mentor"
                ? "Прими запрос на бесплатную консультацию — откроется чат со студентом"
                : "Запроси бесплатную консультацию у ментора — после принятия откроется чат"}
            </p>
            {role !== "mentor" && (
              <Link
                href="/mentors"
                className="inline-flex bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Найти ментора
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {conversations.map((order, i) => {
              const counterpartName = role === "mentor"
                ? (order.student_info?.full_name?.trim().split(/\s+/)[0] || "Студент")
                : (mentorNames[order.mentor] || "Ментор")
              const initial = counterpartName.charAt(0).toUpperCase()
              const dateLabel = new Date(order.created_at).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
              })

              const statusLabel = STATUS_LABEL[order.order_status] || order.order_status
              const statusStyle = STATUS_STYLE[order.order_status] || "bg-gray-100 text-gray-500"

              return (
                <Link
                  key={order.conversation_id ?? order.id}
                  href={`/orders/${order.id}`}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                    i < conversations.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 font-bold">{initial}</span>
                  </div>

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
                      <span className="text-xs text-gray-400 truncate">Открыть чат →</span>
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
