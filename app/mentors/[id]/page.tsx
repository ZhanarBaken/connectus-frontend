"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchMentor, createOrder, fetchOrders, fetchStudentProfile, fetchPublicSettings } from "@/lib/api"
import { track } from "@/lib/analytics"
import { fetchMentorReviews, type Review } from "@/lib/reviews"
import { countryFlag, countryLabel } from "@/lib/countries"
import { Mentor, MentorService, Order, StudentProfile } from "@/types"
import BackButton from "@/components/BackButton"
import BookingCalendar from "@/components/BookingCalendar"
import Icon from "@/components/Icon"

// Fallback while /settings/public/ hasn't resolved yet — overwritten by
// the fetched value below so this page never hardcodes what's actually
// apps.services.models.SUPPORT_INTRO_CALL_DURATION_MINUTES on the backend.
const DEFAULT_INTRO_CALL_DURATION_MINUTES = 15

const EXPERTISE_LABELS: Record<string, string> = {
  admission: "Поступление",
  scholarships: "Стипендии",
  visa: "Виза",
  documents: "Документы",
}

const LANGUAGE_LABELS: Record<string, string> = {
  ru: "Русский", kz: "Қазақша", en: "English", de: "Deutsch",
  fr: "Français", tr: "Türkçe", zh: "中文", ar: "العربية",
  es: "Español", it: "Italiano", ja: "日本語", ko: "한국어",
  pl: "Polski", pt: "Português", uk: "Українська",
}

interface Props {
  params: Promise<{ id: string }>
}

