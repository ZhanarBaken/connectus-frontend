"use client"

import { useState, useEffect, useRef, use } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter, Link } from "@/i18n/navigation"
import { fetchOrder, fetchMentor, fetchMentorClient, completeOrder, cancelOrder, rescheduleOrder, createDispute, authFetch, fetchOrderDocuments, uploadOrderDocument, deleteOrderDocument, setDocumentStatus, fetchDocumentComments, postDocumentComment, endSupportEngagement, fetchSupportTasks, updateSupportTask, deleteSupportTask, fetchEngagementSchedule, confirmIntroCall, declineIntroCall } from "@/lib/api"
import { useStudentOnboardingGate } from "@/lib/useStudentOnboardingGate"
import { translateFileUploadErrorMessage } from "@/lib/fileUploadErrors"
import { Order, Mentor, OrderDocument, OrderDocumentComment, SupportTask, EngagementScheduleEntry } from "@/types"
import ReviewForm from "@/components/ReviewForm"
import BackButton from "@/components/BackButton"
import BookingCalendar from "@/components/BookingCalendar"
import Icon from "@/components/Icon"
import { Avatar } from "@/components/Avatar"
import ChatPanel from "@/components/ChatPanel"
import ChatOverlay from "@/components/ChatOverlay"
import SupportChatActions from "@/components/SupportChatActions"
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
  not_yet_due: "notYetDue",
}

const STATUS_STYLE: Record<string, string> = {
  pending_payment: "bg-yellow-50 text-yellow-700 border-yellow-200",
  paid: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  disputed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
  not_yet_due: "bg-gray-50 text-gray-400 border-gray-200",
}

interface Props {
  params: Promise<{ id: string }>
}

