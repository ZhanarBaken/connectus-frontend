"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { fetchMentorServices, createMentorService, deleteMentorService } from "@/lib/api"
import { MentorService } from "@/types"

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

export default function MentorServicesPage() {
  const [services, setServices] = useState<MentorService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [duration, setDuration] = useState("60")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")

  useEffect(() => {
    fetchMentorServices()
      .then(setServices)
      .catch(() => setError("Не удалось загрузить услуги"))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setAddError("")
    try {
      const created = await createMentorService({
        title,
        description,
        price,
        duration_minutes: Number(duration),
      })
      setServices((prev) => [created, ...prev])
      setTitle("")
      setDescription("")
      setPrice("")
      setDuration("60")
      setShowForm(false)
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Ошибка при добавлении")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: number) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/mentor/dashboard" className="text-sm text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1 mb-2">
              ← Назад в кабинет
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Мои услуги</h1>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            + Добавить
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-6">{error}</div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-indigo-100 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Новая услуга</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Название</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required
                  placeholder="Консультация 60 минут" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Описание</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  placeholder="Разбираем твою ситуацию, составляем план поступления..."
                  className={`${inputClass} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Цена (USD)</label>
                  <input value={price} onChange={(e) => setPrice(e.target.value)} required
                    type="number" min="0" placeholder="50" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Длительность (мин)</label>
                  <input value={duration} onChange={(e) => setDuration(e.target.value)} required
                    type="number" min="15" step="15" className={inputClass} />
                </div>
              </div>
              {addError && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{addError}</div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={adding}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {adding ? "Добавляем..." : "Добавить услугу"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors">
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Services list */}
        {services.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="font-semibold text-gray-900 mb-2">Услуг пока нет</h3>
            <p className="text-sm text-gray-400 mb-6">Добавь первую услугу чтобы студенты могли её заказать</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              + Добавить услугу
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{service.title}</h3>
                    {service.is_consultation && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Консультация</span>
                    )}
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
                    <span className="text-sm font-bold text-gray-900">${service.price}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="text-sm text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 px-2 py-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
