"use client"

import { useEffect, useState, use } from "react"
import { useTranslations } from "next-intl"
import { useRouter, Link } from "@/i18n/navigation"
import {
  authFetch, fetchMentorClient, fetchMentorClientTasks, fetchMentorClientDocuments,
  fetchOrders, updateSupportTask, type MentorClient, type MentorClientDocument,
} from "@/lib/api"
import { startConversationWithClient } from "@/lib/chat"
import { useMentorOnboardingGate } from "@/lib/useMentorOnboardingGate"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import { Order, SupportTask } from "@/types"
import { Avatar } from "@/components/Avatar"
import BackButton from "@/components/BackButton"
import ChatOverlay from "@/components/ChatOverlay"
import ChatPanel from "@/components/ChatPanel"
import DatePicker from "@/components/DatePicker"
import Icon from "@/components/Icon"
import MentorStatusBanner from "@/components/MentorStatusBanner"
import SupportChatActions from "@/components/SupportChatActions"

const STATUS_KEY: Record<string, string> = {
  draft: "draft",
  pending_payment: "pendingPayment",
  paid: "paid",
  in_progress: "inProgress",
  completed: "completed",
  disputed: "disputed",
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

interface Props {
  params: Promise<{ id: string }>
}

export default function MentorClientWindowPage({ params }: Props) {
  const { id } = use(params)
  const studentId = Number(id)
  const t = useTranslations("Orders.Detail")
  const tClients = useTranslations("Dashboard.MentorClients")
  const tWindow = useTranslations("Dashboard.MentorClientWindow")
  const tStatus = useTranslations("OrderStatus")
  const router = useRouter()
  useMentorOnboardingGate()
  const { isInTelegram, webApp } = useTelegramWebApp()

  const [client, setClient] = useState<MentorClient | null>(null)
  const [clientError, setClientError] = useState("")
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [chatExpanded, setChatExpanded] = useState(false)
  const [chatRefetchSignal, setChatRefetchSignal] = useState(0)

  const [tasks, setTasks] = useState<SupportTask[]>([])
  const [tasksError, setTasksError] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null)
  const [editingDeadlineTaskId, setEditingDeadlineTaskId] = useState<number | null>(null)

  const [documents, setDocuments] = useState<MentorClientDocument[]>([])
  const [documentsError, setDocumentsError] = useState(false)

  const [orders, setOrders] = useState<Order[]>([])
  const [ordersError, setOrdersError] = useState(false)

  const loadTasks = () => {
    fetchMentorClientTasks(studentId).then(setTasks).catch(() => setTasksError(true))
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace(`/auth/login?next=/mentor/clients/${studentId}`)
      return
    }

    fetchMentorClient(studentId)
      .then(async (c) => {
        setClient(c)
        setConversationId(
          c.conversation_id ?? (await startConversationWithClient(studentId)).id,
        )
      })
      .catch(() => setClientError(tClients("errorGeneric")))
      .finally(() => setLoading(false))

    loadTasks()
    fetchMentorClientDocuments(studentId).then(setDocuments).catch(() => setDocumentsError(true))
    fetchOrders({ studentId }).then(setOrders).catch(() => setOrdersError(true))

    authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => { if (me) setCurrentUserId(me.id) })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, router])

  const handleToggleTaskDone = async (task: SupportTask) => {
    setUpdatingTaskId(task.id)
    try {
      const updated = await updateSupportTask(task.engagement, task.id, { is_done: !task.is_done })
      setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    } catch {
      setTasksError(true)
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const handleChangeDeadline = async (task: SupportTask, deadline: string) => {
    setUpdatingTaskId(task.id)
    try {
      const updated = await updateSupportTask(task.engagement, task.id, { deadline: deadline || null })
      setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      setEditingDeadlineTaskId(null)
      // The chat message this posts isn't pushed with its rich fields
      // over the websocket (same reasoning as SupportChatActions) — bump
      // the chat's refetch so it picks up the "deadline changed" message.
      setChatRefetchSignal((n) => n + 1)
    } catch {
      setTasksError(true)
    } finally {
      setUpdatingTaskId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (clientError || !client) {
    return (
      <div className="min-h-screen bg-[#fafafa] px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <BackButton fallbackHref="/mentor/clients" />
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mt-4">
            {clientError || tClients("errorGeneric")}
          </div>
        </div>
      </div>
    )
  }

  const hasActiveEngagement = client.engagement_id !== null
  const chatHeaderAction = (
    <SupportChatActions
      studentId={client.id}
      engagementId={client.engagement_id}
      onActionPosted={() => { setChatRefetchSignal((n) => n + 1); loadTasks() }}
    />
  )

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <MentorStatusBanner />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <BackButton fallbackHref="/mentor/clients" />
          <div className="flex items-center gap-3 mt-4">
            <Avatar
              src={client.profile_photo}
              name={client.full_name}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500"
              letterClassName="text-white font-bold"
            />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{client.full_name}</h1>
              <p className="text-sm text-gray-400 truncate">
                {[client.current_school_or_university, client.city].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {!hasActiveEngagement && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-xs text-amber-700">
                {tWindow("noEngagementHint")}
              </div>
            )}

            {/* Tasks — every task ever set for this client, across every
                engagement. Only tasks under the current live engagement
                are editable; older ones render as read-only history. */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
                <Icon name="checklist" size={16} className="text-gray-400" />
                {t("tasksTitle")}
              </h3>
              {tasksError && <p className="text-xs text-red-600 mb-2">{t("tasksLoadError")}</p>}
              {tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const editable = task.engagement === client.engagement_id
                    return (
                      <div key={task.id} className="flex items-start gap-2 group">
                        <button
                          onClick={() => editable && handleToggleTaskDone(task)}
                          disabled={!editable || updatingTaskId === task.id}
                          aria-label={task.title}
                          className={
                            "mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors "
                            + (task.is_done
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-gray-300 " + (editable ? "hover:border-gray-400" : ""))
                          }
                        >
                          {task.is_done && <Icon name="check" size={12} className="text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={"text-sm " + (task.is_done ? "text-gray-400 line-through" : "text-gray-700")}>
                            {task.title}
                          </p>
                          {editingDeadlineTaskId === task.id ? (
                            <div className="mt-1">
                              <DatePicker
                                value={task.deadline ?? ""}
                                onChange={(value) => handleChangeDeadline(task, value)}
                                placeholder={t("taskDeadlinePlaceholder")}
                                className="text-[10px] px-2 py-1 border border-gray-200 rounded-lg"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {task.deadline && (
                                <p className="text-[10px] text-gray-400">
                                  {t("taskDeadlineLabel", { date: task.deadline })}
                                </p>
                              )}
                              {editable && (
                                <button
                                  type="button"
                                  onClick={() => setEditingDeadlineTaskId(task.id)}
                                  aria-label={tWindow("changeDeadlineAria")}
                                  className="text-gray-300 hover:text-indigo-600 transition-colors"
                                >
                                  <Icon name="event" size={12} />
                                </button>
                              )}
                            </div>
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
                      </div>
                    )
                  })}
                </div>
              ) : (
                !tasksError && <p className="text-xs text-gray-400">{t("tasksEmpty")}</p>
              )}
            </div>

            {/* Documents — every file exchanged with this client, across
                every order. Read-only here (verify/needs-revision still
                happens on the order page, since that's per-order). */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
                <Icon name="description" size={16} className="text-gray-400" />
                {t("filesTitle")}
              </h3>
              {documentsError && <p className="text-xs text-red-600 mb-2">{t("docsLoadError")}</p>}
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs hover:bg-gray-50 transition-colors"
                    >
                      <a
                        href={doc.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate flex-1 text-gray-700 hover:text-indigo-600"
                      >
                        {doc.original_filename}
                      </a>
                      <Link
                        href={`/orders/${doc.order_id}`}
                        className="flex-shrink-0 text-gray-400 hover:text-indigo-600"
                      >
                        <Icon name="open_in_new" size={14} />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                !documentsError && <p className="text-xs text-gray-400">{tWindow("documentsEmpty")}</p>
              )}
            </div>

            {/* Services / order history with this client. */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Icon name="history" size={16} className="text-gray-500" />
                {t("historyTitle")}
              </h3>
              {ordersError && <p className="text-xs text-red-600 mb-2">{t("scheduleLoadError")}</p>}
              {orders.length > 0 ? (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <Link
                      key={o.id}
                      href={`/orders/${o.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                      <span className="truncate flex-1">{o.service_title}</span>
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[o.order_status] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {STATUS_KEY[o.order_status] ? tStatus(STATUS_KEY[o.order_status]) : o.order_status}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                !ordersError && <p className="text-xs text-gray-400">{tWindow("ordersEmpty")}</p>
              )}
            </div>
          </div>

          {/* Chat — same Telegram-overlay / inline-panel split as the
              order page, sharing SupportChatActions as the header action
              so this is feature-identical to every other chat entry point. */}
          <div className="lg:col-span-2">
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
                  <p className="text-sm font-semibold text-gray-900">{t("chatTitle")}</p>
                </div>
                <Icon name="arrow_forward_ios" size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            )}
            {conversationId !== null && (
              isInTelegram ? (
                <ChatOverlay
                  conversationId={conversationId}
                  currentUserId={currentUserId}
                  onClose={() => setChatExpanded(false)}
                  onCloseAriaLabel={t("collapseChatAria")}
                  hidden={!chatExpanded}
                  refetchTrigger={chatRefetchSignal}
                  webApp={webApp}
                  headerAction={chatHeaderAction}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-[640px]">
                  <ChatPanel
                    conversationId={conversationId}
                    currentUserId={currentUserId}
                    refetchTrigger={chatRefetchSignal}
                    headerAction={chatHeaderAction}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
