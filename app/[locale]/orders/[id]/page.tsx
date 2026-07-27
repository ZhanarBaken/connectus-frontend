"use client"

import { useState, useEffect, useRef, use } from "react"
import { useTranslations } from "next-intl"
import { useRouter, Link } from "@/i18n/navigation"
import { fetchOrder, fetchMentor, fetchOrders, completeOrder, cancelOrder, rescheduleOrder, createDispute, authFetch, markChatRead, fetchOrderDocuments, uploadOrderDocument, deleteOrderDocument, fetchMentorServices, createSupportInvoice, endSupportEngagement, setEngagementDeadline, SESSION_EXPIRED_EVENT } from "@/lib/api"
import { fetchChatMessages, fetchConversation, connectChat, closeConversation, sendChatMessage, type ChatConnection } from "@/lib/chat"
import { Order, Mentor, ChatMessage, OrderDocument, MentorService } from "@/types"
import ReviewForm from "@/components/ReviewForm"
import BackButton from "@/components/BackButton"
import BookingCalendar from "@/components/BookingCalendar"
import Icon from "@/components/Icon"
import { Avatar } from "@/components/Avatar"
import { Linkified } from "@/components/Linkified"
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
  pending_payment: "bg-yellow-50 text-yellow-700 border-yellow-200",
  paid: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  disputed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
}

// A forced session-expiry redirect (lib/api.ts:refreshAccessToken) tears
// down all React state before the mentor can submit this form — stash the
// in-progress fields here so they survive the round trip through login.
export function invoiceDraftKey(orderId: string): string {
  return `invoice_draft_${orderId}`
}

// The backend's create_support_invoice raises plain English ValueErrors —
// translate the ones a mentor can realistically hit; anything unrecognized
// falls back to the raw message rather than showing nothing.
export function translateInvoiceErrorMessage(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes("already a live engagement")) {
    return "У этого студента уже есть активное сопровождение по этой услуге — заверши или отмени его, потом можно отправить новую заявку."
  }
  if (lower.includes("no open conversation")) {
    return "Нет открытого чата с этим студентом — заявку можно отправить только внутри существующей переписки."
  }
  if (lower.includes("does not belong to this mentor") || lower.includes("not a support-category service")) {
    return "Эта услуга недоступна для отправки заявки."
  }
  return raw
}

interface Props {
  params: Promise<{ id: string }>
}

