"use client"

import { useState, useEffect } from "react"
import {
  fetchMentorServices,
  fetchMentorProfile,
  createMentorService,
  updateMentorService,
  deleteMentorService,
  fetchPrimaryConsultation,
  updatePrimaryConsultation,
} from "@/lib/api"
import { MentorService } from "@/types"
import { SUPPORT_EMAIL } from "@/lib/contacts"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"

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

  // Form state — used for create, edit regular service, and edit
  // the primary consultation (sentinel "consultation").
  const [editingId, setEditingId] = useState<number | "new" | "consultation" | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [isBanned, setIsBanned] = useState(false)

  useEffect(() => {
    // /mentors/services/ excludes both consultation categories — they're
    // managed via the dedicated /mentors/me/consultation/ endpoint, which
    // also enforces "one consultation per mentor" + price/duration cap'ы.
    Promise.all([
      fetchMentorServices().catch(() => [] as MentorService[]),
      fetchPrimaryConsultation().catch(() => null),
    ])
      .then(([list, cons]) => {
        setServices(list)
        setConsultation(cons)
      })
      .catch(() => setError("Не удалось загрузить услуги"))
      .finally(() => setLoading(false))

    // Separate side-effect: only the is_banned flag is needed from the
    // profile here, no reason to gate the main render on it.
    fetchMentorProfile()
      .then((p) => setIsBanned(p.is_banned ?? false))
      .catch(() => undefined)
  }, [])

  const startEditConsultation = () => {
    if (!consultation) return
    setEditingId("consultation")
    setForm({
      title: consultation.title,
      description: consultation.description,
      price: consultation.price,
      duration: String(consultation.duration_minutes),
    })
    setFormError("")
  }

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
      } else if (editingId === "consultation") {
        const updated = await updatePrimaryConsultation(payload)
        setConsultation(updated)
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
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isFormOpen = editingId !== null

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-2 transition-colors group [-webkit-tap-highlight-color:transparent]" />

            <h1 className="text-2xl font-bold text-gray-900">Мои услуги</h1>
          </div>
          {!isFormOpen && !isBanned && (
            <button
              onClick={startCreate}
              className="bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              + Добавить
            </button>
          )}
        </div>

        {isBanned && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <Icon name="block" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Аккаунт заблокирован</p>
              <p className="text-xs text-red-500 mt-1">Редактирование недоступно. Обратитесь в поддержку: {SUPPORT_EMAIL}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-6">{error}</div>
        )}

        {/* Form (create or edit) */}
        {isFormOpen && (
          <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              {editingId === "new"
                ? "Новая услуга"
                : editingId === "consultation"
                  ? "Первичная консультация"
                  : "Редактировать услугу"}
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
                      max={editingId === "consultation" ? 200000 : 1000000}
                      step="100"
                      placeholder={editingId === "consultation" ? "5000" : "25000"}
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
                    min={editingId === "consultation" ? 5 : 15}
                    max={editingId === "consultation" ? 240 : 480}
                    step={editingId === "consultation" ? 5 : 15}
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
                  className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
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
          const paid = services.filter(
            (s) => s.payout_category !== "consultation" && s.payout_category !== "primary_consultation"
          )
          const mentorEarn = consultation
            ? Math.round(Number(consultation.price) * 0.5)
            : 0

          return (
            <div className="space-y-6">
              {/* Primary consultation — editable, but pinned (one per mentor) */}
              {consultation && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Первичная консультация</h2>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{consultation.title}</h3>
                          <span className="text-xs bg-white text-indigo-600 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                            <Icon name="forum" size={12} />
                            {Number(consultation.price).toLocaleString("ru-RU")} ₸
                          </span>
                          <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Icon name="schedule" size={12} />
                            {consultation.duration_minutes} мин
                          </span>
                        </div>
                        {consultation.description && (
                          <p className="text-sm text-gray-600 mt-2">{consultation.description}</p>
                        )}
                      </div>
                      {!isBanned && !isFormOpen && (
                        <button
                          onClick={startEditConsultation}
                          className="text-xs bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100 transition-colors inline-flex items-center gap-1 flex-shrink-0"
                        >
                          <Icon name="edit" size={14} />
                          Изменить
                        </button>
                      )}
                    </div>
                    <div className="mt-4 border-t border-indigo-100 pt-3 space-y-2">
                      <p className="text-xs text-indigo-900 font-semibold uppercase tracking-wider">
                        Как работает первичная
                      </p>
                      <p className="text-xs text-indigo-800 leading-relaxed">
                        Это короткая встреча-знакомство — основная её цель в том, чтобы ты <strong>продал себя</strong> и студент захотел заказать твои дополнительные услуги. Чем доступнее цена и короче встреча (15-30 минут уже ок), тем больше людей придёт.
                      </p>
                      <p className="text-xs text-indigo-800 leading-relaxed">
                        Платформа берёт <strong>50% комиссии</strong> только с первичной консультации.
                        Если цена <strong>0 ₸</strong> — комиссия тоже <strong>0%</strong>, потому что новым студентам мы даём <strong>скидку 50% на первые 30 дней</strong> — её платформа оплачивает из своей комиссии.
                      </p>
                      <p className="text-xs text-indigo-800 leading-relaxed">
                        Пример: ты ставишь {Number(consultation.price || 5000).toLocaleString("ru-RU")} ₸ → получаешь {mentorEarn.toLocaleString("ru-RU")} ₸.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Paid services */}
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Платные услуги</h2>
                {paid.length === 0 && !isFormOpen ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <div className="mb-4 flex justify-center">
                      <Icon name="description" size={48} className="text-gray-300" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Платных услуг пока нет</h3>
                    <p className="text-sm text-gray-400 mb-6">Добавь услугу чтобы абитуриенты могли её заказать после консультации</p>
                    {!isBanned && (
                      <button
                        onClick={startCreate}
                        className="inline-flex bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
                      >
                        + Добавить услугу
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paid.map((service) => (
                      <div key={service.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start justify-between gap-4">
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
                            <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                              <Icon name="schedule" size={12} />
                              {service.duration_minutes} мин
                            </span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-sm font-bold text-gray-900">{formatPrice(service.price)}</span>
                          </div>
                        </div>
                        {!isBanned && (
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
                        )}
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
