"use client"

import { useState, useEffect } from "react"
import { fetchMentorServices, createMentorService, deleteMentorService } from "@/lib/api"
import { MentorService } from "@/types"

export default function MentorServicesPage() {
  const [services, setServices] = useState<MentorService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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
      <main className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">
        Загрузка...
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Мои услуги</h1>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="flex flex-col gap-3 mb-10">
        {services.some((s) => s.is_consultation) && (
          <div className="border rounded-xl p-4 bg-gray-50">
            <p className="font-semibold text-gray-700">Консультация</p>
            <p className="text-sm text-gray-400 mt-0.5">30 мин · бесплатно</p>
          </div>
        )}
        {services.filter((s) => !s.is_consultation).length === 0 && (
          <p className="text-gray-400 text-sm mt-2">Платных услуг пока нет — добавь первую ниже.</p>
        )}
        {services.filter((s) => !s.is_consultation).map((service) => (
          <div key={service.id} className="border rounded-xl p-4 flex justify-between items-start">
            <div>
              <p className="font-semibold">{service.title}</p>
              {service.description && (
                <p className="text-sm text-gray-500 mt-0.5">{service.description}</p>
              )}
              <p className="text-sm text-gray-400 mt-1">
                {service.duration_minutes} мин · ${service.price}
              </p>
            </div>
            <button
              onClick={() => handleDelete(service.id)}
              className="text-sm text-red-500 hover:text-red-700 transition ml-4 shrink-0"
            >
              Удалить
            </button>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4">Добавить услугу</h2>
      <form onSubmit={handleAdd} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Название</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required
            placeholder="Консультация 30 минут"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            placeholder="Разбираем твою ситуацию и составляем план..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Цена ($)</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} required
              type="number" min="0" placeholder="50"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Длительность (мин)</label>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} required
              type="number" min="15"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
        </div>
        {addError && <p className="text-red-500 text-sm">{addError}</p>}
        <button type="submit" disabled={adding}
          className="bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
          {adding ? "Добавляем..." : "Добавить"}
        </button>
      </form>
    </main>
  )
}
