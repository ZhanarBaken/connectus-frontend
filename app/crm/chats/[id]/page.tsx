"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { fetchChatMessages, fetchAdminConversations } from "@/lib/api"
import { AdminConversation, ChatMessage } from "@/types"
import Icon from "@/components/Icon"

export default function CRMChatDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversation, setConversation] = useState<AdminConversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetchChatMessages(id),
      fetchAdminConversations(),
    ])
      .then(([msgs, convs]) => {
        setMessages(msgs.slice().reverse())
        const conv = convs.find((c) => c.id === id)
        if (conv) setConversation(conv)
      })
      .catch(() => setError("Не удалось загрузить чат"))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
        {conversation && (
          <div className="text-sm text-gray-700">
            <span className="font-medium">{conversation.mentor_name}</span>
            <span className="text-gray-400 mx-2">↔</span>
            <span className="font-medium">{conversation.student_name}</span>
            {conversation.closed_at && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">закрыт</span>
            )}
          </div>
        )}
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
          messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} conversation={conversation} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 text-xs text-gray-400 text-center">
        Режим просмотра — отправка сообщений недоступна
      </div>
    </div>
  )
}

function MessageBubble({
  msg,
  conversation,
}: {
  msg: ChatMessage
  conversation: AdminConversation | null
}) {
  if (msg.is_system) {
    return (
      <div className="text-center">
        <span className="inline-block px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full text-xs">
          {msg.text}
        </span>
      </div>
    )
  }

  const isMentor = conversation && msg.sender_email === conversation.mentor_email
  const isStudent = conversation && msg.sender_email === conversation.student_email

  return (
    <div className={`flex ${isMentor ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] ${isMentor ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        <span className="text-xs text-gray-400">
          {isStudent ? `${conversation?.student_name || "Студент"} (студент)` :
           isMentor ? `${conversation?.mentor_name || "Ментор"} (ментор)` :
           msg.sender_email || "Система"}
        </span>
        <div
          className={`px-3 py-2 rounded-2xl text-sm ${
            isMentor
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-gray-100 text-gray-900 rounded-tl-sm"
          }`}
        >
          {msg.text}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mt-1 space-y-1">
              {msg.attachments.map((a) => (
                <a
                  key={a.id}
                  href={a.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs underline opacity-80"
                >
                  {a.original_filename}
                </a>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-300">
          {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  )
}
