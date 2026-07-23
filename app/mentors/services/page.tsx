"use client"

import { useState, useEffect } from "react"
import {
  fetchMentorServices,
  fetchMentorProfile,
  createMentorService,
  updateMentorService,
  deleteMentorService,
} from "@/lib/api"
import { MentorService } from "@/types"
import { SUPPORT_EMAIL } from "@/lib/contacts"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"
import MentorStatusBanner from "@/components/MentorStatusBanner"

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

const formatPrice = (service: MentorService) => {
  if (service.is_price_negotiable || service.price === null) return "Договорная"
  const n = Number(service.price)
  if (Number.isNaN(n)) return `${service.price} ₸`
  return `${n.toLocaleString("ru-RU")} ₸`
}

const CATEGORY_LABELS: Record<string, string> = {
  primary_consultation: "Консультация",
  support: "Сопровождение",
  delivery: "Услуга",
  milestone: "Услуга",
}

// "consultation" (the retired free-intro category) never appears here —
// the backend blocks creating/editing into it and no longer surfaces it.
type FormCategory = "primary_consultation" | "support" | "other"

interface FormState {
  title: string
  description: string
  price: string
  duration: string
  gradeMin: string
  gradeMax: string
  meetingsMin: string
  meetingsMax: string
  durationMonthsMin: string
  durationMonthsMax: string
  isPriceNegotiable: boolean
  introCallEnabled: boolean
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  price: "",
  duration: "60",
  gradeMin: "",
  gradeMax: "",
  meetingsMin: "",
  meetingsMax: "",
  durationMonthsMin: "",
  durationMonthsMax: "",
  isPriceNegotiable: false,
  introCallEnabled: true,
}

function formCategoryOf(service: MentorService): FormCategory {
  if (service.payout_category === "primary_consultation") return "primary_consultation"
  if (service.payout_category === "support") return "support"
  return "other"
}

