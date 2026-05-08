"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  fetchUnreadNotificationCount,
  fetchNotifications,
  getFreshAccessToken,
  markNotificationsRead,
  type NotificationItem,
} from "@/lib/api"
import Icon from "./Icon"

const KIND_ICON: Record<string, string> = {
  "order.created": "shopping_cart",
  "consultation.confirmed": "check_circle",
  "order.completed": "task_alt",
  "review.new": "star",
  "review.reply": "reply",
}

// Used only as a fallback when the WebSocket connection cannot be
// established (anonymous tab, hostile proxy, browser blocks WS).
const POLL_FALLBACK_INTERVAL = 60_000

function buildWebSocketBase(): string | null {
  // NEXT_PUBLIC_API_URL is like `https://api.connectus.kz/api/v1`.
  // The notifications WS lives at `wss://api.connectus.kz/ws/notifications/`.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return null
  try {
    const url = new URL(apiUrl)
    const scheme = url.protocol === "https:" ? "wss:" : "ws:"
    return `${scheme}//${url.host}/ws/notifications/`
  } catch {
    return null
  }
}

export default function NotificationBell() {
  const router = useRouter()
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Subscribe to the notifications WebSocket. Polling is kept as a
  // fallback only — engaged when the WS can't be opened or after it
  // closes, until the next successful reconnect.
  useEffect(() => {
    let active = true
    let backoffMs = 1_000
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let fallbackTimer: ReturnType<typeof setInterval> | null = null

    const refreshCount = () => {
      fetchUnreadNotificationCount()
        .then((c) => { if (active) setCount(c) })
        .catch(() => { /* offline — polling will retry */ })
    }

    const startFallback = () => {
      if (fallbackTimer) return
      fallbackTimer = setInterval(refreshCount, POLL_FALLBACK_INTERVAL)
    }
    const stopFallback = () => {
      if (fallbackTimer) {
        clearInterval(fallbackTimer)
        fallbackTimer = null
      }
    }

    const connect = async () => {
      const wsBase = buildWebSocketBase()
      if (!wsBase) {
        startFallback()
        return
      }
      // Refresh near-expiry access token before opening the socket —
      // a stale token would just bounce the handshake (close 4001)
      // and drop us into polling fallback even though the user is
      // actively logged in.
      let token: string | null
      try {
        token = await getFreshAccessToken()
      } catch {
        // Refresh hard-failed: refreshAccessToken already navigated
        // the tab to /auth/login, so further work here is moot.
        startFallback()
        return
      }
      if (!active || !token) {
        if (!token) startFallback()
        return
      }
      try {
        ws = new WebSocket(`${wsBase}?token=${encodeURIComponent(token)}`)
      } catch {
        startFallback()
        return
      }

      ws.onopen = () => {
        // Real-time channel is live — no need to keep polling.
        stopFallback()
        backoffMs = 1_000
      }

      ws.onmessage = (event) => {
        try {
          const fresh = JSON.parse(event.data) as NotificationItem
          if (typeof fresh !== "object" || fresh === null || !("id" in fresh)) {
            return
          }
          if (!fresh.is_read) {
            setCount((c) => c + 1)
          }
          setItems((prev) => {
            // Dedupe — a refresh racing the push could otherwise show
            // the same row twice.
            if (prev.some((n) => n.id === fresh.id)) return prev
            return [fresh, ...prev]
          })
        } catch {
          // Bad payload — fallback polling will resync the badge.
        }
      }

      ws.onclose = () => {
        ws = null
        if (!active) return
        // Lean on polling while we're disconnected, retry the WS with
        // capped exponential backoff (1s → 60s). Cleanly survives the
        // dev server reload, network blips, and idle-laptop sleeps.
        startFallback()
        const delay = Math.min(backoffMs, 60_000)
        backoffMs = Math.min(backoffMs * 2, 60_000)
        reconnectTimer = setTimeout(connect, delay)
      }

      // onerror precedes onclose — let onclose drive the reconnect.
      ws.onerror = () => { /* noop */ }
    }

    refreshCount()
    connect()

    return () => {
      active = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      stopFallback()
      if (ws) {
        // Detach our handler so the synthetic close doesn't trigger a
        // reconnect on a component that's already unmounting.
        ws.onclose = null
        ws.close()
      }
    }
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleOpen = useCallback(async () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    setLoading(true)
    try {
      const data = await fetchNotifications()
      setItems(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [open])

  const handleMarkAllRead = async () => {
    await markNotificationsRead()
    setCount(0)
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const handleClick = async (n: NotificationItem) => {
    if (!n.is_read) {
      await markNotificationsRead([n.id])
      setCount((c) => Math.max(0, c - 1))
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
    }
    setOpen(false)
    if (n.url) router.push(n.url)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "только что"
    if (mins < 60) return `${mins} мин`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} ч`
    const days = Math.floor(hours / 24)
    return `${days} д`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors [-webkit-tap-highlight-color:transparent]"
        aria-label="Уведомления"
      >
        <Icon name="notifications" size={22} className="text-gray-600" filled={open} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-in">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Уведомления</h3>
            {count > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Прочитать все
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center">
                <Icon name="notifications_none" size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Нет уведомлений</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                    !n.is_read ? "bg-indigo-50/40" : ""
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    !n.is_read ? "bg-indigo-100" : "bg-gray-100"
                  }`}>
                    <Icon
                      name={KIND_ICON[n.kind] || "notifications"}
                      size={16}
                      className={!n.is_read ? "text-indigo-600" : "text-gray-400"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.is_read ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
