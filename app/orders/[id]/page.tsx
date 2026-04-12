"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchOrder, fetchMentor, fetchMentorProfile, fetchOrders, completeOrder, cancelOrder, createDispute, authFetch } from "@/lib/api"
import { fetchChatMessages, fetchConversation, connectChat, closeConversation, type ChatConnection } from "@/lib/chat"
import { Order, Mentor, ChatMessage } from "@/types"
import ReviewForm from "@/components/ReviewForm"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"

const STATUS_LABEL: Record<string, string> = {
  draft: "Ожидает подтверждения",
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
  const [consultationText, setConsultationText] = useState<string | null>(null)
  const [studentOrders, setStudentOrders] = useState<Order[]>([]) // mentor: all orders with this student
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [wsConnected, setWsConnected] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState("")
  const [disputeFormOpen, setDisputeFormOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")
  const [disputing, setDisputing] = useState(false)
  const [disputeError, setDisputeError] = useState("")
  const [chatClosed, setChatClosed] = useState(false)
  const [closingChat, setClosingChat] = useState(false)
  const [closeError, setCloseError] = useState("")
  const [disputeWindowMs, setDisputeWindowMs] = useState<number | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<ChatConnection | null>(null)

  // Fetch dispute window from public settings (no auth needed)
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/settings/public/`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.dispute_window_hours != null) {
          setDisputeWindowMs(data.dispute_window_hours * 60 * 60 * 1000)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const r = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    setRole(r)

    fetchOrder(Number(id))
      .then(async (found) => {
        setOrder(found)
        // Student needs the mentor's name + consultation text
        if (r !== "mentor") {
          try {
            const m = await fetchMentor(found.mentor)
            setMentor(m)
            if (m.consultation) setConsultationText(m.consultation)
          } catch {
            // ignore — fallback name will be used
          }
        } else {
          // Mentor sees their own consultation text via own profile
          try {
            const own = await fetchMentorProfile()
            if (own.consultation) setConsultationText(own.consultation)
          } catch {
            // ignore
          }
          // Mentor: load all orders to show service history with this student
          try {
            const all = await fetchOrders()
            setStudentOrders(all.filter((o) => o.student === found.student))
          } catch {
            // ignore
          }
        }
        // Resolve current user id (used to flag own messages)
        try {
          const meRes = await authFetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me/`,
          )
          if (meRes.ok) {
            const me = await meRes.json()
            setCurrentUserId(me.id)
          }
        } catch {
          // ignore
        }
      })
      .catch(() => router.replace("/orders"))
      .finally(() => setLoading(false))
  }, [id, router])

  // Open WebSocket + load history once we have a conversation_id
  useEffect(() => {
    if (!order?.conversation_id) return

    let cancelled = false

    fetchChatMessages(order.conversation_id)
      .then((history) => {
        if (!cancelled) setMessages(history)
      })
      .catch(() => {
        // ignore — chat will still try to open
      })

    // Honest source of truth: ask the backend whether the conversation is closed.
    fetchConversation(order.conversation_id)
      .then((conv) => {
        if (!cancelled) setChatClosed(!conv.is_active)
      })
      .catch(() => {
        // If we can't load it, assume open and let WS error handler correct us.
        if (!cancelled) setChatClosed(false)
      })

    const conn = connectChat(order.conversation_id, {
      onOpen: () => setWsConnected(true),
      onClose: () => setWsConnected(false),
      onError: () => setWsConnected(false),
      onServerError: (err) => {
        if (err.toLowerCase().includes("closed")) setChatClosed(true)
      },
      onMessage: (msg) => {
        setMessages((prev) => {
          // De-dupe in case the message also came back via REST refetch
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      },
    })
    wsRef.current = conn

    return () => {
      cancelled = true
      conn.close()
      wsRef.current = null
      setWsConnected(false)
    }
  }, [order?.conversation_id])

  // Auto-scroll on new messages
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

  const handleCancel = async () => {
    if (!order) return
    if (!confirm("Отменить заказ? Вернуть его потом не получится — нужно будет оформить заново.")) return
    setCancelling(true)
    setCancelError("")
    try {
      const updated = await cancelOrder(order.id)
      setOrder(updated)
    } catch (e: unknown) {
      setCancelError(e instanceof Error ? e.message : "Не удалось отменить заказ")
    } finally {
      setCancelling(false)
    }
  }

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    const reason = disputeReason.trim()
    if (reason.length < 20) {
      setDisputeError("Опиши проблему подробнее — минимум 20 символов.")
      return
    }
    setDisputing(true)
    setDisputeError("")
    try {
      await createDispute(order.id, reason)
      const refreshed = await fetchOrder(order.id)
      setOrder(refreshed)
      setDisputeFormOpen(false)
      setDisputeReason("")
    } catch (err: unknown) {
      setDisputeError(err instanceof Error ? err.message : "Не удалось открыть спор")
    } finally {
      setDisputing(false)
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const text = newMessage.trim()
    if (!text || !wsRef.current) return
    const ok = wsRef.current.send(text)
    if (ok) setNewMessage("")
  }

  const handleCloseChat = async () => {
    if (!order?.conversation_id) return
    if (!confirm(
      "Закрыть чат с этим студентом? Студент больше не сможет писать или покупать у тебя услуги, пока чат не откроется снова. Чат переоткроется автоматически, если студент попросит новую консультацию и ты её примешь."
    )) return
    setClosingChat(true)
    setCloseError("")
    try {
      await closeConversation(order.conversation_id)
      setChatClosed(true)
    } catch (e: unknown) {
      setCloseError(e instanceof Error ? e.message : "Не удалось закрыть чат")
    } finally {
      setClosingChat(false)
    }
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

  // Chat is available whenever the backend has created a Conversation
  // (happens after the mentor confirms a free consultation).
  const canChat = order.conversation_id !== null
  const isFree = order.total_price === "0.00"

  // Student can open a dispute only during the window after completion.
  // disputeWindowMs is loaded from /api/v1/settings/public/ — null means still loading.
  // Dispute window calculation
  const disputeTimeRemainingMs =
    disputeWindowMs !== null && order.order_status === "completed" && order.completed_at !== null
      ? disputeWindowMs - (Date.now() - new Date(order.completed_at).getTime())
      : null
  const disputeWindowOpen = disputeTimeRemainingMs !== null && disputeTimeRemainingMs > 0

  const formatRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const leftHours = hours % 24
      return leftHours > 0 ? `${days} дн. ${leftHours} ч.` : `${days} дн.`
    }
    if (hours > 0) return `${hours} ч.`
    const minutes = Math.max(1, Math.floor(ms / (1000 * 60)))
    return `${minutes} мин.`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-6 transition-colors group [-webkit-tap-highlight-color:transparent]" />

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
                {role === "mentor" && !isFree && (
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

            {/* Counterpart info — clickable for student to visit mentor profile */}
            {role !== "mentor" && mentor ? (
              <Link
                href={`/mentors/${order.mentor}`}
                className="block bg-white rounded-2xl border border-gray-100 p-6 hover:border-indigo-200 hover:shadow-sm transition-all group"
              >
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Ментор</h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                    <span className="text-indigo-600 font-bold text-sm">
                      {mentor.full_name?.trim().charAt(0).toUpperCase() || "М"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                      {mentor.full_name || "Ментор"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      Нажми чтобы открыть профиль
                    </p>
                  </div>
                  <Icon name="arrow_forward" size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                </div>
              </Link>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Студент</h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 font-bold text-sm">
                      {order.student_info?.full_name?.trim().charAt(0).toUpperCase() || "С"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {order.student_info?.full_name?.trim().split(/\s+/)[0] || "Студент"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      Общение только в чате
                    </p>
                  </div>
                </div>
              </div>
            )}


            {/* Mentor: service history with this student */}
            {role === "mentor" && studentOrders.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Icon name="history" size={16} className="text-gray-500" />
                  История с клиентом
                </h3>
                <div className="space-y-2">
                  {studentOrders.map((o) => (
                    <Link
                      key={o.id}
                      href={`/orders/${o.id}`}
                      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs transition-colors ${
                        o.id === order.id
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      <span className="truncate flex-1">{o.service_title}</span>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full ${STATUS_STYLE[o.order_status] || "bg-gray-100 text-gray-500"}`}>
                        {STATUS_LABEL[o.order_status]}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Mentor: complete any in_progress order */}
            {role === "mentor" && order.order_status === "in_progress" && (
              <div className="bg-white border border-indigo-100 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {isFree ? "Завершить консультацию" : "Завершить услугу"}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  {isFree
                    ? "Когда вы обсудили всё что нужно, отметь консультацию завершённой."
                    : "Когда работа выполнена, отметь услугу завершённой. Студент сможет оставить отзыв, а выплата уйдёт после периода споров."}
                </p>
                {completeError && (
                  <p className="text-xs text-red-600 mb-3">{completeError}</p>
                )}
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {completing
                    ? "Завершаем..."
                    : isFree
                      ? "✓ Консультация завершена"
                      : "✓ Услуга выполнена"}
                </button>
              </div>
            )}

            {/* Mentor: close chat */}
            {role === "mentor" && canChat && !chatClosed && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-1">Закрыть чат</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Если ты больше не работаешь с этим студентом, закрой чат. Студент больше не сможет писать тебе или покупать услуги.
                </p>
                {closeError && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
                    <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
                      <Icon name="warning" size={14} className="text-amber-600" />
                      Не удалось закрыть чат
                    </p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      {closeError.toLowerCase().includes("active")
                        ? "Сначала заверши все активные услуги с этим студентом, потом чат можно будет закрыть."
                        : closeError}
                    </p>
                  </div>
                )}
                <button
                  onClick={handleCloseChat}
                  disabled={closingChat}
                  className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {closingChat ? "Закрываем..." : "Закрыть чат со студентом"}
                </button>
              </div>
            )}

            {/* Both: chat closed banner */}
            {chatClosed && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                <h3 className="font-semibold text-gray-700 mb-1 text-sm inline-flex items-center gap-1.5">
                  <Icon name="lock" size={16} />
                  Чат закрыт
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {role === "mentor"
                    ? "Студент не может писать сообщения и покупать услуги. Чат откроется снова, если ты примешь новый запрос на консультацию."
                    : "Ментор закрыл чат. Чтобы продолжить общение и заказать услуги, отправь новый запрос на бесплатную консультацию на странице ментора."}
                </p>
              </div>
            )}


            {/* Student: in progress notice */}
            {role !== "mentor" && order.order_status === "in_progress" && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <h3 className="font-semibold text-blue-800 mb-1 text-sm inline-flex items-center gap-1.5">
                  <Icon name="hourglass_top" size={16} className="text-blue-600" />
                  {isFree ? "Консультация" : "В работе"}
                </h3>
                <p className="text-xs text-blue-700 leading-relaxed">
                  {isFree
                    ? "Бесплатная консультация активна. Общайтесь с ментором в чате — когда консультация закончится, ментор её завершит."
                    : "Ментор работает над твоим заказом. Когда работа будет закончена, услуга станет завершённой и ты сможешь оставить отзыв."}
                </p>
              </div>
            )}

            {/* Student: pending payment — details + cancel */}
            {order.order_status === "pending_payment" && role !== "mentor" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-1">Ожидает оплаты</h3>
                  <p className="text-xs text-yellow-700 leading-relaxed">
                    Переведи {Number(order.total_price).toLocaleString("ru-RU")} ₸ по реквизитам ниже. После оплаты напиши в WhatsApp администратору — после подтверждения заказ перейдёт в работу.
                  </p>
                </div>

                {order.payment_instructions?.account_details && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-yellow-700 font-semibold mb-1">Реквизиты</p>
                    <pre className="text-xs text-yellow-900 bg-white border border-yellow-200 rounded-xl p-3 whitespace-pre-wrap break-words select-all">
{order.payment_instructions.account_details}
                    </pre>
                  </div>
                )}

                {order.payment_instructions?.whatsapp_link && (
                  <a
                    href={order.payment_instructions.whatsapp_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-green-500 text-white text-center py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors"
                  >
                    Написать в WhatsApp
                  </a>
                )}

                {cancelError && (
                  <p className="text-xs text-red-600">{cancelError}</p>
                )}
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full border border-yellow-300 text-yellow-900 py-2.5 rounded-xl text-sm font-medium hover:bg-yellow-100 transition-colors disabled:opacity-50"
                >
                  {cancelling ? "Отменяем..." : "Отменить заказ"}
                </button>
              </div>
            )}

            {/* Disputed banner */}
            {order.order_status === "disputed" && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                <h3 className="font-semibold text-red-800 mb-1 text-sm">⚠ Спор открыт</h3>
                <p className="text-xs text-red-700 leading-relaxed">
                  Администратор рассмотрит спор и свяжется с обеими сторонами. До решения статус заказа останется «спор».
                </p>
              </div>
            )}

            {/* Completed — shown to both sides with dispute timer */}
            {order.order_status === "completed" && !isFree && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                <h3 className="font-semibold text-green-800 mb-1 text-sm inline-flex items-center gap-1.5">
                  <Icon name="check_circle" size={16} className="text-green-600" filled />
                  Завершено
                </h3>
                {disputeTimeRemainingMs !== null && disputeTimeRemainingMs > 0 ? (
                  <p className="text-xs text-green-700 leading-relaxed">
                    {role === "mentor"
                      ? `Студент может подать спор в течение ${formatRemaining(disputeTimeRemainingMs)}.`
                      : `У тебя есть ${formatRemaining(disputeTimeRemainingMs)} чтобы подать спор, если что-то пошло не так.`}
                  </p>
                ) : disputeTimeRemainingMs !== null ? (
                  <p className="text-xs text-green-700 leading-relaxed">
                    Период подачи спора истёк.
                  </p>
                ) : null}
              </div>
            )}

            {/* Review form — student only, after paid order is completed (not free consultations) */}
            {role !== "mentor" && order.order_status === "completed" && !isFree && (
              <ReviewForm
                orderId={order.id}
                mentorId={order.mentor}
                mentorName="Ментор"
                authorName={order.student_info?.full_name?.trim().split(/\s+/)[0] || "Студент"}
              />
            )}

            {/* Student: open dispute — only for paid orders */}
            {role !== "mentor" && order.order_status === "completed" && !isFree && disputeWindowOpen && disputeTimeRemainingMs && (
              <div className="bg-white border border-red-100 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-1">Что-то пошло не так?</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Если услуга не была оказана или выполнена с нарушениями, открой спор. Осталось {formatRemaining(disputeTimeRemainingMs)}. Администратор разберётся и примет решение.
                </p>
                {!disputeFormOpen ? (
                  <button
                    onClick={() => setDisputeFormOpen(true)}
                    className="w-full border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Открыть спор
                  </button>
                ) : (
                  <form onSubmit={handleSubmitDispute} className="space-y-3">
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Опиши проблему подробно — минимум 20 символов"
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                    />
                    {disputeError && (
                      <p className="text-xs text-red-600">{disputeError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={disputing}
                        className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {disputing ? "Отправляем..." : "Подать спор"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDisputeFormOpen(false)
                          setDisputeError("")
                        }}
                        className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

          </div>

          {/* Chat */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 flex flex-col h-[540px]">
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-gray-50 flex-shrink-0 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">Сообщения</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {!canChat
                      ? "Чат откроется после принятия консультации ментором"
                      : chatClosed
                        ? "Чат закрыт ментором"
                        : "Все переговоры ведутся только на платформе"}
                  </p>
                </div>
                {canChat && (
                  <span className={`flex-shrink-0 inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full ${
                    chatClosed
                      ? "bg-gray-100 text-gray-500"
                      : wsConnected
                        ? "bg-green-50 text-green-600"
                        : "bg-gray-100 text-gray-400"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      chatClosed ? "bg-gray-400" : wsConnected ? "bg-green-500" : "bg-gray-400"
                    }`} />
                    {chatClosed ? "Закрыт" : wsConnected ? "В сети" : "Подключение..."}
                  </span>
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
                      const isSystem = msg.is_system === true || msg.sender === null
                      const isOwn = !isSystem && currentUserId !== null && msg.sender === currentUserId

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <div className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 max-w-[85%]">
                              <p className="text-xs text-gray-600 text-center leading-relaxed whitespace-pre-wrap break-words">
                                {msg.text}
                              </p>
                              <p className="text-[10px] text-gray-400 text-center mt-1">{formatTime(msg.created_at)}</p>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                              isOwn
                                ? "bg-indigo-600 text-white rounded-br-sm"
                                : "bg-gray-100 text-gray-800 rounded-bl-sm"
                            }`}>
                              {msg.text}
                            </div>
                            <span className="text-xs text-gray-300 px-1">{formatTime(msg.created_at)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Input or closed banner */}
                  {chatClosed ? (
                    <div className="px-4 py-5 border-t border-gray-50 flex-shrink-0 bg-gray-50/60">
                      <p className="text-center text-sm text-gray-500 font-medium inline-flex items-center gap-1.5 justify-center w-full">
                        <Icon name="lock" size={16} />
                        Чат закрыт
                      </p>
                      <p className="text-center text-xs text-gray-400 mt-1 leading-relaxed">
                        {role === "mentor"
                          ? "Чат снова откроется, если ты примешь новый запрос на консультацию от этого студента."
                          : "Запроси новую бесплатную консультацию у этого ментора, чтобы возобновить общение."}
                      </p>
                    </div>
                  ) : (
                    <div className="px-4 py-4 border-t border-gray-50 flex-shrink-0">
                      <form onSubmit={handleSend} className="flex gap-3">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Написать сообщение..."
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                          disabled={!wsConnected}
                        />
                        <button
                          type="submit"
                          disabled={!wsConnected || !newMessage.trim()}
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
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center px-8">
                    <div className="mb-4 flex justify-center">
                      <Icon name="lock" size={48} className="text-gray-300" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Чат заблокирован</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Чат откроется после того, как ментор примет запрос на бесплатную консультацию.
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