export default function OrderPage({ params }: Props) {
  const { id } = use(params)
  const t = useTranslations("Orders.Detail")
  const tStatus = useTranslations("OrderStatus")
  const locale = useLocale()
  const router = useRouter()
  useStudentOnboardingGate()
  const [order, setOrder] = useState<Order | null>(null)
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  // Mirrored out of ChatPanel — only needed for the Mini App's
  // collapsed CTA row preview (dot + last-message text) below. Reflects
  // whether the OTHER participant is online, not our own connection.
  const [otherPartyOnline, setOtherPartyOnline] = useState(false)
  const [chatPreview, setChatPreview] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState("")
  const [respondingToIntroCall, setRespondingToIntroCall] = useState(false)
  const [introCallError, setIntroCallError] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState("")
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleError, setRescheduleError] = useState("")
  const [endEngagementFormOpen, setEndEngagementFormOpen] = useState(false)
  const [endEngagementReason, setEndEngagementReason] = useState("")
  const [endingEngagement, setEndingEngagement] = useState(false)
  const [endEngagementError, setEndEngagementError] = useState("")
  const [disputeFormOpen, setDisputeFormOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")
  const [disputing, setDisputing] = useState(false)
  const [disputeError, setDisputeError] = useState("")
  // Bumped after a support invoice/task is posted (or a task's deadline
  // changes) via SupportChatActions, so ChatPanel refetches — those
  // system messages aren't pushed over the websocket with their rich
  // fields (only the live "send message" view broadcasts those).
  const [invoiceChatRefetchSignal, setInvoiceChatRefetchSignal] = useState(0)
  const [disputeWindowMs, setDisputeWindowMs] = useState<number | null>(null)
  // Support-category orders get a longer, separately configured window
  // (see Order.is_disputable on the backend) — kept apart from the
  // general disputeWindowMs above so the right one can be picked per
  // order's payout_category.
  const [supportDisputeWindowMs, setSupportDisputeWindowMs] = useState<number | null>(null)
  // How long a mentor has to confirm/decline a booked intro-call slot
  // before it auto-declines — see apps.orders.tasks.auto_decline_stale_intro_calls_task.
  const [introCallResponseDeadlineMs, setIntroCallResponseDeadlineMs] = useState<number | null>(null)
  // The mentor-student PAIR's current live engagement — not this order's
  // own `support_engagement` FK, which can point at an old/ended
  // engagement (or be null for an intro call) even when the pair has
  // since started a new one. The chat header action lives in the shared
  // conversation, not this specific order, so it must agree with what
  // /mentor/clients/[id] shows for the same pair — same source
  // (fetchMentorClient) as that page uses.
  const [liveEngagementId, setLiveEngagementId] = useState<number | null>(null)
  const [orderDocs, setOrderDocs] = useState<OrderDocument[]>([])
  const [docsLoadError, setDocsLoadError] = useState(false)
  const [docActionError, setDocActionError] = useState("")
  const [updatingDocStatusId, setUpdatingDocStatusId] = useState<number | null>(null)
  const [openCommentsDocId, setOpenCommentsDocId] = useState<number | null>(null)
  const [docComments, setDocComments] = useState<Record<number, OrderDocumentComment[]>>({})
  const [loadingCommentsDocId, setLoadingCommentsDocId] = useState<number | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [postingCommentDocId, setPostingCommentDocId] = useState<number | null>(null)
  const [tasks, setTasks] = useState<SupportTask[]>([])
  const [tasksLoadError, setTasksLoadError] = useState(false)
  const [schedule, setSchedule] = useState<EngagementScheduleEntry[]>([])
  const [scheduleLoadError, setScheduleLoadError] = useState(false)
  // Errors from marking a task done/deleting it in the sidebar list below
  // — creating a task now happens entirely inside SupportChatActions,
  // with its own separate error surface next to that form.
  const [taskError, setTaskError] = useState("")
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState("")
  const receiptInputRef = useRef<HTMLInputElement>(null)
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

  // Fetch dispute window from public settings (no auth needed)
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/settings/public/`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.dispute_window_hours != null) {
          setDisputeWindowMs(data.dispute_window_hours * 60 * 60 * 1000)
        }
        if (data?.support_dispute_window_hours != null) {
          setSupportDisputeWindowMs(data.support_dispute_window_hours * 60 * 60 * 1000)
        }
        if (data?.support_intro_call_response_deadline_hours != null) {
          setIntroCallResponseDeadlineMs(data.support_intro_call_response_deadline_hours * 60 * 60 * 1000)
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
        // Student needs the mentor's name
        if (r !== "mentor") {
          try {
            const m = await fetchMentor(found.mentor)
            setMentor(m)
          } catch {
            // ignore — fallback name will be used
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
        if (r === "mentor") {
          fetchMentorClient(found.student)
            .then((c) => setLiveEngagementId(c.engagement_id))
            .catch(() => {})
        }
        // Load order documents
        fetchOrderDocuments(found.id).then(setOrderDocs).catch(() => setDocsLoadError(true))
        if (found.support_engagement !== null) {
          fetchSupportTasks(found.support_engagement).then(setTasks).catch(() => setTasksLoadError(true))
          fetchEngagementSchedule(found.support_engagement)
            .then(setSchedule)
            .catch(() => setScheduleLoadError(true))
        }
      })
      .catch(() => router.replace("/orders"))
      .finally(() => setLoading(false))
  }, [id, router])

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

  const handleConfirmIntroCall = async () => {
    if (!order) return
    setRespondingToIntroCall(true)
    setIntroCallError("")
    try {
      const updated = await confirmIntroCall(order.id)
      setOrder(updated)
    } catch (e: unknown) {
      setIntroCallError(e instanceof Error ? e.message : t("introCallConfirmError"))
    } finally {
      setRespondingToIntroCall(false)
    }
  }

  const handleDeclineIntroCall = async () => {
    if (!order) return
    setRespondingToIntroCall(true)
    setIntroCallError("")
    try {
      const updated = await declineIntroCall(order.id)
      setOrder(updated)
    } catch (e: unknown) {
      setIntroCallError(e instanceof Error ? e.message : t("introCallDeclineError"))
    } finally {
      setRespondingToIntroCall(false)
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

  const handleEndEngagement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order?.support_engagement) return
    const reason = endEngagementReason.trim()
    // No client-side reason requirement any more — the backend only
    // demands one for an early stop. Ending right around the final,
    // already-paid month's finish needs no reason at all; if the
    // backend does require one here, it 400s with a message we surface
    // below via endEngagementError.
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

  const handleToggleTaskDone = async (task: SupportTask) => {
    if (!order?.support_engagement) return
    setUpdatingTaskId(task.id)
    setTaskError("")
    try {
      const updated = await updateSupportTask(order.support_engagement, task.id, { is_done: !task.is_done })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    } catch (err: unknown) {
      setTaskError(err instanceof Error && err.message ? err.message : t("taskUpdateError"))
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const handleDeleteTask = async (task: SupportTask) => {
    if (!order?.support_engagement) return
    setUpdatingTaskId(task.id)
    setTaskError("")
    try {
      await deleteSupportTask(order.support_engagement, task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch (err: unknown) {
      setTaskError(err instanceof Error && err.message ? err.message : t("taskDeleteError"))
    } finally {
      setUpdatingTaskId(null)
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

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
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
  // Free-intro categories only (unlike isAnyConsultation, excludes
  // paid_consultation — that one IS reviewable per the backend, see
  // apps.reviews.serializers.ReviewCreateSerializer.validate_order).
  const isFreeConsultation =
    order.payout_category === "consultation" ||
    order.payout_category === "primary_consultation"
  const isSupport = order.payout_category === "support"
  // A free 15-minute intro call, not the paid support engagement itself
  // — same three-field test as the backend's _is_intro_call_order. The
  // service_title shown above is the mentor's SUPPORT service name (e.g.
  // "Полное сопровождение поступления в США"), which reads as if the
  // whole engagement were free unless this order is called out as just
  // the intro step.
  const isSupportIntroCall =
    order.payout_category === "support" &&
    order.support_engagement === null &&
    order.installment_number === null

  // Student can open a dispute only during the window after completion.
  // disputeWindowMs/supportDisputeWindowMs are loaded from
  // /api/v1/settings/public/ — null means still loading. Support orders
  // get the longer, separately configured window (see
  // Order.is_disputable on the backend) — same field either way just
  // picked per payout_category, not a different formula.
  const effectiveDisputeWindowMs = isSupport ? supportDisputeWindowMs : disputeWindowMs
  const disputeTimeRemainingMs =
    effectiveDisputeWindowMs !== null && order.order_status === "completed" && order.completed_at !== null
      ? effectiveDisputeWindowMs - (Date.now() - new Date(order.completed_at).getTime())
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

  // Hoisted so it can be passed to both the Mini App overlay and the
  // desktop inline chat card without duplicating this block — same
  // component every other mentor-facing chat surface uses.
  const chatHeaderAction = role === "mentor" && order ? (
    <SupportChatActions
      studentId={order.student}
      engagementId={liveEngagementId}
      onActionPosted={() => {
        setInvoiceChatRefetchSignal((n) => n + 1)
        if (order.support_engagement !== null) {
          fetchSupportTasks(order.support_engagement).then(setTasks).catch(() => setTasksLoadError(true))
        }
      }}
    />
  ) : null

  return (
    <div className={`bg-[#fafafa] ${isInTelegram ? "min-h-[100dvh]" : "min-h-screen"}`}>
      <div className={`max-w-6xl mx-auto ${isInTelegram ? "px-3 py-2" : "px-4 py-8"}`}>
        {/* TG Mini App injects its own back button via Telegram.WebApp,
            and the in-page padding is squeezed — hide our duplicate. */}
        {!isInTelegram && (
          <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-6 transition-colors group [-webkit-tap-highlight-color:transparent]" />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Order info — bumped below the chat on mobile/Mini App so
              the conversation is the first thing on screen; reverts to
              the natural left-sidebar layout on lg+. */}
          <div className={`space-y-4 ${isInTelegram ? "order-2 lg:order-1 lg:col-span-1" : "lg:col-span-1"}`}>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h1 className="text-lg font-bold text-gray-900 mb-1">{order.service_title}</h1>
              <p className="text-sm text-gray-400 mb-4">{t("orderNumber", { id: String(order.id) })}</p>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${STATUS_STYLE[order.order_status] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {STATUS_KEY[order.order_status] ? tStatus(STATUS_KEY[order.order_status]) : order.order_status}
                </div>
                {isSupportIntroCall && (
                  <div className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full border bg-indigo-50 text-indigo-600 border-indigo-100">
                    {t("introCallBadge")}
                  </div>
                )}
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
                  {isSupportIntroCall ? (
                    <span className="text-xs font-medium text-gray-500">{t("freeAmount")}</span>
                  ) : (
                    <span className="font-bold text-gray-900">{Number(order.total_price).toLocaleString("ru-RU")} ₸</span>
                  )}
                </div>
                {role === "mentor" && !isFreeIntro && !isSupportIntroCall && (
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
                      {new Date(order.scheduled_at).toLocaleString(locale, {
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

              {/* Mentor: confirm/decline a student-booked intro-call slot,
                  right here on the same card as the slot time above it —
                  the booking is provisional until answered here. */}
              {role === "mentor" && order.order_status === "draft"
                && order.payout_category === "support" && order.support_engagement === null && (
                <div className="pt-4 mt-4 border-t border-gray-50">
                  {introCallResponseDeadlineMs != null && (
                    <p className="text-xs font-medium text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                      {t("introCallDeadlineHint", {
                        date: new Date(
                          new Date(order.created_at).getTime() + introCallResponseDeadlineMs,
                        ).toLocaleString(locale, {
                          day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                        }),
                      })}
                    </p>
                  )}
                  {introCallError && (
                    <p className="text-xs text-red-600 mb-3">{introCallError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmIntroCall}
                      disabled={respondingToIntroCall}
                      className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {t("introCallConfirmCta")}
                    </button>
                    <button
                      onClick={handleDeclineIntroCall}
                      disabled={respondingToIntroCall}
                      className="flex-1 border border-red-200 text-red-700 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {t("introCallDeclineCta")}
                    </button>
                  </div>
                </div>
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


            {/* Mentor: full client window — tasks, documents and service
                history with this student, all in one place. */}
            {role === "mentor" && (
              <Link
                href={`/mentor/clients/${order.student}`}
                className="flex items-center justify-between gap-2 bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Icon name="history" size={16} className="text-gray-500" />
                  {t("historyTitle")}
                </span>
                <Icon name="arrow_forward_ios" size={14} className="text-gray-300 flex-shrink-0" />
              </Link>
            )}


            {/* Mentor: complete any in_progress order — except support
                installments, which complete automatically (paying the
                next one, or ending the engagement) instead of through a
                manual step; see apps.orders.services on the backend. */}
            {role === "mentor" && order.order_status === "in_progress" && !isSupport && (
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
                    : isSupport
                      ? t("inProgressBodySupport")
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
                      setReceiptError(err instanceof Error ? translateFileUploadErrorMessage(err.message, t) : t("uploadFailed"))
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

            {/* Review form — student only. Free-intro consultations are
                intro contact, not work, so never reviewable. Everything
                else needs order_status "completed" — except support
                engagements, which run for months, so the backend (see
                apps.reviews.serializers.ReviewCreateSerializer.validate_order)
                allows reviewing while still "in_progress" too. */}
            {role !== "mentor" && !isFreeConsultation
              && (order.order_status === "completed" || (isSupport && order.order_status === "in_progress")) && (
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

            {/* Support-engagement tasks — mentor sets them for the
                student, only the mentor can edit/delete/mark done. */}
            {order.support_engagement !== null && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
                  <Icon name="checklist" size={16} className="text-gray-400" />
                  {t("tasksTitle")}
                </h3>

                {tasksLoadError && (
                  <p className="text-xs text-red-600 mb-2">{t("tasksLoadError")}</p>
                )}

                {/* Mark-done/delete errors — creating a task has its own
                    separate error surface inside SupportChatActions. */}
                {taskError && (
                  <p className="text-xs text-red-600 mb-2">{taskError}</p>
                )}

                {tasks.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-2 group">
                        <button
                          onClick={() => role === "mentor" && handleToggleTaskDone(task)}
                          disabled={role !== "mentor" || updatingTaskId === task.id}
                          aria-label={task.title}
                          className={
                            "mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors "
                            + (task.is_done
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-gray-300 " + (role === "mentor" ? "hover:border-gray-400" : ""))
                          }
                        >
                          {task.is_done && <Icon name="check" size={12} className="text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={"text-sm " + (task.is_done ? "text-gray-400 line-through" : "text-gray-700")}>
                            {task.title}
                          </p>
                          {task.deadline && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {t("taskDeadlineLabel", { date: task.deadline })}
                            </p>
                          )}
                          {task.document && (
                            <a
                              href={task.document.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-700"
                            >
                              <Icon name="attach_file" size={12} />
                              {task.document.original_filename}
                            </a>
                          )}
                        </div>
                        {role === "mentor" && (
                          <button
                            onClick={() => handleDeleteTask(task)}
                            disabled={updatingTaskId === task.id}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0 disabled:opacity-50"
                          >
                            <Icon name="close" size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {tasks.length === 0 && !tasksLoadError && (
                  <p className="text-xs text-gray-400">{t("tasksEmpty")}</p>
                )}
              </div>
            )}

            {/* Support-engagement payment schedule — the full month-by-
                month breakdown, visible to mentor and student alike, not
                just what's currently due. */}
            {order.support_engagement !== null && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
                  <Icon name="calendar_month" size={16} className="text-gray-400" />
                  {t("scheduleTitle")}
                </h3>

                {scheduleLoadError && (
                  <p className="text-xs text-red-600 mb-2">{t("scheduleLoadError")}</p>
                )}

                {schedule.length > 0 && (
                  <div className="space-y-2">
                    {schedule.map((entry) => (
                      <div
                        key={entry.installment_number}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-gray-600">
                          {t("scheduleMonthLabel", { number: entry.installment_number, total: schedule.length })}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-medium text-gray-900">
                            {Number(entry.amount).toLocaleString("ru-RU")} ₸
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[entry.status] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                            {STATUS_KEY[entry.status] ? tStatus(STATUS_KEY[entry.status]) : entry.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
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

                {docsLoadError && (
                  <p className="text-xs text-red-600 mb-2">{t("docsLoadError")}</p>
                )}

                {docActionError && (
                  <p className="text-xs text-red-600 mb-2">{docActionError}</p>
                )}

                {orderDocs.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {orderDocs.map((doc) => {
                      const isUploader = currentUserId !== null && currentUserId === doc.uploaded_by
                      // Payment receipts go through a separate admin-only
                      // verification pipeline — reviewing them here would
                      // show a "verified" badge finance never confirmed.
                      const isReviewable = doc.kind === "general"
                      const commentsOpen = openCommentsDocId === doc.id
                      const commentsLoaded = docComments[doc.id] !== undefined
                      const comments = docComments[doc.id] ?? []
                      return (
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
                                setDocActionError("")
                                deleteOrderDocument(order.id, doc.id)
                                  .then(() => setOrderDocs((prev) => prev.filter((d) => d.id !== doc.id)))
                                  .catch((err: unknown) => {
                                    setDocActionError(err instanceof Error && err.message ? err.message : t("docActionError"))
                                  })
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

                        <div className="flex items-center gap-1.5 mt-1 ml-9 flex-wrap">
                          {isReviewable && (
                            <span
                              className={
                                "text-[10px] px-1.5 py-0.5 rounded-full font-medium " +
                                (doc.status === "verified"
                                  ? "bg-green-50 text-green-600"
                                  : doc.status === "needs_revision"
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-gray-100 text-gray-400")
                              }
                            >
                              {t(
                                doc.status === "verified"
                                  ? "docStatusVerified"
                                  : doc.status === "needs_revision"
                                  ? "docStatusNeedsRevision"
                                  : "docStatusPending"
                              )}
                            </span>
                          )}

                          {isReviewable && !isUploader && (
                            <>
                              <button
                                disabled={updatingDocStatusId === doc.id}
                                onClick={() => {
                                  setUpdatingDocStatusId(doc.id)
                                  setDocActionError("")
                                  setDocumentStatus(order.id, doc.id, "verified")
                                    .then((updated) =>
                                      setOrderDocs((prev) => prev.map((d) => (d.id === doc.id ? updated : d)))
                                    )
                                    .catch((err: unknown) => {
                                      setDocActionError(err instanceof Error && err.message ? err.message : t("docActionError"))
                                    })
                                    .finally(() => setUpdatingDocStatusId(null))
                                }}
                                className="text-[10px] text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                              >
                                {t("docVerifyButton")}
                              </button>
                              <button
                                disabled={updatingDocStatusId === doc.id}
                                onClick={() => {
                                  setUpdatingDocStatusId(doc.id)
                                  setDocActionError("")
                                  setDocumentStatus(order.id, doc.id, "needs_revision")
                                    .then((updated) =>
                                      setOrderDocs((prev) => prev.map((d) => (d.id === doc.id ? updated : d)))
                                    )
                                    .catch((err: unknown) => {
                                      setDocActionError(err instanceof Error && err.message ? err.message : t("docActionError"))
                                    })
                                    .finally(() => setUpdatingDocStatusId(null))
                                }}
                                className="text-[10px] text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
                              >
                                {t("docNeedsRevisionButton")}
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => {
                              const next = commentsOpen ? null : doc.id
                              setOpenCommentsDocId(next)
                              if (next !== null && docComments[doc.id] === undefined) {
                                setLoadingCommentsDocId(doc.id)
                                setDocActionError("")
                                fetchDocumentComments(order.id, doc.id)
                                  .then((list) => setDocComments((prev) => ({ ...prev, [doc.id]: list })))
                                  .catch((err: unknown) => {
                                    setDocActionError(err instanceof Error && err.message ? err.message : t("docActionError"))
                                  })
                                  .finally(() => setLoadingCommentsDocId(null))
                              }
                            }}
                            className="text-[10px] text-gray-400 hover:text-gray-600 font-medium ml-auto"
                          >
                            {commentsLoaded ? t("docCommentsToggle", { count: comments.length }) : t("docCommentsToggleUnloaded")}
                          </button>
                        </div>

                        {commentsOpen && (
                          <div className="ml-9 mt-1.5 space-y-1.5">
                            {loadingCommentsDocId === doc.id && comments.length === 0 && (
                              <p className="text-[10px] text-gray-300">{t("docCommentsLoading")}</p>
                            )}
                            {comments.map((c) => (
                              <div key={c.id} className="text-[10px] bg-gray-50 rounded-lg px-2 py-1.5">
                                <span className="font-medium text-gray-600">{c.author_email}</span>
                                <p className="text-gray-500 mt-0.5 whitespace-pre-wrap break-words">{c.text}</p>
                              </div>
                            ))}
                            <form
                              onSubmit={(e) => {
                                e.preventDefault()
                                const text = (commentDrafts[doc.id] ?? "").trim()
                                if (!text) return
                                setPostingCommentDocId(doc.id)
                                setDocActionError("")
                                postDocumentComment(order.id, doc.id, text)
                                  .then((created) => {
                                    setDocComments((prev) => ({
                                      ...prev,
                                      [doc.id]: [...(prev[doc.id] ?? []), created],
                                    }))
                                    setCommentDrafts((prev) => ({ ...prev, [doc.id]: "" }))
                                  })
                                  .catch((err: unknown) => {
                                    setDocActionError(err instanceof Error && err.message ? err.message : t("docActionError"))
                                  })
                                  .finally(() => setPostingCommentDocId(null))
                              }}
                              className="flex items-center gap-1.5"
                            >
                              <input
                                type="text"
                                value={commentDrafts[doc.id] ?? ""}
                                onChange={(e) =>
                                  setCommentDrafts((prev) => ({ ...prev, [doc.id]: e.target.value }))
                                }
                                placeholder={t("docCommentPlaceholder")}
                                className="flex-1 min-w-0 text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-300"
                              />
                              <button
                                type="submit"
                                disabled={postingCommentDocId === doc.id || !(commentDrafts[doc.id] ?? "").trim()}
                                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-40 flex-shrink-0"
                              >
                                {t("docCommentSend")}
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                )}

                {/* Files are attached via chat now (any file sent in the
                    chat automatically lands here too) — no separate
                    upload control on this page any more. */}
                <p className="text-xs text-gray-400 text-center py-2">
                  {t("filesUploadViaChatHint")}
                </p>
              </div>
            )}

            {/* Mentor: end this one engagement with this one student — the
                service itself, and every other student's engagement under
                it, stays untouched. Only offered while there's actually
                something to end. Placed last — destructive/low-priority
                relative to the rest of the order's status/action cards. */}
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
                    {otherPartyOnline && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {!canChat
                      ? t("chatPreviewLocked")
                      : chatPreview ?? t("chatPreviewStart")}
                  </p>
                </div>
                <Icon name="arrow_forward_ios" size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            )}
            {canChat && order.conversation_id ? (
              isInTelegram ? (
                <ChatOverlay
                  conversationId={order.conversation_id}
                  currentUserId={currentUserId}
                  onClose={() => setChatExpanded(false)}
                  onCloseAriaLabel={t("collapseChatAria")}
                  hidden={!chatExpanded}
                  onOtherPartyOnlineChange={setOtherPartyOnline}
                  onPreviewChange={setChatPreview}
                  refetchTrigger={invoiceChatRefetchSignal}
                  onAttachmentSent={() => {
                    fetchOrderDocuments(order.id).then(setOrderDocs).catch(() => setDocsLoadError(true))
                  }}
                  webApp={webApp}
                  headerAction={chatHeaderAction}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-[640px]">
                  <ChatPanel
                    conversationId={order.conversation_id}
                    currentUserId={currentUserId}
                    onOtherPartyOnlineChange={setOtherPartyOnline}
                    onPreviewChange={setChatPreview}
                    refetchTrigger={invoiceChatRefetchSignal}
                    onAttachmentSent={() => {
                      fetchOrderDocuments(order.id).then(setOrderDocs).catch(() => setDocsLoadError(true))
                    }}
                    headerAction={chatHeaderAction}
                  />
                </div>
              )
            ) : (
              <div className={
                isInTelegram && chatExpanded
                  ? "fixed inset-0 z-50 bg-white flex flex-col h-[100dvh]"
                  : isInTelegram
                    ? "hidden"
                    : "bg-white rounded-2xl border border-gray-200 flex flex-col h-[640px]"
              }>
                {/* Chat header (locked) */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-50 flex-shrink-0 flex items-center gap-3">
                  {isInTelegram && chatExpanded && (
                    <button
                      type="button"
                      onClick={() => setChatExpanded(false)}
                      className="text-gray-500 hover:text-gray-900 transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0 [-webkit-tap-highlight-color:transparent]"
                      aria-label={t("collapseChatAria")}
                    >
                      <Icon name="arrow_back" size={22} />
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900">{t("messagesTitle")}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{t("messagesSubtitleLocked")}</p>
                  </div>
                </div>
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
              </div>
            )}
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
