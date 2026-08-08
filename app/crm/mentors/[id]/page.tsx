"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { fetchAdminMentors, approveMentor, rejectMentor, banMentor, unbanMentor } from "@/lib/api"
import { AdminMentorProfile } from "@/types"
import { Avatar } from "@/components/Avatar"
import Icon from "@/components/Icon"

export default function CRMMentorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [mentor, setMentor] = useState<AdminMentorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [banReason, setBanReason] = useState("")
  const [showBanForm, setShowBanForm] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchAdminMentors("all")
      .then((list) => {
        const found = list.find((m) => m.id === id)
        if (found) {
          setMentor(found)
        }
      })
      .catch(() => setError("Не удалось загрузить профиль"))
      .finally(() => setLoading(false))
  }, [id])

  const doAction = async (fn: () => Promise<void>, successMsg: string) => {
    setActionLoading(true)
    setError("")
    try {
      await fn()
      setSuccess(successMsg)
      setTimeout(() => router.push("/crm/mentors"), 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    )
  }

  if (!mentor) {
    // `error` is only set here by the initial fetch failing outright
    // (network/500) — a genuinely missing id just leaves it empty, so
    // this distinguishes "couldn't load" from "doesn't exist" instead
    // of always claiming the mentor doesn't exist.
    return <div className="text-gray-500 py-8">{error || "Ментор не найден"}</div>
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <Icon name="arrow_back" size={16} />
        Назад
      </button>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-600 mb-4">
          {success}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
        <div className="flex items-start gap-5">
          <Avatar name={mentor.full_name || "?"} src={mentor.profile_photo} className="w-[72px] h-[72px] rounded-full bg-indigo-100 text-indigo-700" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{mentor.full_name || "(нет имени)"}</h1>
            <div className="flex gap-2 mt-2 flex-wrap">
              {mentor.is_approved && <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">Одобрен</span>}
              {mentor.is_submitted && !mentor.is_approved && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">На проверке</span>}
              {mentor.is_banned && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">Заблокирован</span>}
              {!mentor.is_public && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Скрыт</span>}
            </div>
            <div className="mt-3 text-sm text-gray-600 space-y-1">
              <div><span className="text-gray-400">Email:</span> {mentor.user_email || "—"}</div>
              {mentor.telegram_username && (
                <div>
                  <span className="text-gray-400">Telegram:</span>{" "}
                  <a href={`https://t.me/${mentor.telegram_username}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    @{mentor.telegram_username}
                  </a>
                </div>
              )}
              <div><span className="text-gray-400">Телефон:</span> {mentor.phone || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Вуз / университет" value={mentor.school_or_university} />
        <Field label="Специальность" value={mentor.major} />
        <Field label="Грант / стипендия" value={mentor.grant_or_scholarship} />
        <Field label="GPA" value={mentor.gpa} />
        <Field label="Экзамены" value={mentor.exam_results} />
        <Field label="Экспертиза" value={mentor.expertise_areas.map((e) => e.area).join(", ")} />
        <Field label="Страны" value={mentor.countries.map((c) => c.country).join(", ")} />
        <Field label="Языки" value={mentor.languages.map((l) => l.language).join(", ")} />
      </div>

      {mentor.detailed_bio && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">О себе</div>
          <p className="text-sm text-gray-700 whitespace-pre-line">{mentor.detailed_bio}</p>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Действия</div>
        <div className="flex flex-wrap gap-2">
          {mentor.is_submitted && !mentor.is_approved && (
            <>
              <button
                onClick={() => doAction(() => approveMentor(mentor.id), "Ментор одобрен")}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Одобрить
              </button>
              <button
                onClick={() => doAction(() => rejectMentor(mentor.id), "Отклонено")}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                Отклонить
              </button>
            </>
          )}

          {mentor.is_banned ? (
            <button
              onClick={() => doAction(() => unbanMentor(mentor.id), "Ментор разблокирован")}
              disabled={actionLoading}
              className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              Разблокировать
            </button>
          ) : (
            showBanForm ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Причина блокировки..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-56 focus:outline-none focus:border-gray-400"
                />
                <button
                  onClick={() => doAction(() => banMentor(mentor.id, banReason), "Ментор заблокирован")}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Заблокировать
                </button>
                <button
                  onClick={() => setShowBanForm(false)}
                  className="px-3 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowBanForm(true)}
                className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:border-red-200 hover:text-red-500 transition-colors"
              >
                Заблокировать
              </button>
            )
          )}
        </div>

        {mentor.ban_reason && (
          <p className="mt-3 text-sm text-red-600">
            <span className="font-medium">Причина блокировки:</span> {mentor.ban_reason}
          </p>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm text-gray-900 font-medium">{value || "—"}</div>
    </div>
  )
}
