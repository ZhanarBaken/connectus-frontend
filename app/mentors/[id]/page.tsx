"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchMentor, createOrder, fetchOrders } from "@/lib/api"
import { getMentorReviews, getMentorAverageRating, type Review } from "@/lib/reviews"
import { countryFlag, countryLabel } from "@/lib/countries"
import { Mentor, MentorService, Order } from "@/types"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"

const EXPERTISE_LABELS: Record<string, string> = {
  admission: "Поступление",
  scholarships: "Стипендии",
  visa: "Виза",
  documents: "Документы",
}

interface Props {
  params: Promise<{ id: string }>
}

export default function MentorPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [orderingServiceId, setOrderingServiceId] = useState<number | null>(null)
  const [orderError, setOrderError] = useState("")
  const [reviews, setReviews] = useState<Review[]>([])
  const [avgRating, setAvgRating] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace(`/auth/login?next=/mentors/${id}`)
      return
    }

    Promise.all([fetchMentor(Number(id)), fetchOrders()])
      .then(([m, o]) => {
        setMentor(m)
        setOrders(o)
        setReviews(getMentorReviews(m.id))
        setAvgRating(getMentorAverageRating(m.id))
      })
      .catch(() => router.replace("/mentors"))
      .finally(() => {
        setLoading(false)
        window.scrollTo(0, 0)
      })
  }, [id, router])

  const handleOrder = async (serviceId: number) => {
    setOrderingServiceId(serviceId)
    setOrderError("")
    try {
      const created = await createOrder(serviceId)
      router.push(`/orders/${created.id}`)
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : "Ошибка при заказе")
      setOrderingServiceId(null)
    }
  }

  if (loading || !mentor) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Загрузка профиля...</p>
        </div>
      </div>
    )
  }

  // Split services
  const consultationService: MentorService | undefined = mentor.services.find(
    (s) => s.payout_category === "consultation"
  )
  const paidServices = mentor.services.filter((s) => s.payout_category !== "consultation")

  // Find the student's consultation order with this mentor (if any)
  const consultationOrder = consultationService
    ? orders.find(
        (o) =>
          o.mentor_service === consultationService.id &&
          ["draft", "in_progress"].includes(o.order_status)
      )
    : undefined
  const consultationStatus: "none" | "draft" | "in_progress" =
    !consultationOrder
      ? "none"
      : (consultationOrder.order_status as "draft" | "in_progress")

  // Paid services are unlocked whenever there's an open Conversation with this mentor.
  // Backend creates a Conversation when the mentor confirms a free consultation,
  // and gates new orders on `closed_at IS NULL`. The frontend approximates this
  // by checking that at least one order with this mentor has a conversation_id
  // (the mentor can still close it server-side, in which case POST /orders/ will
  // surface a clear error and we display orderError).
  const hasOpenChat = orders.some(
    (o) => o.mentor === mentor.id && o.conversation_id !== null
  )

  // Track which paid services have already been ordered
  const orderedPaidIds = new Set(
    orders
      .filter((o) => o.order_status !== "cancelled")
      .map((o) => o.mentor_service)
  )

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb + back */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 min-w-0">
            <Link href="/" className="hover:text-indigo-600 transition-colors">Главная</Link>
            <span>/</span>
            <Link href="/mentors" className="hover:text-indigo-600 transition-colors">Менторы</Link>
            <span>/</span>
            <span className="text-gray-600 truncate">{mentor.full_name}</span>
          </div>
          <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors group [-webkit-tap-highlight-color:transparent] flex-shrink-0" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="lg:grid lg:grid-cols-3 lg:gap-10">

          {/* ── Left column ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Hero */}
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                {mentor.profile_photo ? (
                  <img
                    src={mentor.profile_photo}
                    alt={mentor.full_name}
                    className="w-24 h-24 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-4xl">
                    {mentor.full_name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{mentor.full_name}</h1>
                  {mentor.is_verified && (
                    <span
                      className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-xs font-medium px-2.5 py-1 rounded-full"
                      title="Платформа подтвердила документы ментора — диплом, факт учёбы и/или получение гранта"
                    >
                      <Icon name="verified" size={14} className="text-indigo-600" filled />
                      Проверен
                    </span>
                  )}
                </div>
                <p className="text-gray-500 mt-1 text-lg">
                  {mentor.school_or_university}
                  {mentor.major && <span className="text-gray-400"> · {mentor.major}</span>}
                </p>
                {/* Country chips */}
                {(mentor.countries ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {mentor.countries.map((c) => (
                      <span
                        key={c.country}
                        className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium"
                      >
                        {countryFlag(c.country)} {countryLabel(c.country)}
                      </span>
                    ))}
                  </div>
                )}
                {mentor.grant_or_scholarship && (
                  <p className="text-sm text-gray-400 mt-2 inline-flex items-center gap-1.5">
                    <Icon name="military_tech" size={16} />
                    {mentor.grant_or_scholarship}
                  </p>
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
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "GPA", value: mentor.gpa || "—", icon: "school" },
                { label: "Экзамены", value: mentor.exam_results || "—", icon: "quiz" },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                  <Icon name={stat.icon} size={20} className="text-gray-300" />
                  <div>
                    <div className="text-xs text-gray-400">{stat.label}</div>
                    <div className="font-semibold text-gray-900 text-sm">{stat.value}</div>
                  </div>
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

            {/* Free consultation — hero block */}
            {consultationService && (
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 sm:p-7 text-white">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative">
                  <div className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                    <Icon name="redeem" size={14} className="text-white" />
                    Бесплатно
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Бесплатная консультация</h2>
                  <p className="text-indigo-100 text-sm leading-relaxed mb-5 max-w-xl whitespace-pre-line">
                    {mentor.consultation ||
                      consultationService.description ||
                      "Знакомство с ментором — обсудим цели поступления и план дальнейшей работы."}
                  </p>
                  <div className="flex items-center gap-4 mb-5 text-xs text-indigo-200">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="schedule" size={14} />
                      {consultationService.duration_minutes} мин
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="chat" size={14} />
                      Чат после принятия
                    </span>
                  </div>

                  {consultationStatus === "in_progress" ? (
                    <div className="flex items-center gap-3">
                      <Link
                        href={consultationOrder ? `/orders/${consultationOrder.id}` : "/orders"}
                        className="bg-white text-indigo-700 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition-colors inline-flex items-center gap-2"
                      >
                        Открыть чат
                        <Icon name="arrow_forward" size={16} />
                      </Link>
                      <span className="text-xs text-indigo-200">Консультация активна</span>
                    </div>
                  ) : consultationStatus === "draft" ? (
                    <div className="bg-white/15 rounded-xl px-4 py-3 text-sm">
                      ⏳ Запрос отправлен. Ожидаем подтверждения от ментора.
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOrder(consultationService.id)}
                      disabled={orderingServiceId === consultationService.id || !mentor.is_accepting_bookings}
                      className="bg-white text-indigo-700 px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {orderingServiceId === consultationService.id
                        ? "Отправляем..."
                        : "Получить бесплатную консультацию"}
                    </button>
                  )}
                  {!mentor.is_accepting_bookings && consultationStatus === "none" && (
                    <p className="text-xs text-indigo-200 mt-2">Ментор сейчас не принимает запросы</p>
                  )}
                </div>
              </div>
            )}

            {/* Paid services */}
            {paidServices.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Платные услуги</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Закажи нужную услугу — оплата откроется после подтверждения админом
                </p>
                <div className="space-y-3">
                  {paidServices.map((service) => {
                    const isOrdered = orderedPaidIds.has(service.id)
                    return (
                      <div
                        key={service.id}
                        className="border rounded-2xl p-5 transition-all border-gray-200 hover:border-gray-300"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">
                              {service.title}
                            </h3>
                            {service.description && (
                              <p className="text-sm mt-1 text-gray-500">
                                {service.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-2 inline-flex items-center gap-1">
                              <Icon name="schedule" size={12} />
                              {service.duration_minutes} мин
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-2xl font-bold text-gray-900">
                              {Number(service.price).toLocaleString("ru-RU")} ₸
                            </div>
                            {isOrdered ? (
                              <span className="inline-flex items-center gap-1 mt-1 text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-medium">
                                <Icon name="check" size={12} />
                                Заказано
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOrder(service.id)}
                                disabled={orderingServiceId === service.id}
                                className="mt-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                              >
                                {orderingServiceId === service.id ? "Заказываем..." : "Заказать"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-xl font-bold text-gray-900">Отзывы</h2>
                {reviews.length > 0 && (
                  <span className="text-sm text-gray-400">
                    {avgRating?.toFixed(1)} ★ · {reviews.length}{" "}
                    {reviews.length === 1 ? "отзыв" : reviews.length < 5 ? "отзыва" : "отзывов"}
                  </span>
                )}
              </div>
              {reviews.length === 0 ? (
                <div className="border border-gray-200 rounded-2xl p-8 text-center">
                  <div className="mb-2 flex justify-center">
                    <Icon name="star" size={32} className="text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">У этого ментора пока нет отзывов</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border border-gray-200 rounded-2xl p-5">
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={`text-sm ${s <= review.rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>
                        ))}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">&ldquo;{review.text}&rdquo;</p>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-500 text-xs font-bold">{review.authorName.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sm text-gray-400">{review.authorName}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-300">
                          {new Date(review.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right column — trust card ─────────────────────── */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <div className="border border-gray-200 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">Как это работает</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">1</span>
                    <p className="text-gray-600 leading-relaxed">Запроси бесплатную консультацию</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">2</span>
                    <p className="text-gray-600 leading-relaxed">Ментор примет запрос — откроется чат</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">3</span>
                    <p className="text-gray-600 leading-relaxed">Обсудите план и закажи нужную платную услугу</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 space-y-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Icon name="check" size={14} className="text-indigo-600" />
                    <span>Прозрачные цены в тенге</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="check" size={14} className="text-indigo-600" />
                    <span>Общение только в чате</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="check" size={14} className="text-indigo-600" />
                    <span>{mentor.is_verified ? "Документы проверены" : "Безопасная оплата"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
