"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchOrders } from "@/lib/api"
import { Order, ChatMessage } from "@/types"

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  in_progress: "В работе",
  completed: "Завершён",
  disputed: "Спор",
  cancelled: "Отменён",
}

const STATUS_STYLE: Record<string, string> = {
  pending_payment: "bg-yellow-50 text-yellow-700 border-yellow-200",
  paid: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  disputed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
}

// Mock chat messages for UI preview
const MOCK_CHAT: ChatMessage[] = [
  {
    id: 1,
    sender_id: 99,
    sender_role: "mentor",
    content: "Привет! Спасибо за заказ. Когда тебе удобно провести консультацию?",
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 2,
    sender_id: 1,
    sender_role: "student",
    content: "Привет! Мне удобно в субботу после 14:00 по Алматы.",
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 3,
    sender_id: 99,
    sender_role: "mentor",
    content: "Отлично, договорились! В субботу в 14:00. Я пришлю ссылку на Zoom за час до встречи.",
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
]

interface Props {
  params: Promise<{ id: string }>
}

export default function OrderPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const r = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    setRole(r)

    fetchOrders()
      .then((orders) => {
        const found = orders.find((o) => o.id === Number(id))
        if (!found) { router.replace("/orders"); return }
        setOrder(found)
        // Load chat only if order is paid/in_progress/completed
        if (["paid", "in_progress", "completed"].includes(found.order_status)) {
          setMessages(MOCK_CHAT)
        }
      })
      .catch(() => router.replace("/orders"))
      .finally(() => setLoading(false))
  }, [id, router])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    setSending(true)
    // Optimistic update — real API call goes here when backend ready
    const msg: ChatMessage = {
      id: Date.now(),
      sender_id: 1,
      sender_role: role === "mentor" ? "mentor" : "student",
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, msg])
    setNewMessage("")
    setSending(false)
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) return null

  const canChat = ["paid", "in_progress", "completed"].includes(order.order_status)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/orders" className="hover:text-indigo-600 transition-colors">Заказы</Link>
          <span>/</span>
          <span className="text-gray-600">Заказ #{order.id}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order info */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h1 className="text-lg font-bold text-gray-900 mb-1">{order.service_title}</h1>
              <p className="text-sm text-gray-400 mb-4">Заказ #{order.id}</p>

              <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border mb-4 ${STATUS_STYLE[order.order_status] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {STATUS_LABEL[order.order_status] || order.order_status}
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Сумма</span>
                  <span className="font-bold text-gray-900">${order.total_price}</span>
                </div>
                {role === "mentor" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Выплата ментору</span>
                    <span className="font-semibold text-green-600">${order.mentor_payout_amount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Дата</span>
                  <span className="text-gray-600">{formatDate(order.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Counterpart info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                {role === "mentor" ? "Студент" : "Ментор"}
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 font-bold text-sm">
                    {role === "mentor"
                      ? (order.student_info?.full_name?.charAt(0) || "С")
                      : (order.mentor_email?.charAt(0).toUpperCase() || "М")}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {role === "mentor" ? order.student_info?.full_name : "Ментор"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {role === "mentor"
                      ? (order.student_info?.current_school_or_university || "")
                      : order.mentor_email}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment pending notice */}
            {order.order_status === "pending_payment" && role !== "mentor" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
                <h3 className="font-semibold text-yellow-800 mb-2">Ожидает оплаты</h3>
                <p className="text-sm text-yellow-700 leading-relaxed">
                  После подтверждения оплаты администратором откроется чат с ментором.
                </p>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 flex flex-col h-[540px]">
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-gray-50 flex-shrink-0">
                <h2 className="font-semibold text-gray-900">Сообщения</h2>
                {canChat ? (
                  <p className="text-xs text-gray-400 mt-0.5">Все переговоры ведутся только на платформе</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">Чат откроется после подтверждения оплаты</p>
                )}
              </div>

              {/* Messages */}
              {canChat ? (
                <>
                  <div ref={chatRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm">Начните переписку</p>
                      </div>
                    )}
                    {messages.map((msg) => {
                      const isOwn = (role === "mentor" && msg.sender_role === "mentor") ||
                                    (role !== "mentor" && msg.sender_role === "student")
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                            {!isOwn && (
                              <span className="text-xs text-gray-400 px-1">
                                {msg.sender_role === "mentor" ? "Ментор" : "Студент"}
                              </span>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isOwn
                                ? "bg-indigo-600 text-white rounded-br-sm"
                                : "bg-gray-100 text-gray-800 rounded-bl-sm"
                            }`}>
                              {msg.content}
                            </div>
                            <span className="text-xs text-gray-300 px-1">{formatTime(msg.created_at)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Input */}
                  <div className="px-4 py-4 border-t border-gray-50 flex-shrink-0">
                    <form onSubmit={handleSend} className="flex gap-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Написать сообщение..."
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 flex-shrink-0"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </form>
                    <p className="text-xs text-gray-300 mt-2 text-center">
                      Запрещено передавать личные контакты — нарушение правил платформы
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center px-8">
                    <div className="text-5xl mb-4">🔒</div>
                    <h3 className="font-semibold text-gray-900 mb-2">Чат заблокирован</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Чат с ментором откроется после подтверждения оплаты администратором
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