export default function OrderPage({ params }: Props) {
  const { id } = use(params)
  const t = useTranslations("Orders.Detail")
  const tStatus = useTranslations("OrderStatus")
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [studentOrders, setStudentOrders] = useState<Order[]>([]) // mentor: all orders with this student
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState("")
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleError, setRescheduleError] = useState("")
  const [deadlineDraft, setDeadlineDraft] = useState("")
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [deadlineError, setDeadlineError] = useState("")
  const [deadlineSaved, setDeadlineSaved] = useState(false)
  const [endEngagementFormOpen, setEndEngagementFormOpen] = useState(false)
  const [endEngagementReason, setEndEngagementReason] = useState("")
  const [endingEngagement, setEndingEngagement] = useState(false)
  const [endEngagementError, setEndEngagementError] = useState("")
  const [disputeFormOpen, setDisputeFormOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")
  const [disputing, setDisputing] = useState(false)
  const [disputeError, setDisputeError] = useState("")
  const [chatClosed, setChatClosed] = useState(false)
  const [closingChat, setClosingChat] = useState(false)
  const [closeError, setCloseError] = useState("")
  const [supportServices, setSupportServices] = useState<MentorService[]>([])
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false)
  const [invoiceServiceId, setInvoiceServiceId] = useState<number | null>(null)
  const [invoicePrice, setInvoicePrice] = useState("")
  const [invoiceMonths, setInvoiceMonths] = useState("")
  const [sendingInvoice, setSendingInvoice] = useState(false)
  const [invoiceError, setInvoiceError] = useState("")
  const [invoiceSent, setInvoiceSent] = useState(false)
  const [disputeWindowMs, setDisputeWindowMs] = useState<number | null>(null)
  const [orderDocs, setOrderDocs] = useState<OrderDocument[]>([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState("")
  const receiptInputRef = useRef<HTMLInputElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<ChatConnection | null>(null)
  // In Mini App we hide the chat panel behind a CTA so the order
  // page is the first thing the user sees; tapping the CTA opens
  // the chat as a fullscreen overlay over the whole Mini App.
  // Outside Telegram this stays false and the chat renders inline.
  // Initial state pulls `?chat=open` synchronously so a deep-linked
  // open (TG notification → t.me/<bot>/<app>?startapp=order_42 →
  // /orders/42?chat=open) lands on the chat without an extra effect
  // tick that would briefly flash the order page first.
  const [chatExpanded, setChatExpanded] = useState(() => {
    if (typeof window === "undefined") return false
    return new URLSearchParams(window.location.search).get("chat") === "open"
  })

  // Lock the body scroll while the fullscreen chat overlay is up so
  // a swipe doesn't drag the order page underneath it.
  useEffect(() => {
    if (!chatExpanded) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [chatExpanded])

  // Telegram Mini App detection — drives a denser layout (no internal
  // back button, less outer padding, chat first on the screen and
  // taking the full viewport, order info pushed below).
  const { isInTelegram, webApp } = useTelegramWebApp()
  // Mini App opens at half-height by default — expand once on mount.
  useEffect(() => {
    if (webApp) {
      try { webApp.expand() } catch { /* older clients */ }
    }
  }, [webApp])

  // Keep the deadline input in sync whenever the order (re)loads —
  // covers the initial fetch and every setOrder() refresh after an
  // action (complete/cancel/reschedule/etc.), not just the save itself.
  useEffect(() => {
    setDeadlineDraft(order?.engagement_application_deadline ?? "")
  }, [order?.engagement_application_deadline])

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

  // Restore an invoice-form draft left behind by a forced session-expiry
  // redirect (see the save effect below) — one-shot, consumed immediately.
  useEffect(() => {
    const raw = sessionStorage.getItem(invoiceDraftKey(id))
    if (!raw) return
    sessionStorage.removeItem(invoiceDraftKey(id))
    try {
      const draft = JSON.parse(raw)
      setInvoiceServiceId(draft.invoiceServiceId ?? null)
      setInvoicePrice(draft.invoicePrice ?? "")
      setInvoiceMonths(draft.invoiceMonths ?? "")
      setInvoiceFormOpen(true)
    } catch {
      // corrupt draft — nothing to restore
    }
  }, [id])

  // lib/api.ts fires this right before it wipes tokens and hard-redirects
  // to /auth/login on a failed token refresh — save the in-progress
  // invoice form so it isn't just silently lost.
  useEffect(() => {
    const handleSessionExpired = () => {
      if (!invoiceFormOpen) return
      sessionStorage.setItem(invoiceDraftKey(id), JSON.stringify({
        invoiceServiceId, invoicePrice, invoiceMonths,
      }))
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [id, invoiceFormOpen, invoiceServiceId, invoicePrice, invoiceMonths])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const r = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    setRole(r)

    fetchOrder(Number(id))
      .then(async (found) => {
        setOrder(found)
        // Student needs the mentor's name
        if (r !== "mentor") {
          try {
            const m = await fetchMentor(found.mentor)
            setMentor(m)
          } catch {
            // ignore — fallback name will be used
          }
        } else {
          // Mentor: load all orders to show service history with this student
          try {
            const all = await fetchOrders()
            setStudentOrders(all.filter((o) => o.student === found.student))
          } catch {
            // ignore
          }
          // Mentor: own support services, for the "send invoice" form
          try {
            const services = await fetchMentorServices()
            setSupportServices(services.filter((s) => s.payout_category === "support" && s.is_active))
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
            setCurrentUserEmail(me.email)
          }
        } catch {
          // ignore
        }
        // Load order documents
        fetchOrderDocuments(found.id).then(setOrderDocs).catch(() => {})
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

    // Mark conversation as read when opening
    markChatRead(order.conversation_id).catch(() => {})

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

  // Pin scroll to the bottom on every change to the messages list,
  // including the very first hydration. Three reasons this needs more
  // care than `scrollTop = scrollHeight`:
  //   1. canChat starts false until the order's conversation_id is
  //      known, so chatRef can be null on the render that first
  //      populates `messages`. Re-run when canChat flips so the
  //      pin happens once the container actually mounts.
  //   2. Reading `scrollHeight` synchronously inside a layout-effect-
  //      style callback can return a stale value before the browser
  //      has finished laying out freshly mounted message rows. rAF
  //      defers the assignment past that paint.
  //   3. The order page hosts other heavy children that lay out after
  //      the chat column (sidebar fetches, attachments, etc.). A
  //      second rAF nests past their reflows so the final position
  //      survives.
  // canChat is computed below from order.conversation_id; mirror the
  // condition here so the dep array is stable and the effect doesn't
  // bind to an undeclared identifier (canChat sits later in the body).
  const _hasChat = order?.conversation_id != null
  useEffect(() => {
    if (!_hasChat || !chatRef.current) return
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight
        }
      })
      ;(chatRef.current as HTMLDivElement & { _rAF2?: number })._rAF2 = id2
    })
    return () => {
      cancelAnimationFrame(id1)
      const node = chatRef.current as
        (HTMLDivElement & { _rAF2?: number }) | null
      if (node?._rAF2 !== undefined) {
        cancelAnimationFrame(node._rAF2)
      }
    }
  }, [messages, _hasChat, chatExpanded])

  const handleComplete = async () => {
    if (!order) return
    if (!confirm(t("confirmComplete"))) return
    setCompleting(true)
    setCompleteError("")
    try {
      const updated = await completeOrder(order.id)
      setOrder(updated)
    } catch (e: unknown) {
      setCompleteError(e instanceof Error ? e.message : t("errorComplete"))
    } finally {
      setCompleting(false)
    }
  }

  const handleCancel = async () => {
    if (!order) return
    if (!confirm(t("confirmCancel"))) return
    setCancelling(true)
    setCancelError("")
    try {
      const updated = await cancelOrder(order.id)
      setOrder(updated)
    } catch (e: unknown) {
      setCancelError(e instanceof Error ? e.message : t("errorCancel"))
    } finally {
      setCancelling(false)
    }
  }

  const handleReschedule = async (date: string, time: string) => {
    if (!order) return
    setRescheduling(true)
    setRescheduleError("")
    // Backend SCHEDULE_TIMEZONE is Asia/Almaty (+05:00, no DST) — same
    // hardcoded offset the booking flow on the mentor page uses.
    const scheduledAt = `${date}T${time}:00+05:00`
    try {
      const updated = await rescheduleOrder(order.id, scheduledAt)
      setOrder(updated)
      setRescheduleModalOpen(false)
    } catch (e: unknown) {
      setRescheduleError(e instanceof Error ? e.message : t("rescheduleError"))
    } finally {
      setRescheduling(false)
    }
  }

  const handleSaveDeadline = async () => {
    if (!order?.support_engagement) return
    setSavingDeadline(true)
    setDeadlineError("")
    setDeadlineSaved(false)
    try {
      await setEngagementDeadline(order.support_engagement, deadlineDraft || null)
      const updated = await fetchOrder(order.id)
      setOrder(updated)
      setDeadlineSaved(true)
    } catch (e: unknown) {
      setDeadlineError(e instanceof Error ? e.message : t("deadlineError"))
    } finally {
      setSavingDeadline(false)
    }
  }

  const handleEndEngagement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order?.support_engagement) return
    const reason = endEngagementReason.trim()
    if (!reason) {
      setEndEngagementError(t("errorEndEngagementReasonRequired"))
      return
    }
    setEndingEngagement(true)
    setEndEngagementError("")
    try {
      await endSupportEngagement(order.support_engagement, reason)
      const refreshed = await fetchOrder(order.id)
      setOrder(refreshed)
      setEndEngagementFormOpen(false)
      setEndEngagementReason("")
    } catch (err: unknown) {
      setEndEngagementError(err instanceof Error ? err.message : t("errorEndEngagement"))
    } finally {
      setEndingEngagement(false)
    }
  }

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    const reason = disputeReason.trim()
    if (reason.length < 20) {
      setDisputeError(t("errorDisputeTooShort"))
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
      setDisputeError(err instanceof Error ? err.message : t("errorDispute"))
    } finally {
      setDisputing(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newMessage.trim()
    const hasFiles = attachedFiles.length > 0
    if (!text && !hasFiles) return
    if (!order?.conversation_id) return

    // If files attached — send via HTTP POST (WS doesn't support binary)
    // Otherwise use WS for instant delivery
    if (hasFiles) {
      setSending(true)
      try {
        await sendChatMessage(order.conversation_id, text, attachedFiles)
        // WS will broadcast the message back — don't append manually
        setNewMessage("")
        setAttachedFiles([])
      } catch {
        // keep message/files so user can retry
      } finally {
        setSending(false)
      }
    } else {
      if (!wsRef.current) return
      const ok = wsRef.current.send(text)
      if (ok) setNewMessage("")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // Max 3 files, 10MB each, PDF/JPEG/PNG only
    const valid = files.filter((f) => {
      if (f.size > 10 * 1024 * 1024) return false
      if (!["application/pdf", "image/jpeg", "image/png"].includes(f.type)) return false
      return true
    })
    setAttachedFiles((prev) => [...prev, ...valid].slice(0, 3))
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCloseChat = async () => {
    if (!order?.conversation_id) return
    if (!confirm(t("confirmCloseChat"))) return
    setClosingChat(true)
    setCloseError("")
    try {
      await closeConversation(order.conversation_id)
      setChatClosed(true)
    } catch (e: unknown) {
      setCloseError(e instanceof Error ? e.message : t("errorCloseChat"))
    } finally {
      setClosingChat(false)
    }
  }

  const handleSendInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order || invoiceServiceId === null) return
    setSendingInvoice(true)
    setInvoiceError("")
    try {
      await createSupportInvoice(invoiceServiceId, order.student, invoicePrice, Number(invoiceMonths))
      setInvoiceSent(true)
      setInvoiceFormOpen(false)
      // The chat message the backend posts isn't pushed over the
      // websocket (only the live "send message" view broadcasts) —
      // refetch so the mentor sees it appear without a manual reload.
      if (order.conversation_id) {
        fetchChatMessages(order.conversation_id).then(setMessages).catch(() => {})
      }
    } catch (e: unknown) {
      setInvoiceError(e instanceof Error ? e.message : t("errorInvoice"))
    } finally {
      setSendingInvoice(false)
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
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) return null

  // Chat is available whenever the backend has created a Conversation
  // (happens after the mentor confirms a free consultation).
  const canChat = order.conversation_id !== null
  // Free intro consultation skips payment / dispute / review. Paid
  // consultation (10 000 ₸) and other paid services follow the regular
  // paid flow, so we key off the category, not the price.
  const isFreeIntro = order.payout_category === "consultation"
  const isAnyConsultation =
    order.payout_category === "consultation" ||
    order.payout_category === "primary_consultation" ||
    order.payout_category === "paid_consultation"

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
      return leftHours > 0
        ? t("daysHoursShort", { days: String(days), hours: String(leftHours) })
        : t("daysShort", { days: String(days) })
    }
    if (hours > 0) return t("hoursShort", { hours: String(hours) })
    const minutes = Math.max(1, Math.floor(ms / (1000 * 60)))
    return t("minutesShort", { minutes: String(minutes) })
  }

  return (
    <div className={`bg-[#fafafa] ${isInTelegram ? "min-h-[100dvh]" : "min-h-screen"}`}>
      <div className={`max-w-4xl mx-auto ${isInTelegram ? "px-3 py-2" : "px-4 py-8"}`}>
        {/* TG Mini App injects its own back button via Telegram.WebApp,
            and the in-page padding is squeezed — hide our duplicate. */}
        {!isInTelegram && (
          <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-6 transition-colors group [-webkit-tap-highlight-color:transparent]" />
        )}

        <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Order info — bumped below the chat on mobile/Mini App so
              the conversation is the first thing on screen; reverts to
              the natural left-sidebar layout on lg+. */}
          <div className={`space-y-4 ${isInTelegram ? "order-2 lg:order-1 lg:col-span-1" : "lg:col-span-1"}`}>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h1 className="text-lg font-bold text-gray-900 mb-1">{order.service_title}</h1>
              <p className="text-sm text-gray-400 mb-4">{t("orderNumber", { id: String(order.id) })}</p>

              <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border mb-4 ${STATUS_STYLE[order.order_status] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {STATUS_KEY[order.order_status] ? tStatus(STATUS_KEY[order.order_status]) : order.order_status}
              </div>

              {/* engagement_status is shared by every order tied to that
                  engagement (paid installments, free sessions, even
                  cancelled ones) — only the still-payable order should
                  show the paused/overdue banner. */}
              {order.order_status === "pending_payment" && (
                order.engagement_status === "paused" ? (
                  <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
                    <Icon name="error" size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <span>
                      {t("pausedNotice")}
                    </span>
                  </div>
                ) : (
                  order.due_at &&
                  new Date(order.due_at) < new Date() && (
                    <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
                      <Icon name="error" size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <span>{t("overdueNotice")}</span>
                    </div>
                  )
                )
              )}

              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{t("amount")}</span>
                  <span className="font-bold text-gray-900">{Number(order.total_price).toLocaleString("ru-RU")} ₸</span>
                </div>
                {role === "mentor" && !isFreeIntro && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{t("mentorPayout")}</span>
                    <span className="font-semibold text-green-600">{Number(order.mentor_payout_amount).toLocaleString("ru-RU")} ₸</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{t("date")}</span>
                  <span className="text-gray-600">{formatDate(order.created_at)}</span>
                </div>
                {order.scheduled_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{t("scheduledAt")}</span>
                    <span className="text-gray-600">
                      {new Date(order.scheduled_at).toLocaleString("ru-RU", {
                        day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {order.scheduled_at &&
                (order.order_status === "pending_payment" || order.order_status === "in_progress") && (
                <button
                  onClick={() => { setRescheduleModalOpen(true); setRescheduleError("") }}
                  className="mt-4 w-full border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  {t("reschedule")}
                </button>
              )}
              {rescheduleError && !rescheduleModalOpen && (
                <p className="text-xs text-red-600 mt-2">{rescheduleError}</p>
              )}
            </div>

            {/* Counterpart info — clickable for student to visit mentor profile */}
            {role !== "mentor" && mentor ? (
              <Link
                href={`/mentors/${order.mentor}`}
                className="block bg-white rounded-2xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all group"
              >
                <h2 className="text-sm font-semibold text-gray-900 mb-3">{t("mentor")}</h2>
                <div className="flex items-center gap-3">
                  <Avatar
                    src={mentor.profile_photo}
                    name={mentor.full_name || "М"}
                    className="w-10 h-10 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 transition-colors"
                    letterClassName="text-indigo-600 font-bold text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                      {mentor.full_name || t("mentorDefault")}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {t("openProfile")}
                    </p>
                  </div>
                  <Icon name="arrow_forward" size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                </div>
              </Link>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">{t("applicant")}</h2>
                <div className="flex items-center gap-3">
                  <Avatar
                    src={order.student_info?.profile_photo}
                    name={order.student_info?.full_name || "С"}
                    className="w-10 h-10 rounded-xl bg-indigo-100"
                    letterClassName="text-indigo-600 font-bold text-sm"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {order.student_info?.full_name?.trim().split(/\s+/)[0] || t("applicantDefault")}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {t("chatOnly")}
                    </p>
                  </div>
                </div>
              </div>
            )}


            {/* Mentor: service history with this student */}
            {role === "mentor" && studentOrders.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Icon name="history" size={16} className="text-gray-500" />
                  {t("historyTitle")}
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
                        {STATUS_KEY[o.order_status] ? tStatus(STATUS_KEY[o.order_status]) : o.order_status}
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
                  {isAnyConsultation ? t("completeConsultationTitle") : t("completeServiceTitle")}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  {isAnyConsultation
                    ? t("completeConsultationBody")
                    : t("completeServiceBody")}
                </p>
                {completeError && (
                  <p className="text-xs text-red-600 mb-3">{completeError}</p>
                )}
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {completing
                    ? t("completing")
                    : isAnyConsultation
                      ? t("completeConsultationCta")
                      : t("completeServiceCta")}
                </button>
              </div>
            )}

            {/* Mentor: end this one engagement with this one student — the
                service itself, and every other student's engagement under
                it, stays untouched. Only offered while there's actually
                something to end. */}
            {role === "mentor" && order.support_engagement !== null
              && (order.engagement_status === "active" || order.engagement_status === "paused") && (
              <div className="bg-white border border-red-100 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-1">{t("endEngagementTitle")}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">{t("endEngagementBody")}</p>
                {!endEngagementFormOpen ? (
                  <button
                    onClick={() => setEndEngagementFormOpen(true)}
                    className="w-full border border-red-200 text-red-700 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    {t("endEngagementCta")}
                  </button>
                ) : (
                  <form onSubmit={handleEndEngagement} className="space-y-3">
                    <textarea
                      value={endEngagementReason}
                      onChange={(e) => setEndEngagementReason(e.target.value)}
                      placeholder={t("endEngagementReasonPlaceholder")}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all resize-none"
                    />
                    {endEngagementError && (
                      <p className="text-xs text-red-600">{endEngagementError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={endingEngagement}
                        className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {endingEngagement ? t("endingEngagement") : t("endEngagementConfirm")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEndEngagementFormOpen(false); setEndEngagementError(""); setEndEngagementReason("") }}
                        className="border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Mentor: application-submission deadline for this engagement
                (e.g. a university deadline) — drives the 7-day/1-day
                reminder sweeps to both sides. Optional, only shown while
                there's a live engagement to attach it to. */}
            {role === "mentor" && order.support_engagement !== null
              && (order.engagement_status === "active" || order.engagement_status === "paused"
                || order.engagement_status === "awaiting_payment") && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-1">{t("deadlineTitle")}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">{t("deadlineBody")}</p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    aria-label={t("deadlineTitle")}
                    value={deadlineDraft}
                    onChange={(e) => { setDeadlineDraft(e.target.value); setDeadlineSaved(false) }}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                  />
                  <button
                    onClick={handleSaveDeadline}
                    disabled={savingDeadline}
                    className="bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {savingDeadline ? t("deadlineSaving") : t("deadlineSave")}
                  </button>
                </div>
                {deadlineError && (
                  <p className="text-xs text-red-600 mt-2">{deadlineError}</p>
                )}
                {deadlineSaved && !deadlineError && (
                  <p className="text-xs text-emerald-600 mt-2">{t("deadlineSaved")}</p>
                )}
              </div>
            )}

            {/* Mentor: send a support-engagement invoice inside this chat */}
            {role === "mentor" && canChat && !chatClosed && supportServices.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-1">{t("invoiceTitle")}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  {t("invoiceBody")}
                </p>
                {invoiceSent && !invoiceFormOpen && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-3">
                    {t("invoiceSent")}
                  </p>
                )}
                {!invoiceFormOpen ? (
                  <button
                    onClick={() => { setInvoiceFormOpen(true); setInvoiceSent(false) }}
                    className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
                  >
                    {t("sendInvoiceCta")}
                  </button>
                ) : (
                  <form onSubmit={handleSendInvoice} className="space-y-3">
                    <select
                      value={invoiceServiceId ?? ""}
                      onChange={(e) => setInvoiceServiceId(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    >
                      <option value="" disabled>{t("invoiceServicePlaceholder")}</option>
                      {supportServices.map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={invoicePrice}
                        onChange={(e) => setInvoicePrice(e.target.value)}
                        required
                        type="number"
                        min="0"
                        step="1000"
                        placeholder={t("invoicePricePlaceholder")}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      />
                      <input
                        value={invoiceMonths}
                        onChange={(e) => setInvoiceMonths(e.target.value)}
                        required
                        type="number"
                        min="1"
                        max="36"
                        placeholder={t("invoiceMonthsPlaceholder")}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      />
                    </div>
                    {invoiceError && (
                      <p className="text-xs text-red-600">{translateInvoiceErrorMessage(invoiceError)}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={sendingInvoice || invoiceServiceId === null}
                        className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        {sendingInvoice ? t("sending") : t("send")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvoiceFormOpen(false)}
                        className="border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Mentor: close chat */}
            {role === "mentor" && canChat && !chatClosed && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-1">{t("closeChatTitle")}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  {t("closeChatBody")}
                </p>
                {closeError && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
                    <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
                      <Icon name="warning" size={14} className="text-amber-600" />
                      {t("closeChatErrorTitle")}
                    </p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      {closeError.toLowerCase().includes("active")
                        ? t("closeChatErrorActive")
                        : closeError}
                    </p>
                  </div>
                )}
                <button
                  onClick={handleCloseChat}
                  disabled={closingChat}
                  className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {closingChat ? t("closingChat") : t("closeChatCta")}
                </button>
              </div>
            )}

            {/* Both: chat closed banner */}
            {chatClosed && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                <h3 className="font-semibold text-gray-700 mb-1 text-sm inline-flex items-center gap-1.5">
                  <Icon name="lock" size={16} />
                  {t("chatClosedTitle")}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {role === "mentor"
                    ? t("chatClosedBodyMentor")
                    : t("chatClosedBodyStudent")}
                </p>
              </div>
            )}


            {/* Student: in progress notice */}
            {role !== "mentor" && order.order_status === "in_progress" && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <h3 className="font-semibold text-blue-800 mb-1 text-sm inline-flex items-center gap-1.5">
                  <Icon name="hourglass_top" size={16} className="text-blue-600" />
                  {isAnyConsultation ? t("inProgressTitleConsultation") : t("inProgressTitle")}
                </h3>
                <p className="text-xs text-blue-700 leading-relaxed">
                  {isAnyConsultation
                    ? t("inProgressBodyConsultation")
                    : t("inProgressBody")}
                </p>
              </div>
            )}

            {/* Student: pending payment — details + cancel */}
            {order.order_status === "pending_payment" && role !== "mentor" && (() => {
              // Installments 2+ (auto-generated) don't follow the generic
              // created_at+7d auto-cancel rule at all — they're excluded
              // from that sweep and instead run on due_at-based grace/
              // pause/archive cutoffs (apps.orders.services). Mirroring
              // both sets of day constants client-side since neither is
              // exposed in the API.
              const ORDER_PAYMENT_DEADLINE_DAYS = 7
              const SUPPORT_GRACE_DAYS = 7
              const SUPPORT_ARCHIVE_DAYS = 7
              const isLaterInstallment = order.installment_number !== null && order.installment_number > 1

              let deadlineMs = 0
              let deadlineLabel = t("autoCancelLabel")
              if (isLaterInstallment && order.due_at) {
                const dueAtMs = new Date(order.due_at).getTime()
                if (order.engagement_status === "paused") {
                  deadlineMs = dueAtMs + SUPPORT_ARCHIVE_DAYS * 24 * 60 * 60 * 1000 - Date.now()
                  deadlineLabel = t("archiveLabel")
                } else if (dueAtMs <= Date.now()) {
                  deadlineMs = dueAtMs + SUPPORT_GRACE_DAYS * 24 * 60 * 60 * 1000 - Date.now()
                  deadlineLabel = t("pauseLabel")
                }
                // Not yet due: nothing auto-cancels before the due date —
                // no countdown to show at all.
              } else {
                deadlineMs =
                  new Date(order.created_at).getTime() +
                  ORDER_PAYMENT_DEADLINE_DAYS * 24 * 60 * 60 * 1000 -
                  Date.now()
              }
              const hasReceipt = orderDocs.some((d) => d.kind === "payment_receipt")
              return (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-1">{t("pendingPaymentTitle")}</h3>
                  <p className="text-xs text-yellow-700 leading-relaxed">
                    {t("pendingPaymentBody", { amount: `${Number(order.total_price).toLocaleString("ru-RU")} ₸` })}
                  </p>
                </div>

                {deadlineMs > 0 && (
                  <p className="text-[11px] text-yellow-700 bg-yellow-100/60 border border-yellow-200 rounded-lg px-3 py-2">
                    {t("deadlineSuffix", { deadline: `${deadlineLabel} ${formatRemaining(deadlineMs)}` })}
                  </p>
                )}

                {order.payment_instructions?.tg_sent_to_user && (
                  <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-[11px] text-blue-700 leading-relaxed">
                    {t("tgSentNotice")}
                  </div>
                )}

                {order.payment_instructions?.account_details && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-yellow-700 font-semibold mb-1">{t("accountDetails")}</p>
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
                    {t("writeWhatsapp")}
                  </a>
                )}

                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ""
                    if (!file) return
                    setReceiptError("")
                    setUploadingReceipt(true)
                    try {
                      const doc = await uploadOrderDocument(
                        order.id, file, undefined, "payment_receipt",
                      )
                      setOrderDocs((prev) => [doc, ...prev])
                    } catch (err) {
                      setReceiptError(err instanceof Error ? err.message : t("uploadFailed"))
                    } finally {
                      setUploadingReceipt(false)
                    }
                  }}
                />
                {receiptError && (
                  <p className="text-xs text-red-600">{receiptError}</p>
                )}
                {hasReceipt ? (
                  <div className="w-full text-center bg-white border border-green-200 text-green-700 py-2.5 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-1.5">
                    <Icon name="check_circle" size={14} className="text-green-600" filled />
                    {t("receiptUploaded")}
                  </div>
                ) : (
                  <button
                    onClick={() => receiptInputRef.current?.click()}
                    disabled={uploadingReceipt}
                    className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    <Icon name="upload_file" size={14} />
                    {uploadingReceipt ? t("uploadingReceipt") : t("uploadReceipt")}
                  </button>
                )}

                {cancelError && (
                  <p className="text-xs text-red-600">{cancelError}</p>
                )}
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full border border-yellow-300 text-yellow-900 py-2.5 rounded-xl text-sm font-medium hover:bg-yellow-100 transition-colors disabled:opacity-50"
                >
                  {cancelling ? t("cancelling") : t("cancelOrder")}
                </button>
              </div>
              )
            })()}

            {/* Disputed banner */}
            {order.order_status === "disputed" && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                <h3 className="font-semibold text-red-800 mb-1 text-sm">{t("disputeOpenTitle")}</h3>
                <p className="text-xs text-red-700 leading-relaxed">
                  {t("disputeOpenBody")}
                </p>
              </div>
            )}

            {/* Completed — shown to both sides with dispute timer.
                Hidden for any consultation (intro contact, no dispute). */}
            {order.order_status === "completed" && !isAnyConsultation && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                <h3 className="font-semibold text-green-800 mb-1 text-sm inline-flex items-center gap-1.5">
                  <Icon name="check_circle" size={16} className="text-green-600" filled />
                  {t("completedTitle")}
                </h3>
                {disputeTimeRemainingMs !== null && disputeTimeRemainingMs > 0 ? (
                  <p className="text-xs text-green-700 leading-relaxed">
                    {role === "mentor"
                      ? t("disputeRemainingMentor", { time: formatRemaining(disputeTimeRemainingMs) })
                      : t("disputeRemainingStudent", { time: formatRemaining(disputeTimeRemainingMs) })}
                  </p>
                ) : disputeTimeRemainingMs !== null ? (
                  <p className="text-xs text-green-700 leading-relaxed">
                    {t("disputeWindowExpired")}
                  </p>
                ) : null}
              </div>
            )}

            {/* Review form — student only, after paid deliverable order
                is completed. Consultations are intro contact, not work. */}
            {role !== "mentor" && order.order_status === "completed" && !isAnyConsultation && (
              <ReviewForm
                orderId={order.id}
                mentorId={order.mentor}
                mentorName={t("mentorDefault")}
                authorName={order.student_info?.full_name?.trim().split(/\s+/)[0] || t("applicantDefault")}
              />
            )}

            {/* Student: open dispute — only for paid deliverable orders */}
            {role !== "mentor" && order.order_status === "completed" && !isAnyConsultation && disputeWindowOpen && disputeTimeRemainingMs && (
              <div className="bg-white border border-red-100 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-1">{t("somethingWrongTitle")}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  {t("somethingWrongBody", { time: formatRemaining(disputeTimeRemainingMs) })}
                </p>
                {!disputeFormOpen ? (
                  <button
                    onClick={() => setDisputeFormOpen(true)}
                    className="w-full border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    {t("openDispute")}
                  </button>
                ) : (
                  <form onSubmit={handleSubmitDispute} className="space-y-3">
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder={t("disputeReasonPlaceholder")}
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
                        {disputing ? t("sending") : t("submitDispute")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDisputeFormOpen(false)
                          setDisputeError("")
                        }}
                        className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Order documents */}
            {["in_progress", "completed"].includes(order.order_status) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Icon name="folder" size={16} className="text-gray-400" />
                    {t("filesTitle")}
                  </h3>
                  <span className="text-xs text-gray-400">{orderDocs.length} / 10</span>
                </div>

                {orderDocs.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {orderDocs.map((doc) => (
                      <div key={doc.id} className="group">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Icon
                              name={doc.content_type.startsWith("image/") ? "image" : "description"}
                              size={14}
                              className={doc.content_type === "application/pdf" ? "text-red-500" : "text-gray-400"}
                            />
                          </div>
                          <button
                            onClick={async () => {
                              // Refetch fresh presigned URLs (TTL 10 min)
                              try {
                                const fresh = await fetchOrderDocuments(order.id)
                                setOrderDocs(fresh)
                                const updated = fresh.find((d) => d.id === doc.id)
                                if (updated) window.open(updated.download_url, "_blank")
                              } catch {
                                window.open(doc.download_url, "_blank")
                              }
                            }}
                            className="flex-1 min-w-0 text-xs text-gray-700 hover:text-indigo-600 transition-colors truncate font-medium text-left"
                          >
                            {doc.original_filename}
                          </button>
                          <span className="text-[10px] text-gray-300 flex-shrink-0">
                            {doc.size_bytes < 1024 * 1024
                              ? `${Math.round(doc.size_bytes / 1024)} KB`
                              : `${(doc.size_bytes / (1024 * 1024)).toFixed(1)} MB`}
                          </span>
                          {currentUserEmail && currentUserEmail === doc.uploaded_by_email && (
                            <button
                              onClick={() => {
                                deleteOrderDocument(order.id, doc.id)
                                  .then(() => setOrderDocs((prev) => prev.filter((d) => d.id !== doc.id)))
                                  .catch(() => {})
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                            >
                              <Icon name="close" size={14} />
                            </button>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-[10px] text-gray-400 mt-0.5 ml-9 truncate">{doc.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload with description */}
                {orderDocs.length >= 10 ? (
                  <p className="text-xs text-gray-400 text-center py-2">
                    {t("filesLimit")}
                  </p>
                ) : (
                  <>
                    <input
                      ref={docInputRef}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 20 * 1024 * 1024) {
                          alert(t("fileTooLarge"))
                          return
                        }
                        const desc = prompt(t("filePrompt"), "")
                        setUploadingDoc(true)
                        try {
                          const doc = await uploadOrderDocument(order.id, file, desc || undefined)
                          setOrderDocs((prev) => [doc, ...prev])
                        } catch (err) {
                          alert(err instanceof Error ? err.message : t("uploadFailed"))
                        } finally {
                          setUploadingDoc(false)
                          if (docInputRef.current) docInputRef.current.value = ""
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={() => docInputRef.current?.click()}
                      disabled={uploadingDoc}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium py-2 rounded-lg border border-dashed border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50"
                    >
                      {uploadingDoc ? (
                        <div className="w-3.5 h-3.5 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon name="upload_file" size={14} />
                      )}
                      {uploadingDoc ? t("uploadingFile") : t("uploadFile")}
                    </button>
                  </>
                )}
              </div>
            )}

          </div>

          {/* Chat — in Telegram Mini App we hide the panel behind a
              CTA row so the order details stay primary; tapping it
              opens the chat as a fullscreen overlay. Outside Telegram
              the chat renders inline as a sidebar to the order. */}
          <div className={isInTelegram ? "order-1 lg:order-2 lg:col-span-2" : "lg:col-span-2"}>
            {isInTelegram && !chatExpanded && (
              <button
                type="button"
                onClick={() => setChatExpanded(true)}
                className="w-full bg-white rounded-2xl border border-gray-200 p-4 text-left flex items-center gap-3 hover:border-gray-300 active:border-indigo-300 transition-colors [-webkit-tap-highlight-color:transparent]"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Icon name="chat" size={20} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{t("chatTitle")}</p>
                    {wsConnected && !chatClosed && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {(() => {
                      if (!canChat) return t("chatPreviewLocked")
                      if (chatClosed) return t("chatPreviewClosed")
                      if (messages.length === 0) return t("chatPreviewStart")
                      const last = messages[messages.length - 1]
                      const text = last.text?.trim() ?? ""
                      if (text) return text
                      if (last.attachments?.length) return t("chatPreviewAttachment")
                      return "—"
                    })()}
                  </p>
                </div>
                <Icon name="arrow_forward_ios" size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            )}
            <div className={
              isInTelegram && chatExpanded
                // Fullscreen overlay on top of the entire Mini App.
                // No rounding / border so it visually replaces the
                // page rather than sitting in it.
                ? "fixed inset-0 z-50 bg-white flex flex-col h-[100dvh]"
                : isInTelegram
                  // Collapsed in Mini App — DOM still mounted (so the
                  // chatRef + WS state stick around between toggles)
                  // but visually hidden behind the CTA above.
                  ? "hidden"
                  : "bg-white rounded-2xl border border-gray-200 flex flex-col h-[540px]"
            }>
              {/* Chat header */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-50 flex-shrink-0 flex items-center gap-3">
                {isInTelegram && chatExpanded && (
                  <button
                    type="button"
                    onClick={() => setChatExpanded(false)}
                    className="text-gray-500 hover:text-gray-900 transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0 [-webkit-tap-highlight-color:transparent]"
                    aria-label={t("closeChatAria")}
                  >
                    <Icon name="arrow_back" size={22} />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900">{t("messagesTitle")}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {!canChat
                      ? t("messagesSubtitleLocked")
                      : chatClosed
                        ? t("messagesSubtitleClosed")
                        : t("messagesSubtitleOpen")}
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
                    {chatClosed ? t("statusClosed") : wsConnected ? t("statusOnline") : t("statusConnecting")}
                  </span>
                )}
              </div>

              {/* Messages */}
              {canChat ? (
                <>
                  <div ref={chatRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm">{t("startConversation")}</p>
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
                                <Linkified text={msg.text} />
                              </p>
                              <p className="text-[10px] text-gray-400 text-center mt-1">{formatTime(msg.created_at)}</p>
                            </div>
                          </div>
                        )
                      }

                      const hasAttachments = msg.attachments && msg.attachments.length > 0

                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                            {msg.text && (
                              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                isOwn
                                  ? "bg-indigo-600 text-white rounded-br-sm"
                                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
                              }`}>
                                <Linkified text={msg.text} />
                              </div>
                            )}
                            {hasAttachments && (
                              <div className="flex flex-col gap-1.5 mt-0.5">
                                {msg.attachments!.map((att) => {
                                  const isImage = att.content_type.startsWith("image/")
                                  const sizeLabel = att.size_bytes < 1024 * 1024
                                    ? `${Math.round(att.size_bytes / 1024)} KB`
                                    : `${(att.size_bytes / (1024 * 1024)).toFixed(1)} MB`

                                  if (isImage) {
                                    return (
                                      <a
                                        key={att.id}
                                        href={att.download_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors max-w-[240px]"
                                      >
                                        <img
                                          src={att.download_url}
                                          alt={att.original_filename}
                                          className="w-full max-h-[200px] object-cover"
                                          loading="lazy"
                                        />
                                        <div className="px-2.5 py-1.5 bg-white flex items-center gap-1.5">
                                          <Icon name="image" size={12} className="text-gray-400" />
                                          <span className="text-xs text-gray-500 truncate">{att.original_filename}</span>
                                          <span className="text-[10px] text-gray-300 ml-auto flex-shrink-0">{sizeLabel}</span>
                                        </div>
                                      </a>
                                    )
                                  }

                                  return (
                                    <a
                                      key={att.id}
                                      href={att.download_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors ${
                                        isOwn
                                          ? "border-indigo-400/30 bg-indigo-500/20 hover:bg-indigo-500/30"
                                          : "border-gray-200 bg-white hover:border-gray-300"
                                      }`}
                                    >
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        isOwn ? "bg-white/20" : "bg-red-50"
                                      }`}>
                                        <Icon name="description" size={16} className={isOwn ? "text-white" : "text-red-500"} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-medium truncate ${isOwn ? "text-white" : "text-gray-900"}`}>
                                          {att.original_filename}
                                        </p>
                                        <p className={`text-[10px] ${isOwn ? "text-indigo-200" : "text-gray-400"}`}>
                                          PDF · {sizeLabel}
                                        </p>
                                      </div>
                                      <Icon name="download" size={16} className={isOwn ? "text-white/60" : "text-gray-400"} />
                                    </a>
                                  )
                                })}
                              </div>
                            )}
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
                        {t("chatClosedTitle")}
                      </p>
                      <p className="text-center text-xs text-gray-400 mt-1 leading-relaxed">
                        {role === "mentor"
                          ? t("chatClosedReopenMentor")
                          : t("chatClosedReopenStudent")}
                      </p>
                    </div>
                  ) : (
                    <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                      {/* Attached files preview */}
                      {attachedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {attachedFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs text-gray-600">
                              <Icon name={f.type === "application/pdf" ? "description" : "image"} size={14} className="text-gray-400" />
                              <span className="max-w-[120px] truncate">{f.name}</span>
                              <button
                                type="button"
                                onClick={() => removeFile(i)}
                                className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                              >
                                <Icon name="close" size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <form onSubmit={handleSend} className="flex gap-2">
                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        {/* Attach button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!wsConnected || attachedFiles.length >= 3}
                          className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
                          title={t("attachTitle")}
                        >
                          <Icon name="attach_file" size={20} />
                        </button>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder={t("messagePlaceholder")}
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                          disabled={!wsConnected || sending}
                        />
                        <button
                          type="submit"
                          disabled={!wsConnected || sending || (!newMessage.trim() && attachedFiles.length === 0)}
                          className="bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 flex-shrink-0"
                        >
                          {sending ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Icon name="send" size={20} />
                          )}
                        </button>
                      </form>
                      <p className="text-xs text-gray-300 mt-2 text-center">
                        {t("noContactsWarning")}
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
                    <h3 className="font-semibold text-gray-900 mb-2">{t("chatLockedTitle")}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {t("chatLockedBody")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule modal */}
      {rescheduleModalOpen && order && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setRescheduleModalOpen(false)}
          />
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-md my-4">
              <div className="mb-3 bg-white rounded-xl px-4 py-3 border border-gray-200">
                <p className="text-sm font-semibold text-gray-900">{t("rescheduleModalTitle")}</p>
                {rescheduleError && (
                  <p className="text-xs text-red-600 mt-1">{rescheduleError}</p>
                )}
              </div>
              {rescheduling ? (
                <div className="bg-white rounded-2xl border border-gray-200 py-10 flex justify-center">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                </div>
              ) : (
                <BookingCalendar
                  mentorId={order.mentor}
                  durationMinutes={
                    mentor?.services.find((s) => s.id === order.mentor_service)?.duration_minutes ?? 60
                  }
                  onSelect={handleReschedule}
                  onCancel={() => setRescheduleModalOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
