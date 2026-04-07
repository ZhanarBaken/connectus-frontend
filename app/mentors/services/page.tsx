"use client"

import { useState, useEffect } from "react"
import {
  fetchMentorServices,
  fetchMentorProfile,
  fetchMentor,
  createMentorService,
  updateMentorService,
  deleteMentorService,
} from "@/lib/api"
import { MentorService } from "@/types"
import BackButton from "@/components/BackButton"

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

const formatPrice = (price: string) => {
  const n = Number(price)
  if (Number.isNaN(n)) return `${price} ₸`
  return `${n.toLocaleString("ru-RU")} ₸`
}

interface FormState {
  title: string
  description: string
  price: string
  duration: string
}

const EMPTY_FORM: FormState = { title: "", description: "", price: "", duration: "60" }

export default function MentorServicesPage() {
  const [services, setServices] = useState<MentorService[]>([])
  const [consultation, setConsultation] = useState<MentorService | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Form state — used for both create and edit
  const [editingId, setEditingId] = useState<number | "new" | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    // The /mentors/services/ endpoint excludes the auto-created free consultation,
    // so we fetch it separately via the public mentor endpoint (read-only).
    Promise.all([
      fetchMentorServices().catch(() => [] as MentorService[]),
      fetchMentorProfile()
        .then((p) => fetchMentor(p.id))
        .then((m) => m.services.find((s) => s.payout_category === "consultation") ?? null)
        .catch(() => null),
    ])
      .then(([list, cons]) => {
        setServices(list)
        setConsultation(cons)
      })
      .catch(() => setError("Не удалось загрузить услуги"))
      .finally(() => setLoading(false))
  }, [])

  const startCreate = () => {
    setEditingId("new")
    setForm(EMPTY_FORM)
    setFormError("")
  }

  const startEdit = (service: MentorService) => {
    setEditingId(service.id)
    setForm({
      title: service.title,
      description: service.description,
      price: service.price,
      duration: String(service.duration_minutes),
    })
    setFormError("")
  }

  const cancelForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError("")
    try {
      const payload = {
        title: form.title,
        description: form.description,
        price: form.price,
        currency: "KZT",
        duration_minutes: Number(form.duration),
      }
      if (editingId === "new") {
        const created = await createMentorService(payload)
        setServices((prev) => [created, ...prev])
      } else if (typeof editingId === "number") {
        const updated = await updateMentorService(editingId, payload)
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      }
      cancelForm()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Ошибка при сохранении")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить эту услугу?")) return
    await deleteMentorService(id)
    setServices((prev) => prev.filter((s) => s.id !== id))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isFormOpen = editingId !== null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-2 transition-colors group [-webkit-tap-highlight-color:transparent]" />

            <h1 className="text-2xl font-bold text-gray-900">Мои услуги</h1>
          </div>
          {!isFormOpen && (
            <button
              onClick={startCreate}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              + Добавить
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-6">{error}</div>
        )}

        {/* Form (create or edit) */}
        {isFormOpen && (
          <div className="bg-white rounded-2xl border border-indigo-100 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              {editingId === "new" ? "Новая услуга" : "Редактировать услугу"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Название</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Проверка эссе"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Разбираем твою ситуацию, составляем план поступления..."
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Цена (₸)</label>
                  <div className="relative">
                    <input
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      required
                      type="number"
                      min="0"
                      step="100"
                      placeholder="25000"
                      className={`${inputClass} pr-10`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₸</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Длительность (мин)</label>
                  <input
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    required
                    type="number"
                    min="15"
                    step="15"
                    className={inputClass}
                  />
                </div>
              </div>
              {formError && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{formError}</div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {submitting
                    ? "Сохраняем..."
                    : editingId === "new"
                      ? "Добавить услугу"
                      : "Сохранить"}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {(() => {
          const paid = services.filter((s) => s.payout_category !== "consultation")

          return (
            <div className="space-y-6">
              {/* Free consultation — pinned, read-only (managed by platform) */}
              {consultation && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Обязательная услуга</h2>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{consultation.title}</h3>
                      <span className="text-xs bg-white text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                        🎁 Бесплатно
                      </span>
                      <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded-full">🔒 Управляется платформой</span>
                    </div>
                    {consultation.description && (
                      <p className="text-sm text-gray-600 mt-1">{consultation.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500">⏱ {consultation.duration_minutes} мин</span>
                    </div>
                    <p className="text-xs text-indigo-700 mt-3 leading-relaxed">
                      Это обязательная услуга — каждый ментор получает её автоматически. Студенты используют её для первого знакомства, и только после неё могут заказать платные услуги.
                    </p>
                  </div>
                </div>
              )}

              {/* Paid services */}
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Платные услуги</h2>
                {paid.length === 0 && !isFormOpen ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <div className="text-5xl mb-4">📋</div>
                    <h3 className="font-semibold text-gray-900 mb-2">Платных услуг пока нет</h3>
                    <p className="text-sm text-gray-400 mb-6">Добавь услугу чтобы студенты могли её заказать после консультации</p>
                    <button
                      onClick={startCreate}
                      className="inline-flex bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      + Добавить услугу
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paid.map((service) => (
                      <div key={service.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{service.title}</h3>
                            {!service.is_active && (
                              <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Неактивна</span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400">⏱ {service.duration_minutes} мин</span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-sm font-bold text-gray-900">{formatPrice(service.price)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEdit(service)}
                            className="text-xs text-gray-500 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50 font-medium"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="text-xs text-gray-300 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
                            aria-label="Удалить"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
