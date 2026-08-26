"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { fetchAdminMentors, approveMentor, rejectMentor, banMentor, unbanMentor } from "@/lib/api"
import { AdminMentorProfile } from "@/types"
import { Avatar } from "@/components/Avatar"
import Icon from "@/components/Icon"

type Filter = "submitted" | "all" | "banned"

export default function CRMMentorsPage() {
  const [filter, setFilter] = useState<Filter>("all")
  const [mentors, setMentors] = useState<AdminMentorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [banReason, setBanReason] = useState<Record<number, string>>({})
  const [showBanInput, setShowBanInput] = useState<number | null>(null)
  const [error, setError] = useState("")

  // One fetch, filtered client-side — the backend's "no filter" query
  // already returns every mentor (submitted + banned included), so a
  // separate request per tab just meant "На проверку" started on an
  // empty screen whenever nothing was pending instead of showing
  // everyone with the pending ones flagged.
  const load = () => {
    setLoading(true)
    fetchAdminMentors()
      .then(setMentors)
      .catch(() => setError("Не удалось загрузить менторов"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const runAction = async (id: number, action: () => Promise<void>) => {
    setActionLoading(id)
    setError("")
    try {
      await action()
      load()
      setShowBanInput(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setActionLoading(null)
    }
  }

  const pending = mentors.filter((m) => m.is_submitted && !m.is_approved)
  const banned = mentors.filter((m) => m.is_banned)
  const visible = filter === "submitted" ? pending : filter === "banned" ? banned : mentors

  const FILTER_LABELS: Record<Filter, string> = {
    submitted: "На проверку",
    all: "Все",
    banned: "Заблокированные",
  }
  const FILTER_COUNTS: Record<Filter, number> = {
    submitted: pending.length,
    all: mentors.length,
    banned: banned.length,
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Менторы</h1>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {FILTER_LABELS[f]} {loading ? "" : `(${FILTER_COUNTS[f]})`}
              {f === "submitted" && pending.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Icon name="check_circle" size={40} />
          <p className="mt-2 text-sm">Нет менторов в этой категории</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((m) => {
            const needsReview = m.is_submitted && !m.is_approved
            return (
              <div
                key={m.id}
                className={`bg-white border rounded-2xl p-5 ${
                  needsReview ? "border-amber-200 bg-amber-50/40" : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-4">
                  <Avatar name={m.full_name || "?"} src={m.profile_photo} className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/crm/mentors/${m.id}`} className="font-semibold text-gray-900 hover:text-indigo-600">
                        {m.full_name || "(нет имени)"}
                      </Link>
                      {m.is_approved && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">одобрен</span>
                      )}
                      {needsReview && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                          ⏳ на проверке
                        </span>
                      )}
                      {m.is_banned && (
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">заблокирован</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {m.school_or_university || "—"} · {m.user_email || "нет email"}
                      {m.telegram_username && ` · @${m.telegram_username}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {m.expertise_areas.map((e) => e.area).join(", ") || "—"} ·
                      {m.has_documents ? " есть документы" : " нет документов"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/crm/mentors/${m.id}`}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-gray-300 transition-colors"
                    >
                      Детали
                    </Link>

                    {needsReview && (
                      <>
                        <button
                          onClick={() => runAction(m.id, () => approveMentor(m.id))}
                          disabled={actionLoading === m.id}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          Одобрить
                        </button>
                        <button
                          onClick={() => runAction(m.id, () => rejectMentor(m.id))}
                          disabled={actionLoading === m.id}
                          className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          Отклонить
                        </button>
                      </>
                    )}

                    {m.is_banned ? (
                      <button
                        onClick={() => runAction(m.id, () => unbanMentor(m.id))}
                        disabled={actionLoading === m.id}
                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
                      >
                        Разблокировать
                      </button>
                    ) : (
                      showBanInput === m.id ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Причина..."
                            value={banReason[m.id] || ""}
                            onChange={(e) => setBanReason((prev) => ({ ...prev, [m.id]: e.target.value }))}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-32 focus:outline-none focus:border-gray-400"
                          />
                          <button
                            onClick={() => runAction(m.id, () => banMentor(m.id, banReason[m.id] || ""))}
                            disabled={actionLoading === m.id}
                            className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            Забанить
                          </button>
                          <button
                            onClick={() => setShowBanInput(null)}
                            className="px-2 py-1 border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-50"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowBanInput(m.id)}
                          className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs font-medium hover:border-red-200 hover:text-red-500 transition-colors"
                        >
                          Забанить
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