export default function MentorPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [orderingServiceId, setOrderingServiceId] = useState<number | null>(null)
  const [orderError, setOrderError] = useState("")
  const [reviews, setReviews] = useState<Review[]>([])
  const [bookingService, setBookingService] = useState<MentorService | null>(null)
  const [bookingIsIntroCall, setBookingIsIntroCall] = useState(false)
  const [introCallDurationMinutes, setIntroCallDurationMinutes] = useState(DEFAULT_INTRO_CALL_DURATION_MINUTES)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace(`/auth/login?next=/mentors/${id}`)
      return
    }

    fetchPublicSettings()
      .then((s) => setIntroCallDurationMinutes(s.support_intro_call_duration_minutes))
      .catch(() => {})

    Promise.all([fetchMentor(Number(id)), fetchOrders()])
      .then(([m, o]) => {
        setMentor(m)
        setOrders(o)
        // Intentionally fires on every navigation between mentor
        // profiles within the same SPA session — that is the "view"
        // semantic. Don't gate this with a useRef.
        track("mentor_profile_viewed", { mentor_profile_id: m.id })
        fetchMentorReviews(m.id).then(setReviews)
        // Best-effort: only logged-in students will succeed; mentors get
        // a 403 and the bonus banner just won't render.
        fetchStudentProfile().then(setStudentProfile).catch(() => {})
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

  // Split services. Mentors can list any number of paid consultations now
  // (no more singleton) — the legacy free intro is kept on backend as an
  // inactive artifact and is not in the public services list. "support"
  // (long-running mentorship) is sold through chat, not this one-click flow.
  const consultationServices = mentor.services.filter(
    (s) => s.payout_category === "primary_consultation"
  )
  const paidServices = mentor.services.filter(
    (s) =>
      s.payout_category !== "consultation" &&
      s.payout_category !== "primary_consultation" &&
      s.payout_category !== "support"
  )
  const supportServices = mentor.services.filter((s) => s.payout_category === "support")

  // Only one active consultation (of any of the mentor's consultation
  // services) per mentor-student pair — a mentor-wide invariant, not a
  // per-service one, so this must be found across the whole set.
  const consultationServiceIds = new Set(consultationServices.map((s) => s.id))
  const consultationOrder = orders.find(
    (o) =>
      consultationServiceIds.has(o.mentor_service) &&
      ["pending_payment", "in_progress"].includes(o.order_status)
  )
  const consultationStatus: "none" | "pending_payment" | "in_progress" =
    !consultationOrder
      ? "none"
      : (consultationOrder.order_status as "pending_payment" | "in_progress")

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
                  {/* Every mentor in the public catalog has been
                      admin-approved with documents on file, so the
                      badge is shown unconditionally. */}
                  <span
                    className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-xs font-medium px-2.5 py-1 rounded-full"
                    title="Платформа подтвердила документы ментора — диплом, факт учёбы и/или получение гранта"
                  >
                    <Icon name="verified" size={14} className="text-indigo-600" filled />
                    Проверен
                  </span>
                  {mentor.is_universal && (
                    <span
                      className="inline-flex items-center gap-1 bg-violet-50 text-violet-600 text-xs font-medium px-2.5 py-1 rounded-full"
                      title="Ментор помогает сразу по нескольким направлениям"
                    >
                      <Icon name="auto_awesome" size={14} className="text-violet-600" filled />
                      Универсальный
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
                {(mentor.languages ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {mentor.languages.map((l) => (
                      <span
                        key={l.language}
                        className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-600 px-2.5 py-1 rounded-full font-medium"
                      >
                        {LANGUAGE_LABELS[l.language] ?? l.language}
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

            {/* Consultations — hero blocks. 50% off (welcome promo) shows
                when the student is in their 30-day signup window. Mentors
                can list more than one — each gets its own card, but only
                one active order across ALL of them is allowed at a time. */}
            {consultationServices.map((consultationService) => {
              const fullPrice = Number(consultationService.price ?? 0)
              // Скидка имеет смысл только если есть с чего скидывать.
              // Ментор имеет право поставить 0 ₸ — тогда показывать
              // зачёркнутые "0 ₸" и "−50%" нелепо.
              const bonusActive = (studentProfile?.welcome_bonus_available ?? false) && fullPrice > 0
              const discountedPrice = bonusActive
                ? Math.round(fullPrice * 0.5)
                : fullPrice
              const promoExpiresAt = studentProfile?.welcome_bonus_expires_at
              const daysLeft = promoExpiresAt
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(promoExpiresAt).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24),
                    ),
                  )
                : null
              // Does the mentor-wide active order belong to THIS card, or
              // to a different consultation service of the same mentor?
              const isThisOrder = consultationOrder?.mentor_service === consultationService.id
              const blockedByOtherConsultation = consultationStatus !== "none" && !isThisOrder
              return (
              <div key={consultationService.id} className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 sm:p-7 text-white">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative">
                  <div className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                    <Icon name="forum" size={14} className="text-white" />
                    {fullPrice === 0 ? (
                      <span>Бесплатно</span>
                    ) : bonusActive ? (
                      <>
                        <span className="line-through opacity-60">{fullPrice.toLocaleString("ru-RU")} ₸</span>
                        <span>{discountedPrice.toLocaleString("ru-RU")} ₸ с бонусом</span>
                      </>
                    ) : (
                      <span>{fullPrice.toLocaleString("ru-RU")} ₸</span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{consultationService.title || "Консультация"}</h2>
                  <p className="text-indigo-100 text-sm leading-relaxed mb-5 max-w-xl whitespace-pre-line">
                    {consultationService.description ||
                      "Индивидуальный разбор твоей ситуации, выбор программ и пошаговый план дальнейшей работы."}
                  </p>
                  <div className="flex items-center gap-4 mb-5 text-xs text-indigo-200">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="schedule" size={14} />
                      {consultationService.duration_minutes} мин
                    </span>
                    {(consultationService.grade_min !== null || consultationService.grade_max !== null) && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Icon name="school" size={14} />
                          {consultationService.grade_min ?? "?"}–{consultationService.grade_max ?? "?"} класс
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="chat" size={14} />
                      Чат после оплаты
                    </span>
                  </div>

                  {isThisOrder && consultationStatus === "in_progress" ? (
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
                  ) : isThisOrder && consultationStatus === "pending_payment" ? (
                    <Link
                      href={consultationOrder ? `/orders/${consultationOrder.id}` : "/orders"}
                      className="bg-white text-indigo-700 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition-colors inline-flex items-center gap-2"
                    >
                      Перейти к оплате
                      <Icon name="arrow_forward" size={16} />
                    </Link>
                  ) : blockedByOtherConsultation ? (
                    <Link
                      href={consultationOrder ? `/orders/${consultationOrder.id}` : "/orders"}
                      className="text-xs text-indigo-200 underline hover:text-white transition-colors"
                    >
                      У тебя уже есть активная консультация с этим ментором →
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        track("book_consultation_clicked", {
                          mentor_profile_id: mentor.id,
                          mentor_service_id: consultationService.id,
                        })
                        // Paid consultation goes through the same slot
                        // picker as any other paid service. The order
                        // POST without scheduled_at is rejected by the
                        // backend whenever the mentor has availability
                        // configured ("A time slot is required …").
                        setBookingService(consultationService)
                      }}
                      disabled={orderingServiceId === consultationService.id || !mentor.is_accepting_bookings}
                      className="bg-white text-indigo-700 px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {orderingServiceId === consultationService.id
                        ? "Заказываем..."
                        : fullPrice === 0
                        ? "Заказать бесплатно"
                        : bonusActive
                        ? (
                          <span className="inline-flex items-baseline gap-2">
                            <span>Заказать за {discountedPrice.toLocaleString("ru-RU")} ₸</span>
                            <span className="text-xs font-semibold opacity-60 line-through">
                              {fullPrice.toLocaleString("ru-RU")} ₸
                            </span>
                          </span>
                        )
                        : `Заказать консультацию за ${fullPrice.toLocaleString("ru-RU")} ₸`}
                    </button>
                  )}
                  {!mentor.is_accepting_bookings && consultationStatus === "none" && (
                    <p className="text-xs text-indigo-200 mt-2">Ментор сейчас не принимает запросы</p>
                  )}
                  {bonusActive && consultationStatus === "none" && (
                    <p className="text-xs text-indigo-200 mt-2">
                      🎁 Бонус новичку −50%: вместо {fullPrice.toLocaleString("ru-RU")} ₸ — {discountedPrice.toLocaleString("ru-RU")} ₸
                      {daysLeft !== null && daysLeft > 0 && (
                        <span className="opacity-80"> · сгорает через {daysLeft} {daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              )
            })}

            {/* Support ("сопровождение") — sold through chat, not this flow */}
            {supportServices.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Сопровождение</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Долгосрочная программа — цена и сроки обсуждаются с ментором в чате
                </p>
                <div className="space-y-3">
                  {supportServices.map((service) => {
                    const hasActiveEngagement = orders.some(
                      (o) => o.mentor_service === service.id && o.engagement_status === "active",
                    )
                    // A real intro-call order is never attached to a
                    // SupportEngagement (engagement_status === null) —
                    // unlike a free session booked under one (active or
                    // paused), which shares the same installment_number:
                    // null but must never be mistaken for the intro-call.
                    const introCallOrder = !hasActiveEngagement && orders.find(
                      (o) =>
                        o.mentor_service === service.id &&
                        o.installment_number === null &&
                        o.engagement_status === null &&
                        ["draft", "pending_payment", "in_progress"].includes(o.order_status),
                    )
                    return (
                    <div key={service.id} className="border rounded-2xl p-5 border-gray-200 hover:border-gray-300 transition-all">
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900">{service.title}</h3>
                          {service.description && (
                            <p className="text-sm mt-1 text-gray-500">{service.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-400">
                            {service.meetings_min !== null && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="event_repeat" size={12} />
                                {service.meetings_min}–{service.meetings_max} встреч
                              </span>
                            )}
                            {service.duration_months_min !== null && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="calendar_month" size={12} />
                                {service.duration_months_min}–{service.duration_months_max} мес
                              </span>
                            )}
                            {(service.grade_min !== null || service.grade_max !== null) && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="school" size={12} />
                                {service.grade_min ?? "?"}–{service.grade_max ?? "?"} класс
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-bold text-gray-900">
                            {service.is_price_negotiable || service.price === null
                              ? "Договорная"
                              : `${Number(service.price).toLocaleString("ru-RU")} ₸`}
                          </div>
                          {service.intro_call_enabled && (
                            <span className="inline-flex items-center gap-1 mt-1 text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-medium">
                              Intro-call {introCallDurationMinutes} мин бесплатно
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
                        {hasOpenChat ? (
                          <Link
                            href="/orders"
                            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            <Icon name="chat" size={16} />
                            Написать в чат
                          </Link>
                        ) : (
                          <p className="text-xs text-gray-400">
                            Доступно в чате после первой оплаченной консультации
                          </p>
                        )}
                        {hasActiveEngagement ? (
                          <button
                            onClick={() => {
                              setBookingIsIntroCall(false)
                              setBookingService(service)
                            }}
                            className="text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
                          >
                            Забронировать сессию
                          </button>
                        ) : service.intro_call_enabled && (
                          introCallOrder ? (
                            <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1">
                              <Icon name="event_available" size={14} />
                              Intro-call забронирован
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setBookingIsIntroCall(true)
                                setBookingService(service)
                              }}
                              className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors"
                            >
                              Забронировать intro-call
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    )
                  })}
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
                                onClick={() => setBookingService(service)}
                                disabled={orderingServiceId === service.id}
                                className="mt-1 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                              >
                                {orderingServiceId === service.id ? "Заказываем..." : "Записаться"}
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
                {(mentor.rating_count ?? 0) > 0 && (
                  <span className="text-sm text-gray-400">
                    {mentor.rating_avg?.toFixed(1)} ★ · {mentor.rating_count}{" "}
                    {mentor.rating_count === 1 ? "отзыв" : mentor.rating_count < 5 ? "отзыва" : "отзывов"}
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
                      {review.mentor_reply && (
                        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-3">
                          <p className="text-xs text-gray-500 font-medium mb-1">Ответ ментора:</p>
                          <p className="text-sm text-gray-600">{review.mentor_reply}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-500 text-xs font-bold">{review.student_full_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sm text-gray-400">{review.student_full_name}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-300">
                          {new Date(review.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
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
                    <p className="text-gray-600 leading-relaxed">Закажи и оплати консультацию</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">2</span>
                    <p className="text-gray-600 leading-relaxed">После подтверждения оплаты откроется чат с ментором</p>
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
                    <span>Документы проверены</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking calendar modal */}
      {bookingService && mentor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setBookingService(null); setBookingIsIntroCall(false) }}
          />
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-md my-4">
              <div className="mb-3 bg-white rounded-xl px-4 py-3 border border-gray-200">
                <p className="text-sm font-semibold text-gray-900">
                  {bookingIsIntroCall ? `Intro-call · ${bookingService.title}` : bookingService.title}
                </p>
                <p className="text-xs text-gray-400">
                  {bookingIsIntroCall
                    ? `${introCallDurationMinutes} мин · бесплатно`
                    : bookingService.payout_category === "support"
                      ? `${bookingService.duration_minutes} мин · включено в сопровождение`
                      : `${bookingService.duration_minutes} мин · ${Number(bookingService.price).toLocaleString("ru-RU")} ₸`}
                </p>
              </div>
              <BookingCalendar
                mentorId={mentor.id}
                durationMinutes={bookingIsIntroCall ? introCallDurationMinutes : bookingService.duration_minutes}
                onSelect={async (date, time) => {
                  const serviceId = bookingService.id
                  setBookingService(null)
                  setBookingIsIntroCall(false)
                  setOrderingServiceId(serviceId)
                  setOrderError("")
                  // Backend SCHEDULE_TIMEZONE is Asia/Almaty (+05:00, no
                  // DST). Hardcoded so a student in another browser TZ
                  // still books the mentor's local slot correctly.
                  const scheduledAt = `${date}T${time}:00+05:00`
                  try {
                    const created = await createOrder(serviceId, scheduledAt)
                    router.push(`/orders/${created.id}`)
                  } catch (err: unknown) {
                    setOrderError(err instanceof Error ? err.message : "Ошибка при заказе")
                    setOrderingServiceId(null)
                    // The engagement may have just paused (or an intro-call
                    // been used up) while this modal was open — refetch so
                    // hasActiveEngagement/introCallOrder recompute and the
                    // buttons stop offering an action that will fail again.
                    fetchOrders().then(setOrders).catch(() => {})
                  }
                }}
                onCancel={() => { setBookingService(null); setBookingIsIntroCall(false) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
