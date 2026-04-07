"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchMentor, createOrder, fetchOrders } from "@/lib/api"
import { Mentor } from "@/types"

const EXPERTISE_LABELS: Record<string, string> = {
  admission: "Поступление",
  scholarships: "Стипендии",
  visa: "Виза",
  documents: "Документы",
}

const COUNTRY_FLAGS: Record<string, string> = {
  USA: "🇺🇸",
  UK: "🇬🇧",
  Germany: "🇩🇪",
  Spain: "🇪🇸",
  Italy: "🇮🇹",
}

const MOCK_REVIEWS = [
  { name: "Айгерим Б.", text: "Очень помогло! Ментор объяснил весь процесс поступления пошагово.", stars: 5 },
  { name: "Данияр С.", text: "Профессиональный подход, отвечал быстро, дал много полезных советов.", stars: 5 },
  { name: "Мадина К.", text: "Рекомендую всем кто хочет поступить за рубеж.", stars: 5 },
]

interface Props {
  params: Promise<{ id: string }>
}

export default function MentorPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [bookedServiceId, setBookedServiceId] = useState<number | null>(null)
  const [bookError, setBookError] = useState("")
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [orderingServiceId, setOrderingServiceId] = useState<number | null>(null)
  const [orderError, setOrderError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace(`/auth/login?next=/mentors/${id}`)
      return
    }

    Promise.all([fetchMentor(Number(id)), fetchOrders()])
      .then(([m, orders]) => {
        setMentor(m)
        if (m.services.length > 0) setSelectedService(m.services[0].id)
        const bookedIds = new Set(
          orders
            .filter((o) => o.order_status !== "cancelled")
            .map((o) => o.mentor_service)
        )
        const alreadyBooked = m.services.find((s) => bookedIds.has(s.id))
        if (alreadyBooked) setBookedServiceId(alreadyBooked.id)
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false))
  }, [id, router])

  const handleBook = async () => {
    if (!selectedService) return
    setBooking(true)
    setBookError("")
    try {
      await createOrder(selectedService)
      setBookedServiceId(selectedService)
    } catch (e: unknown) {
      setBookError(e instanceof Error ? e.message : "Ошибка при записи")
    } finally {
      setBooking(false)
    }
  }

  if (loading || !mentor) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Загрузка профиля...</p>
        </div>
      </div>
    )
  }

  const selectedServiceData = mentor.services.find((s) => s.id === selectedService)

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-white px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Главная</Link>
          <span>/</span>
          <Link href="/mentors" className="hover:text-indigo-600 transition-colors">Менторы</Link>
          <span>/</span>
          <span className="text-gray-600">{mentor.full_name}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="lg:grid lg:grid-cols-3 lg:gap-10">

          {/* ── Left column ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Hero */}
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                {mentor.profile_photo ? (
                  <img
                    src={mentor.profile_photo}
                    alt={mentor.full_name}
                    className="w-24 h-24 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-indigo-600 font-bold text-4xl">
                    {mentor.full_name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{mentor.full_name}</h1>
                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-xs font-medium px-2.5 py-1 rounded-full">
                    ✓ Верифицирован
                  </span>
                </div>
                <p className="text-gray-500 mt-1 text-lg">
                  {COUNTRY_FLAGS[mentor.country] || "🌍"} {mentor.school_or_university}
                  {mentor.major && <span className="text-gray-400"> · {mentor.major}</span>}
                </p>
                {mentor.grant_or_scholarship && (
                  <p className="text-sm text-gray-400 mt-1">🏅 {mentor.grant_or_scholarship}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {mentor.expertise_areas.map((e) => (
                    <span
                      key={e.area}
                      className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-medium"
                    >
                      {EXPERTISE_LABELS[e.area] || e.area}
                    </span>
                  ))}
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${
                      mentor.is_accepting_bookings
                        ? "bg-green-50 text-green-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {mentor.is_accepting_bookings ? "Принимает записи" : "Занят"}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Страна", value: `${COUNTRY_FLAGS[mentor.country] || "🌍"} ${mentor.country}` },
                { label: "GPA", value: mentor.gpa || "—" },
                { label: "Экзамены", value: mentor.exam_results || "—" },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-50 rounded-2xl p-4 text-center">
                  <div className="text-sm text-gray-400 mb-1">{stat.label}</div>
                  <div className="font-semibold text-gray-900 text-sm">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Bio */}
            {mentor.detailed_bio && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">О менторе</h2>
                <p className="text-gray-600 leading-relaxed">{mentor.detailed_bio}</p>
              </div>
            )}

            {/* Services */}
            {mentor.services.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Услуги и цены</h2>
                <div className="space-y-3">
                  {mentor.services.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service.id)}
                      className={`border rounded-2xl p-5 cursor-pointer transition-all ${
                        selectedService === service.id
                          ? "border-indigo-400 bg-indigo-50"
                          : "border-gray-100 hover:border-indigo-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{service.title}</h3>
                            {service.is_consultation && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                Консультация
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                          <p className="text-xs text-gray-400 mt-2">⏱ {service.duration_minutes} мин</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-2xl font-bold text-gray-900">${service.price}</div>
                          <div className="text-xs text-gray-400 mb-2">{service.currency}</div>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              setOrderingServiceId(service.id)
                              setOrderError("")
                              try {
                                await createOrder(service.id)
                                router.push("/orders")
                              } catch (err: unknown) {
                                setOrderError(err instanceof Error ? err.message : "Ошибка при заказе")
                              } finally {
                                setOrderingServiceId(null)
                              }
                            }}
                            disabled={orderingServiceId === service.id}
                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                          >
                            {orderingServiceId === service.id ? "Заказываем..." : "Заказать"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {orderError && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                {orderError}
              </div>
            )}

            {/* Reviews */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Отзывы</h2>
              <div className="space-y-4">
                {MOCK_REVIEWS.map((review, i) => (
                  <div key={i} className="border border-gray-100 rounded-2xl p-5">
                    <div className="flex items-center gap-1 mb-2">
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} className="text-yellow-400 text-sm">★</span>
                      ))}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">"{review.text}"</p>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-500 text-xs font-bold">{review.name.charAt(0)}</span>
                      </div>
                      <span className="text-sm text-gray-400">{review.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column — sticky booking card ─────────────── */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <div className="border border-gray-100 rounded-2xl p-6 shadow-sm">
                {selectedServiceData ? (
                  <>
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        ${selectedServiceData.price}
                        <span className="text-base font-normal text-gray-400 ml-1">{selectedServiceData.currency}</span>
                      </div>
                      <div className="text-sm text-gray-500">{selectedServiceData.title}</div>
                      <div className="text-xs text-gray-400 mt-1">⏱ {selectedServiceData.duration_minutes} мин</div>
                    </div>

                    <div className="border-t border-gray-50 pt-4 mb-4">
                      <p className="text-xs text-gray-400 mb-2 font-medium">Выбери услугу:</p>
                      <div className="space-y-2">
                        {mentor.services.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedService(s.id)}
                            className={`w-full text-left text-xs px-3 py-2 rounded-xl border transition-all ${
                              selectedService === s.id
                                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                : "border-gray-100 hover:border-gray-200 text-gray-600"
                            }`}
                          >
                            <span className="font-medium">{s.title}</span>
                            <span className="float-right font-bold">${s.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {bookError && (
                      <p className="text-red-500 text-xs mb-3 bg-red-50 rounded-lg px-3 py-2">{bookError}</p>
                    )}

                    {bookedServiceId ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <div className="text-green-600 text-lg mb-1">✓</div>
                        <p className="font-semibold text-green-800 text-sm">Заявка отправлена!</p>
                        <p className="text-xs text-green-600 mt-1">Ментор свяжется с тобой</p>
                      </div>
                    ) : (
                      <button
                        onClick={handleBook}
                        disabled={booking || !mentor.is_accepting_bookings}
                        className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {booking ? "Отправляем..." : "Записаться"}
                      </button>
                    )}

                    {!mentor.is_accepting_bookings && (
                      <p className="text-xs text-gray-400 text-center mt-2">Ментор сейчас не принимает записи</p>
                    )}

                    <div className="mt-4 space-y-2 text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <span>✓</span><span>Бесплатный чат до оплаты</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>✓</span><span>Прозрачные цены</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>✓</span><span>Верифицированный ментор</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">Услуги не найдены</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile booking button */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40">
          {bookError && <p className="text-red-500 text-xs mb-2">{bookError}</p>}
          {bookedServiceId ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="font-semibold text-green-800 text-sm">✓ Заявка отправлена!</p>
            </div>
          ) : (
            <button
              onClick={handleBook}
              disabled={booking || !mentor.is_accepting_bookings}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {booking
                ? "Отправляем..."
                : selectedServiceData
                  ? `Записаться · $${selectedServiceData.price}`
                  : "Записаться"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
