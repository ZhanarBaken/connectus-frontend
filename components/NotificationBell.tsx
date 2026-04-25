"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  fetchUnreadNotificationCount,
  fetchNotifications,
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

const POLL_INTERVAL = 30_000 // 30s

export default function NotificationBell() {
  const router = useRouter()
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Poll unread count
  useEffect(() => {
    let active = true
    const poll = () => {
      fetchUnreadNotificationCount()
        .then((c) => { if (active) setCount(c) })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, POLL_INTERVAL)
    return () => { active = false; clearInterval(id) }
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
