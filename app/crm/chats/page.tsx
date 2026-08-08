"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { fetchAdminConversations } from "@/lib/api"
import { AdminConversation } from "@/types"
import Icon from "@/components/Icon"

export default function CRMChatsPage() {
  const [conversations, setConversations] = useState<AdminConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    fetchAdminConversations()
      .then(setConversations)
      .catch(() => setError("Не удалось загрузить чаты"))
      .finally(() => setLoading(false))
  }, [])

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.mentor_name.toLowerCase().includes(q) ||
      c.student_name.toLowerCase().includes(q) ||
      c.mentor_email.toLowerCase().includes(q) ||
      c.student_email.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Чаты</h1>
        <span className="text-sm text-gray-400">{conversations.length} всего</span>
      </div>

      <input
        type="text"
        placeholder="Поиск по ментору или студенту..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 mb-4"
      />

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Нет чатов</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/crm/chats/${c.id}`}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
            >
              <Icon name="chat" size={20} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{c.mentor_name || c.mentor_email}</span>
                  <span className="text-gray-400">↔</span>
                  <span className="font-medium text-gray-900">{c.student_name || c.student_email}</span>
                  {c.closed_at && (
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">закрыт</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.last_message_at
                    ? `Последнее: ${new Date(c.last_message_at).toLocaleString("ru-RU")}`
                    : `Создан: ${new Date(c.created_at).toLocaleString("ru-RU")}`}
                </p>
              </div>
              <Icon name="chevron_right" size={18} className="text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
