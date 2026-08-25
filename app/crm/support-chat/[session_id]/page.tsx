"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { fetchAdminSupportChatMessages, sendAdminSupportChatReply } from "@/lib/api"
import { SUPPORT_CHAT_MESSAGE_MAX_LENGTH, SupportChatMessage } from "@/lib/supportChat"
import Icon from "@/components/Icon"

export default function CRMSupportChatDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = String(params.session_id)

  const [messages, setMessages] = useState<SupportChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = () => {
    setLoading(true)
    fetchAdminSupportChatMessages(sessionId)
      .then(setMessages)
      .catch(() => setError("Не удалось загрузить чат"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    const trimmed = reply.trim()
    if (!trimmed) return
    setSending(true)
    setError("")
    try {
      const message = await sendAdminSupportChatReply(sessionId, trimmed)
      setMessages((prev) => [...prev, message])
      setReply("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить ответ")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Icon name="arrow_back" size={16} />
          Назад
        </button>
        <button
          onClick={load}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors ml-auto"
        >
          <Icon name="refresh" size={16} />
          Обновить
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Нет сообщений</div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend() }}
          maxLength={SUPPORT_CHAT_MESSAGE_MAX_LENGTH}
          placeholder="Ответить посетителю..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={sending || !reply.trim()}
          className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          Отправить
        </button>
      </div>
      <p className="mt-1.5 text-xs text-gray-400 text-center">
        Ответ уходит и в виджет на сайте, и в Telegram-группу поддержки
      </p>
    </div>
  )
}

function MessageBubble({ msg }: { msg: SupportChatMessage }) {
  const isStaff = msg.sender === "staff"
  return (
    <div className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] ${isStaff ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        <span className="text-xs text-gray-400">{isStaff ? "Поддержка" : "Посетитель"}</span>
        <div
          className={`px-3 py-2 rounded-2xl text-sm ${
            isStaff ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-gray-100 text-gray-900 rounded-tl-sm"
          }`}
        >
          {msg.text}
        </div>
        <span className="text-xs text-gray-300">
          {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  )
}
