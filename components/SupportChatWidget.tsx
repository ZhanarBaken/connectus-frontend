"use client"

import { useEffect, useRef, useState } from "react"
import {
  clearStoredSupportChatSessionId,
  connectSupportChat,
  fetchSupportChatHistory,
  getStoredSupportChatSessionId,
  sendSupportChatMessage,
  SUPPORT_CHAT_MESSAGE_MAX_LENGTH,
  SupportChatConnection,
  SupportChatMessage,
} from "@/lib/supportChat"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import Icon from "@/components/Icon"

// Floating support-chat bubble, mounted once at the root layout so it
// persists (and keeps its WebSocket open) across client-side page
// navigation. No login required — works for anonymous visitors, the
// entire point of this widget (see apps.support_chat on the backend).
export default function SupportChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<SupportChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [error, setError] = useState("")
  const connectionRef = useRef<SupportChatConnection | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  // The WS handler below is set up once in connectIfNeeded and outlives
  // many re-renders — a plain closure over `open` would go stale the
  // first time the panel is toggled after connecting. A ref always
  // reads the latest value.
  const openRef = useRef(open)
  openRef.current = open
  // Google Sign-In-style reasoning as login/page.tsx: nothing here is
  // useful inside the Mini App's own cramped view, and support is
  // already reachable through the bot itself there.
  const { isInTelegram } = useTelegramWebApp()

  const connectIfNeeded = (id: string) => {
    if (connectionRef.current) return
    connectionRef.current = connectSupportChat(id, {
      onMessage: (msg) => {
        setMessages((prev) => [...prev, msg])
        if (!openRef.current) setHasUnread(true)
      },
    })
  }

  // Resume an existing thread on mount — history first, then the
  // socket, so nothing already-sent-and-answered is missed between
  // the fetch and the connect. Gated on isInTelegram itself, not just
  // the render's `return null` below — a hook body runs regardless of
  // what the component renders, so skipping this only in JSX would
  // still fetch history and open a live socket inside the Mini App.
  useEffect(() => {
    if (isInTelegram) return
    const existing = getStoredSupportChatSessionId()
    if (!existing) return
    setSessionId(existing)
    fetchSupportChatHistory(existing)
      .then(setMessages)
      .catch(() => setError("Не удалось загрузить историю переписки."))
      .finally(() => connectIfNeeded(existing))
    return () => {
      connectionRef.current?.close()
      connectionRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInTelegram])

  useEffect(() => {
    if (open) setHasUnread(false)
  }, [open])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, open])

  if (isInTelegram) return null

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError("")
    try {
      const { session_id, message } = await sendSupportChatMessage(text, sessionId)
      setMessages((prev) => [...prev, message])
      setDraft("")
      if (!sessionId) {
        setSessionId(session_id)
        connectIfNeeded(session_id)
      }
    } catch {
      setError("Не удалось отправить сообщение. Попробуй ещё раз.")
    } finally {
      setSending(false)
    }
  }

  // "Not you?" — a shared/public computer must not keep silently
  // resuming the previous visitor's thread. Backend has no session
  // TTL, so this is the only reset available.
  const handleStartNewChat = () => {
    connectionRef.current?.close()
    connectionRef.current = null
    clearStoredSupportChatSessionId()
    setSessionId(null)
    setMessages([])
    setHasUnread(false)
    setError("")
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[340px] max-w-[calc(100vw-2.5rem)] h-[460px] max-h-[70vh] bg-white rounded-2xl border border-gray-200 shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-900 text-white">
            <span className="text-sm font-semibold">Поддержка Connectus</span>
            <div className="flex items-center gap-3">
              {sessionId && (
                <button
                  type="button"
                  onClick={handleStartNewChat}
                  className="text-xs text-white/60 hover:text-white transition-colors underline underline-offset-2"
                >
                  Не ты? Новый чат
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть чат"
                className="text-white/70 hover:text-white transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-6 px-4">
                Напиши нам — обычно отвечаем в течение пары часов.
              </p>
            ) : (
              messages.map((msg) => {
                const isVisitor = msg.sender === "visitor"
                return (
                  <div key={msg.id} className={`flex ${isVisitor ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isVisitor
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {error && (
            <p className="px-4 pb-1 text-xs text-red-600">{error}</p>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-gray-100">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Напиши сообщение..."
              maxLength={SUPPORT_CHAT_MESSAGE_MAX_LENGTH}
              disabled={sending}
              className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Отправить"
              className="shrink-0 w-10 h-10 flex items-center justify-center bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="send" size={18} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Закрыть чат поддержки" : "Открыть чат поддержки"}
        className="relative w-14 h-14 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
      >
        <Icon name={open ? "close" : "chat"} size={24} filled={!open} />
        {hasUnread && !open && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
        )}
      </button>
    </div>
  )
}
