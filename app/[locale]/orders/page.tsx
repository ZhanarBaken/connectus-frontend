"use client"

import { useState, useEffect, useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { authFetch, fetchOrders, fetchMentors } from "@/lib/api"
import { useStudentOnboardingGate } from "@/lib/useStudentOnboardingGate"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import { Order } from "@/types"
import BackButton from "@/components/BackButton"
import ChatPanel from "@/components/ChatPanel"
import Icon from "@/components/Icon"
import { Avatar } from "@/components/Avatar"

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

interface ClientGroup {
  studentId: number
  studentName: string
  studentPhoto: string | null
  orders: Order[]
  activeCount: number
}

interface ActiveChat {
  conversationId: number
  name: string
  photo: string | null
}

export default function OrdersPage() {
  const t = useTranslations("Orders.List")
  const tCommon = useTranslations("Common")
  const tStatus = useTranslations("OrderStatus")
  const locale = useLocale()
  useStudentOnboardingGate()
  const { isInTelegram, webApp } = useTelegramWebApp()
  const [orders, setOrders] = useState<Order[]>([])
  const [mentorNames, setMentorNames] = useState<Record<number, string>>({})
  const [mentorNamesLoadError, setMentorNamesLoadError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [expandedClient, setExpandedClient] = useState<number | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null)

  // Mini App opens at half-height by default — expand once the overlay
  // is up, same as the order page and /messages/[id].
  useEffect(() => {
    if (!activeChat || !webApp) return
    try { webApp.expand() } catch { /* older clients */ }
  }, [activeChat, webApp])

  // Lock the body scroll while the fullscreen chat overlay is up so a
  // swipe doesn't drag the list underneath it.
  useEffect(() => {
    if (!activeChat) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [activeChat])

  // Small extra tag alongside the status pill for a support installment
  // that's overdue or paused — null when neither applies.
  const dunningTag = (order: Order): { text: string; className: string } | null => {
    // engagement_status is shared by every order tied to that engagement
    // (paid installments, free sessions, even cancelled ones) — only the
    // one still-payable order should actually show the paused/overdue tag.
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
    setRole(r)
    fetchOrders()
      .then(async (list) => {
        setOrders(list)
        if (r !== "mentor") await loadMentorNames()
      })
      .finally(() => setLoading(false))
    authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => { if (me) setCurrentUserId(me.id) })
      .catch(() => {})
  }, [])

  // Group orders by student for mentor view
  const clientGroups = useMemo((): ClientGroup[] => {
    if (role !== "mentor") return []
    const map = new Map<number, ClientGroup>()
    for (const order of orders) {
      const sid = order.student
      if (!map.has(sid)) {
        map.set(sid, {
          studentId: sid,
          studentName: order.student_info?.full_name?.trim().split(/\s+/)[0] || t("applicantDefault"),
          studentPhoto: order.student_info?.profile_photo ?? null,
          orders: [],
          activeCount: 0,
        })
      }
      const group = map.get(sid)!
      group.orders.push(order)
      if (["draft", "pending_payment", "in_progress"].includes(order.order_status)) {
        group.activeCount++
      }
    }
    // Sort: clients with active orders first
    return Array.from(map.values()).sort((a, b) => b.activeCount - a.activeCount)
  }, [orders, role, t])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isMentor = role === "mentor"

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-4 transition-colors group [-webkit-tap-highlight-color:transparent]" />
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          {isMentor ? t("titleMentor") : t("titleStudent")}
        </h1>

        {!isMentor && mentorNamesLoadError && (
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
              <Icon name={isMentor ? "people" : "description"} size={48} className="text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {isMentor ? t("noClientsTitle") : t("noOrdersTitle")}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {isMentor ? t("noClientsBody") : t("noOrdersBody")}
            </p>
            {!isMentor && (
              <Link href="/mentors" className="inline-flex bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
                {t("findMentor")}
              </Link>
            )}
          </div>
        ) : isMentor ? (
          /* ─── Mentor view: grouped by client ─── */
          <div className="space-y-4">
            {clientGroups.map((client) => {
              const isExpanded = expandedClient === client.studentId
              // Find an order with a chat conversation to link to
              const chatOrder = client.orders.find((o) => o.conversation_id !== null)
              return (
                <div key={client.studentId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  {/* Client header — clickable to expand */}
                  <div className="flex items-center gap-4 p-5">
                    <button
                      type="button"
                      onClick={() => setExpandedClient(isExpanded ? null : client.studentId)}
                      className="flex items-center gap-4 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left [-webkit-tap-highlight-color:transparent]"
                    >
                      <Avatar
                        src={client.studentPhoto}
                        name={client.studentName}
                        className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500"
                        letterClassName="text-white font-bold"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">{client.studentName}</h3>
                          {client.activeCount > 0 && (
                            <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                              {client.activeCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t("ordersCount", { count: client.orders.length })}
                        </p>
                      </div>
                      <Icon
                        name={isExpanded ? "expand_less" : "expand_more"}
                        size={24}
                        className="text-gray-400 flex-shrink-0"
                      />
                    </button>
                    {chatOrder && (isInTelegram ? (
                      // Inside the Mini App, open the fullscreen chat
                      // overlay right here — no navigation, no order-page
                      // flash before the overlay kicks in.
                      <button
                        type="button"
                        onClick={() => setActiveChat({
                          conversationId: chatOrder.conversation_id!,
                          name: client.studentName,
                          photo: client.studentPhoto,
                        })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition-colors flex-shrink-0"
                      >
                        <Icon name="chat" size={16} />
                        {t("chat")}
                      </button>
                    ) : (
                      <Link
                        href={`/orders/${chatOrder.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition-colors flex-shrink-0"
                      >
                        <Icon name="chat" size={16} />
                        {t("chat")}
                      </Link>
                    ))}
                  </div>

                  {/* Orders list — expandable */}
                  {isExpanded && (
                    <div className="border-t border-gray-50">
                      {client.orders.map((order) => (
                        <Link
                          key={order.id}
                          href={`/orders/${order.id}`}
                          className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{order.service_title}</h4>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(order.created_at).toLocaleDateString(locale, { day: "numeric", month: "long" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {dunningTag(order) && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dunningTag(order)!.className}`}>
                                {dunningTag(order)!.text}
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[order.order_status]}`}>
                              {tStatus(STATUS_KEY[order.order_status])}
                            </span>
                            {order.total_price !== "0.00" && (
                              <span className="text-sm font-bold text-gray-900">
                                {Number(order.total_price).toLocaleString("ru-RU")} ₸
                              </span>
                            )}
                            <Icon name="arrow_forward" size={16} className="text-gray-300" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* ─── Student view: flat list ─── */
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

      {/* Fullscreen in-page chat overlay for the Mini App — same pattern
          as the order page's chatExpanded overlay, so tapping "Chat" here
          opens straight to chat, not the order page first. */}
      {activeChat && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col h-[100dvh]">
          <ChatPanel
            conversationId={activeChat.conversationId}
            currentUserId={currentUserId}
            leadingHeaderAction={(
              <button
                type="button"
                onClick={() => setActiveChat(null)}
                className="text-gray-500 hover:text-gray-900 transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0 [-webkit-tap-highlight-color:transparent]"
                aria-label={tCommon("back")}
              >
                <Icon name="arrow_back" size={22} />
              </button>
            )}
            titleOverride={(
              <div className="flex-1 min-w-0 flex items-center gap-2.5">
                <Avatar
                  src={activeChat.photo}
                  name={activeChat.name}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex-shrink-0"
                  letterClassName="text-white font-bold text-xs"
                />
                <h1 className="font-semibold text-gray-900 truncate">{activeChat.name}</h1>
              </div>
            )}
          />
        </div>
      )}
    </div>
  )
}
