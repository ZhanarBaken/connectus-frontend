"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchOrders, fetchMentors } from "@/lib/api"
import { Order } from "@/types"
import {
  getLastMessage,
  getOrderUnreadCount,
  MESSAGES_KEY,
  UNREAD_KEY,
  type StoredMessage,
} from "@/lib/messages"

interface Conversation {
  order: Order
  lastMessage: StoredMessage | null
  unread: number
}

const CHATABLE_STATUSES = new Set(["paid", "in_progress", "completed"])

export default function MessagesPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [mentorNames, setMentorNames] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)

  const buildConversations = useCallback((orderList: Order[], viewerRole: string | null): Conversation[] => {
    const viewer: "student" | "mentor" = viewerRole === "mentor" ? "mentor" : "student"
    const chatable = orderList.filter((o) => CHATABLE_STATUSES.has(o.order_status))
    const convs: Conversation[] = chatable.map((order) => ({
      order,
      lastMessage: getLastMessage(order.id),
      unread: getOrderUnreadCount(order.id, viewer),
    }))
    convs.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.order.created_at
      const bTime = b.lastMessage?.createdAt || b.order.created_at
      return bTime.localeCompare(aTime)
    })
    return convs
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { router.replace("/auth/login?next=/messages"); return }
    const r = localStorage.getItem("role")
    setRole(r)

    fetchOrders()
      .then(async (fetched) => {
        setOrders(fetched)
        setConversations(buildConversations(fetched, r))
        // For students: build mentor name lookup
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
  }, [router, buildConversations])

  // Live refresh on storage changes + polling fallback
  useEffect(() => {
    if (orders.length === 0) return
    const refresh = () => setConversations(buildConversations(orders, role))
    const onStorage = (e: StorageEvent) => {
      if (e.key === MESSAGES_KEY || e.key === UNREAD_KEY) refresh()
    }
    window.addEventListener("storage", onStorage)
    const interval = setInterval(refresh, 2000)
    return () => {
      window.removeEventListener("storage", onStorage)
      clearInterval(interval)
    }
  }, [orders, role, buildConversations])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) {
      return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    }
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 7) {
      return d.toLocaleDateString("ru-RU", { weekday: "short" })
    }
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
  }

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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Сообщения</h1>
          <p className="text-sm text-gray-400 mt-1">
            {role === "mentor" ? "Чаты со студентами по твоим услугам" : "Чаты с менторами по твоим заказам"}
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="font-semibold text-gray-900 mb-2">Пока нет сообщений</h3>
            <p className="text-sm text-gray-400 mb-6">
              {role === "mentor"
                ? "Чаты появятся когда студенты оплатят твои услуги"
                : "Закажи услугу — после оплаты откроется чат с ментором"}
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
            {conversations.map((conv, i) => {
              const { order, lastMessage, unread } = conv
              const counterpartName = role === "mentor"
                ? (order.student_info?.full_name?.trim().split(/\s+/)[0] || "Студент")
                : (mentorNames[order.mentor] || "Ментор")
              const initial = counterpartName.charAt(0).toUpperCase()
              const ownRole = role === "mentor" ? "mentor" : "student"

              const previewText = lastMessage
                ? `${lastMessage.senderRole === ownRole ? "Вы: " : ""}${lastMessage.content}`
                : "Нет сообщений — начните переписку"

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                    i < conversations.length - 1 ? "border-b border-gray-50" : ""
                  } ${unread > 0 ? "bg-indigo-50/40" : ""}`}
                >
                  {/* Avatar */}
                  <div className="relative w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 font-bold">{initial}</span>
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className={`truncate ${unread > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-900"}`}>
                        {counterpartName}
                      </h3>
                      <span className={`text-xs flex-shrink-0 ${unread > 0 ? "text-indigo-600 font-semibold" : "text-gray-400"}`}>
                        {lastMessage ? formatTime(lastMessage.createdAt) : formatTime(order.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-600 truncate mt-0.5">
                      {order.service_title}
                    </p>
                    <p className={`text-sm truncate mt-0.5 ${
                      lastMessage
                        ? unread > 0
                          ? "text-gray-900 font-medium"
                          : "text-gray-500"
                        : "text-gray-300 italic"
                    }`}>
                      {previewText}
                    </p>
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