export default function MentorServicesPage() {
  const [services, setServices] = useState<MentorService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // "new" needs a category picked first (newCategory); editing an existing
  // service reuses its own category (editingCategory), which the mentor
  // cannot change here — retyping a service is a bigger decision than a
  // quick edit, so it isn't offered in this form.
  const [editingId, setEditingId] = useState<number | "new" | null>(null)
  const [newCategory, setNewCategory] = useState<FormCategory | null>(null)
  const [editingCategory, setEditingCategory] = useState<FormCategory>("other")
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [isBanned, setIsBanned] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    fetchMentorServices()
      .then(setServices)
      .catch(() => setError("Не удалось загрузить услуги"))
      .finally(() => setLoading(false))

    fetchMentorProfile()
      .then((p) => setIsBanned(p.is_banned ?? false))
      .catch(() => undefined)
  }, [])

  const startCreate = (category: FormCategory) => {
    setEditingId("new")
    setNewCategory(category)
    setForm({
      ...EMPTY_FORM,
      introCallEnabled: category === "support",
    })
    setFormError("")
  }

  const startEdit = (service: MentorService) => {
    setEditingId(service.id)
    setEditingCategory(formCategoryOf(service))
    setForm({
      title: service.title,
      description: service.description,
      price: service.price ?? "",
      duration: String(service.duration_minutes),
      gradeMin: service.grade_min !== null ? String(service.grade_min) : "",
      gradeMax: service.grade_max !== null ? String(service.grade_max) : "",
      meetingsMin: service.meetings_min !== null ? String(service.meetings_min) : "",
      meetingsMax: service.meetings_max !== null ? String(service.meetings_max) : "",
      durationMonthsMin: service.duration_months_min !== null ? String(service.duration_months_min) : "",
      durationMonthsMax: service.duration_months_max !== null ? String(service.duration_months_max) : "",
      isPriceNegotiable: service.is_price_negotiable,
      introCallEnabled: service.intro_call_enabled,
    })
    setFormError("")
  }

  const cancelForm = () => {
    setEditingId(null)
    setNewCategory(null)
    setForm(EMPTY_FORM)
    setFormError("")
  }

  const activeCategory: FormCategory = editingId === "new" ? (newCategory ?? "other") : editingCategory

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError("")
    try {
      const isConsultation = activeCategory === "primary_consultation"
      const isSupport = activeCategory === "support"

      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        currency: "KZT",
        grade_min: form.gradeMin === "" ? null : Number(form.gradeMin),
        grade_max: form.gradeMax === "" ? null : Number(form.gradeMax),
      }

      if (isConsultation) {
        payload.payout_category = "primary_consultation"
        payload.price = form.price
        payload.duration_minutes = Number(form.duration)
      } else if (isSupport) {
        payload.payout_category = "support"
        payload.meetings_min = Number(form.meetingsMin)
        payload.meetings_max = Number(form.meetingsMax)
        payload.duration_months_min = Number(form.durationMonthsMin)
        payload.duration_months_max = Number(form.durationMonthsMax)
        payload.is_price_negotiable = form.isPriceNegotiable
        payload.price = form.isPriceNegotiable ? "0.00" : form.price
        payload.intro_call_enabled = form.introCallEnabled
      } else {
        payload.price = form.price
        payload.duration_minutes = Number(form.duration)
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
    setDeleteError("")
    try {
      await deleteMentorService(id)
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: false } : s)))
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Не удалось удалить услугу")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isFormOpen = editingId !== null
  const isPickingCategory = editingId === "new" && newCategory === null

  const consultations = services.filter((s) => s.payout_category === "primary_consultation")
  const supports = services.filter((s) => s.payout_category === "support")
  const other = services.filter(
    (s) => s.payout_category !== "primary_consultation" && s.payout_category !== "support" && s.payout_category !== "consultation"
  )

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <MentorStatusBanner />
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-2 transition-colors group [-webkit-tap-highlight-color:transparent]" />
            <h1 className="text-2xl font-bold text-gray-900">Мои услуги</h1>
          </div>
          {!isFormOpen && !isBanned && (
            <button
              onClick={() => {
                setEditingId("new")
                setNewCategory(null)
              }}
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
        {deleteError && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-6">{deleteError}</div>
        )}

        {/* Step 1 of "new": pick a type */}
        {isPickingCategory && (
          <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Какую услугу добавить?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => startCreate("primary_consultation")}
                className="text-left border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="forum" size={18} className="text-indigo-600" />
                  <span className="font-semibold text-gray-900">Консультация</span>
                </div>
                <p className="text-xs text-gray-500">Фиксированная цена, запись через календарь после оплаты.</p>
              </button>
              <button
                onClick={() => startCreate("support")}
                className="text-left border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="groups" size={18} className="text-indigo-600" />
                  <span className="font-semibold text-gray-900">Сопровождение</span>
                </div>
                <p className="text-xs text-gray-500">Долгосрочная программа, запись только через чат с ментором.</p>
              </button>
            </div>
            <button
              type="button"
              onClick={cancelForm}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Отмена
            </button>
          </div>
        )}

        {/* Form (create or edit) */}
        {isFormOpen && !isPickingCategory && (
          <div className="bg-white rounded-2xl border border-gray-300 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              {editingId === "new"
                ? `Новая услуга — ${CATEGORY_LABELS[activeCategory === "other" ? "delivery" : activeCategory]}`
                : "Редактировать услугу"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Название</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder={activeCategory === "support" ? "Поступление в 3 вуза" : "Первичная консультация"}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Описание {activeCategory === "primary_consultation" && (
                    <span className="text-gray-400 font-normal">(минимум 80 символов)</span>
                  )}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder={
                    activeCategory === "support"
                      ? "Что входит в сопровождение — какие этапы, что делаем вместе..."
                      : "Разбираем твою ситуацию, составляем план поступления..."
                  }
                  className={`${inputClass} resize-none`}
                />
              </div>

              {activeCategory === "primary_consultation" && (
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
                        max={200000}
                        step="100"
                        placeholder="5000"
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
                      min={5}
                      max={240}
                      step={5}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {activeCategory === "other" && (
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
                        max={1000000}
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
                      min={15}
                      max={480}
                      step={15}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {activeCategory === "support" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Встреч от</label>
                      <input
                        value={form.meetingsMin}
                        onChange={(e) => setForm({ ...form, meetingsMin: e.target.value })}
                        required
                        type="number"
                        min={1}
                        max={100}
                        placeholder="4"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Встреч до</label>
                      <input
                        value={form.meetingsMax}
                        onChange={(e) => setForm({ ...form, meetingsMax: e.target.value })}
                        required
                        type="number"
                        min={1}
                        max={100}
                        placeholder="8"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Длительность от (мес)</label>
                      <input
                        value={form.durationMonthsMin}
                        onChange={(e) => setForm({ ...form, durationMonthsMin: e.target.value })}
                        required
                        type="number"
                        min={1}
                        max={36}
                        placeholder="6"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Длительность до (мес)</label>
                      <input
                        value={form.durationMonthsMax}
                        onChange={(e) => setForm({ ...form, durationMonthsMax: e.target.value })}
                        required
                        type="number"
                        min={1}
                        max={36}
                        placeholder="12"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.isPriceNegotiable}
                      onChange={(e) => setForm({ ...form, isPriceNegotiable: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Цена договорная (обсуждается с каждым студентом отдельно)
                  </label>
                  {!form.isPriceNegotiable && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Цена (₸)</label>
                      <div className="relative">
                        <input
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
                          required={!form.isPriceNegotiable}
                          type="number"
                          min="0"
                          max={1000000}
                          step="1000"
                          placeholder="500000"
                          className={`${inputClass} pr-10`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₸</span>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.introCallEnabled}
                      onChange={(e) => setForm({ ...form, introCallEnabled: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Бесплатный intro-call (15 минут) для знакомства с ментором
                  </label>
                </>
              )}

              {(activeCategory === "primary_consultation" || activeCategory === "support") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Класс от (необязательно)</label>
                    <input
                      value={form.gradeMin}
                      onChange={(e) => setForm({ ...form, gradeMin: e.target.value })}
                      type="number"
                      min={1}
                      max={11}
                      placeholder="9"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Класс до (необязательно)</label>
                    <input
                      value={form.gradeMax}
                      onChange={(e) => setForm({ ...form, gradeMax: e.target.value })}
                      type="number"
                      min={1}
                      max={11}
                      placeholder="11"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

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

        <div className="space-y-6">
          {/* Consultations */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Консультации</h2>
            {consultations.length === 0 ? (
              <EmptyState
                icon="forum"
                title="Пока нет ни одной консультации"
                hint="Студенты не смогут записаться к тебе, пока не появится хотя бы одна услуга."
                isBanned={isBanned}
                onAdd={() => startCreate("primary_consultation")}
              />
            ) : (
              <div className="space-y-3">
                {consultations.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isBanned={isBanned}
                    onEdit={() => startEdit(service)}
                    onDelete={() => handleDelete(service.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Support */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Сопровождение</h2>
            {supports.length === 0 ? (
              <EmptyState
                icon="groups"
                title="Пока нет программ сопровождения"
                hint="Долгосрочные программы студенты заказывают через чат, а не с одного клика."
                isBanned={isBanned}
                onAdd={() => startCreate("support")}
              />
            ) : (
              <div className="space-y-3">
                {supports.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isBanned={isBanned}
                    onEdit={() => startEdit(service)}
                    onDelete={() => handleDelete(service.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Legacy delivery/milestone services, if any */}
          {other.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Другое</h2>
              <div className="space-y-3">
                {other.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isBanned={isBanned}
                    onEdit={() => startEdit(service)}
                    onDelete={() => handleDelete(service.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  hint,
  isBanned,
  onAdd,
}: {
  icon: string
  title: string
  hint: string
  isBanned: boolean
  onAdd: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
      <div className="mb-3 flex justify-center">
        <Icon name={icon} size={40} className="text-gray-300" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 text-sm">{title}</h3>
      <p className="text-xs text-gray-400 mb-5">{hint}</p>
      {!isBanned && (
        <button
          onClick={onAdd}
          className="inline-flex bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          + Добавить
        </button>
      )}
    </div>
  )
}

function ServiceCard({
  service,
  isBanned,
  onEdit,
  onDelete,
}: {
  service: MentorService
  isBanned: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const isSupport = service.payout_category === "support"
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4">
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
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {isSupport ? (
              <>
                {service.meetings_min !== null && (
                  <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                    <Icon name="event_repeat" size={12} />
                    {service.meetings_min}–{service.meetings_max} встреч
                  </span>
                )}
                {service.duration_months_min !== null && (
                  <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                    <Icon name="calendar_month" size={12} />
                    {service.duration_months_min}–{service.duration_months_max} мес
                  </span>
                )}
                {service.intro_call_enabled && (
                  <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                    Intro-call 15 мин бесплатно
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                <Icon name="schedule" size={12} />
                {service.duration_minutes} мин
              </span>
            )}
            {(service.grade_min !== null || service.grade_max !== null) && (
              <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                <Icon name="school" size={12} />
                {service.grade_min ?? "?"}–{service.grade_max ?? "?"} класс
              </span>
            )}
            <span className="text-xs text-gray-300">·</span>
            <span className="text-sm font-bold text-gray-900">{formatPrice(service)}</span>
          </div>
        </div>
        {!isBanned && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className="text-xs text-gray-500 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50 font-medium"
            >
              Изменить
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-gray-300 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
              aria-label="Удалить"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
