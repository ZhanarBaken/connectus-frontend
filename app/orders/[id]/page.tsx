"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchOrder, fetchMentor, completeOrder } from "@/lib/api"
import { Order, Mentor } from "@/types"
import {
  getOrderMessages,
  addMessage,
  markOrderRead,
  MESSAGES_KEY,
  type StoredMessage,
} from "@/lib/messages"
import ReviewForm from "@/components/ReviewForm"

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

interface Props {
  params: Promise<{ id: string }>
}

export default function OrderPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState("")
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const r = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    setRole(r)

    fetchOrder(Number(id))
      .then(async (found) => {
        setOrder(found)
        if (["paid", "in_progress", "completed"].includes(found.order_status)) {
          setMessages(getOrderMessages(found.id))
          markOrderRead(found.id, r === "mentor" ? "mentor" : "student")
        }
        // Student needs the mentor's name (Order has only id + email)
        if (r !== "mentor") {
          try {
            const m = await fetchMentor(found.mentor)
            setMentor(m)
          } catch {
            // ignore — fallback name will be used
          }
        }
      })
      .catch(() => router.replace("/orders"))
      .finally(() => setLoading(false))
  }, [id, router])

  // Live sync — refresh messages when another tab writes to localStorage
  useEffect(() => {
    if (!order) return
    const onStorage = (e: StorageEvent) => {
      if (e.key === MESSAGES_KEY) {
        setMessages(getOrderMessages(order.id))
        markOrderRead(order.id, role === "mentor" ? "mentor" : "student")
      }
    }
    window.addEventListener("storage", onStorage)
    // Also poll every 2s as fallback (storage event doesn't fire in same tab)
    const interval = setInterval(() => {
      const fresh = getOrderMessages(order.id)
      setMessages((prev) => (prev.length !== fresh.length ? fresh : prev))
    }, 2000)
    return () => {
      window.removeEventListener("storage", onStorage)
      clearInterval(interval)
    }
  }, [order, role])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const handleComplete = async () => {
    if (!order) return
    if (!confirm("Отметить услугу выполненной? Студент сможет оставить отзыв, а ты получишь выплату после окончания периода споров.")) return
    setCompleting(true)
    setCompleteError("")
    try {
      const updated = await completeOrder(order.id)
      setOrder(updated)
    } catch (e: unknown) {
      setCompleteError(e instanceof Error ? e.message : "Не удалось завершить заказ")
    } finally {
      setCompleting(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !order) return
    setSending(true)
    const saved = addMessage({
      orderId: order.id,
      senderRole: role === "mentor" ? "mentor" : "student",
      content: newMessage.trim(),
    })
    setMessages((prev) => [...prev, saved])
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
                  <span className="font-bold text-gray-900">{Number(order.total_price).toLocaleString("ru-RU")} ₸</span>
                </div>
                {role === "mentor" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Выплата ментору</span>
                    <span className="font-semibold text-green-600">{Number(order.mentor_payout_amount).toLocaleString("ru-RU")} ₸</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Дата</span>
                  <span className="text-gray-600">{formatDate(order.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Counterpart info — only name shown, no contacts */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                {role === "mentor" ? "Студент" : "Ментор"}
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 font-bold text-sm">
                    {role === "mentor"
                      ? (order.student_info?.full_name?.trim().charAt(0).toUpperCase() || "С")
                      : (mentor?.full_name?.trim().charAt(0).toUpperCase() || "М")}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {role === "mentor"
                      ? (order.student_info?.full_name?.trim().split(/\s+/)[0] || "Студент")
                      : (mentor?.full_name || "Ментор")}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    Общение только в чате
                  </p>
                </div>
              </div>
            </div>

            {/* Mentor: complete service */}
            {role === "mentor" && order.order_status === "in_progress" && (
              <div className="bg-white border border-indigo-100 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-1">Завершить услугу</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Когда работа со студентом закончена, отметь услугу выполненной. Студент получит возможность оставить отзыв, а выплата уйдёт после периода споров (48ч).
                </p>
                {completeError && (
                  <p className="text-xs text-red-600 mb-3">{completeError}</p>
                )}
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {completing ? "Завершаем..." : "✓ Услуга выполнена"}
                </button>
              </div>
            )}

            {/* Mentor: completed banner */}
            {role === "mentor" && order.order_status === "completed" && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                <h3 className="font-semibold text-green-800 mb-1 text-sm">✓ Услуга завершена</h3>
                <p className="text-xs text-green-700 leading-relaxed">
                  После периода споров (48ч) выплата автоматически уйдёт на твой счёт.
                </p>
              </div>
            )}

            {/* Student: in progress notice */}
            {role !== "mentor" && order.order_status === "in_progress" && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <h3 className="font-semibold text-blue-800 mb-1 text-sm">🔵 В работе</h3>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Ментор работает над твоим заказом. Когда работа будет закончена, услуга станет завершённой и ты сможешь оставить отзыв.
                </p>
              </div>
            )}

            {/* Payment pending notice */}
            {order.order_status === "pending_payment" && role !== "mentor" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
                <h3 className="font-semibold text-yellow-800 mb-2">Ожидает оплаты</h3>
                <p className="text-sm text-yellow-700 leading-relaxed">
                  После подтверждения оплаты администратором откроется чат с ментором.
                </p>
              </div>
            )}

            {/* Review form — student only, after order is completed */}
            {role !== "mentor" && order.order_status === "completed" && (
              <ReviewForm
                orderId={order.id}
                mentorId={order.mentor}
                mentorName="Ментор"
                authorName={order.student_info?.full_name?.trim().split(/\s+/)[0] || "Студент"}
              />
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
                      const isOwn = (role === "mentor" && msg.senderRole === "mentor") ||
                                    (role !== "mentor" && msg.senderRole === "student")
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                            {!isOwn && (
                              <span className="text-xs text-gray-400 px-1">
                                {msg.senderRole === "mentor" ? "Ментор" : "Студент"}
                              </span>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isOwn
                                ? "bg-indigo-600 text-white rounded-br-sm"
                                : "bg-gray-100 text-gray-800 rounded-bl-sm"
                            }`}>
                              {msg.content}
                            </div>
                            <span className="text-xs text-gray-300 px-1">{formatTime(msg.createdAt)}</span>
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
