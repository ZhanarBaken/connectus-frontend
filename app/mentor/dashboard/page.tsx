"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchMentorProfile, fetchMentorServices, fetchOrders, submitMentorProfile, confirmConsultation, fetchMe } from "@/lib/api"
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/contacts"
import { User } from "@/types"
import { fetchMentorReviews, type Review } from "@/lib/reviews"
import { countriesLabelInline } from "@/lib/countries"
import { MentorProfile, MentorService, Order } from "@/types"
import Icon from "@/components/Icon"

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Запрос",
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  in_progress: "В работе",
  completed: "Завершён",
  disputed: "Спор",
  cancelled: "Отменён",
}

const ORDER_STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  pending_payment: "bg-yellow-50 text-yellow-700",
  paid: "bg-blue-50 text-blue-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  completed: "bg-green-50 text-green-700",
  disputed: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-400",
}

const EXPERTISE_LABELS: Record<string, string> = {
  admission: "Поступление",
  scholarships: "Стипендии",
  visa: "Виза",
  documents: "Документы",
}

export default function MentorDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<MentorProfile | null>(null)
  const [services, setServices] = useState<MentorService[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [me, setMe] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [acceptingId, setAcceptingId] = useState<number | null>(null)
  const [acceptError, setAcceptError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const role = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    if (role === "student") { router.replace("/student/dashboard"); return }

    Promise.all([fetchMentorProfile(), fetchMentorServices(), fetchOrders()])
      .then(([p, s, o]) => {
        setProfile(p)
        setServices(s)
        setOrders(o)
        fetchMentorReviews(p.id).then(setReviews)
        const token = localStorage.getItem("access_token")
        if (token) fetchMe(token).then(setMe).catch(() => {})
      })
      .catch(() => router.replace("/auth/login"))
      .finally(() => setLoading(false))
  }, [router])

  const handleAcceptConsultation = async (orderId: number) => {
    setAcceptingId(orderId)
    setAcceptError("")
    try {
      const updated = await confirmConsultation(orderId)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
    } catch (e: unknown) {
      setAcceptError(e instanceof Error ? e.message : "Не удалось принять запрос")
    } finally {
      setAcceptingId(null)
    }
  }

  const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({})

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError("")
    setSubmitErrors({})
    try {
      await submitMentorProfile()
      const updated = await fetchMentorProfile()
      setProfile(updated)
    } catch (e: unknown) {
      if (e instanceof Error) {
        // Try to parse field-level errors from backend
        try {
          const parsed = JSON.parse(e.message)
          if (typeof parsed === "object") {
            const errors: Record<string, string> = {}
            for (const [key, val] of Object.entries(parsed)) {
              errors[key] = Array.isArray(val) ? val[0] : String(val)
            }
            setSubmitErrors(errors)
            setSubmitError("Заполните обязательные поля перед отправкой")
          } else {
            setSubmitError(e.message)
          }
        } catch {
          setSubmitError(e.message)
        }
      } else {
        setSubmitError("Ошибка при отправке")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  // Backend rule: only consultation orders are created in `draft` status
  // (paid services go straight to `pending_payment`). So every draft order
  // is a free consultation request waiting for accept/decline.
  const consultationRequests = orders.filter((o) => o.order_status === "draft")
  const otherOrders = orders.filter((o) => o.order_status !== "draft")
  const activeOrders = orders.filter((o) => ["paid", "in_progress"].includes(o.order_status))
  const pendingOrders = orders.filter((o) => o.order_status === "pending_payment")
  const totalEarned = orders
    .filter((o) => o.order_status === "completed")
    .reduce((sum, o) => sum + parseFloat(o.mentor_payout_amount), 0)

  const profileCompletion = [
    profile.profile_photo,
    profile.full_name,
    profile.school_or_university,
    profile.countries.length > 0,
    profile.major,
    profile.detailed_bio,
    profile.grant_or_scholarship,
  ].filter(Boolean).length

  const completionPercent = Math.round((profileCompletion / 7) * 100)

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-sm text-gray-400 mb-1">Кабинет ментора</p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {profile.full_name || "Мой кабинет"}
              </h1>
              {profile.is_approved && (
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 font-medium px-2.5 py-1 rounded-full">
                  <Icon name="verified" size={14} filled className="text-indigo-500" /> Верифицирован
                </span>
              )}
            </div>
            {profile.school_or_university && (
              <p className="text-gray-500 mt-1 text-sm">
                {profile.school_or_university}
                {profile.countries.length > 0 && ` · ${countriesLabelInline(profile.countries)}`}
              </p>
            )}
            {/* Auth badges */}
            {me && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {me.has_telegram && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-sky-50 text-sky-700 font-medium px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                    Telegram
                  </span>
                )}
                {me.has_google && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/></svg>
                    Google
                  </span>
                )}
                {me.email_verified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full">
                    <Icon name="mark_email_read" size={12} /> Email
                  </span>
                ) : me.email ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                    <Icon name="mail" size={12} /> Подтверди email
                  </span>
                ) : null}
              </div>
            )}
          </div>
          <Link
            href={profile.is_banned ? "#" : "/mentors/profile"}
            onClick={profile.is_banned ? (e: React.MouseEvent) => e.preventDefault() : undefined}
            className={`hidden sm:inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              profile.is_banned ? "opacity-50 cursor-not-allowed" : "hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            Редактировать профиль
          </Link>
        </div>

        {/* Identity banner — shown for legacy mentors who registered
            before the new identity-gate flow. Submission still requires
            verified email + linked Telegram on the backend, so we
            point them at the gate page to complete the missing piece. */}
        {me && !profile.is_banned && (!me.email || !me.email_verified || !me.has_telegram) && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
            <Icon name="warning" size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900">Заверши настройку идентичности</p>
              <p className="text-sm text-amber-800 mt-1">
                Менторам нужны и email, и Telegram. Без них профиль нельзя отправить на проверку.
              </p>
              <Link
                href="/onboarding/mentor/identity"
                className="inline-block mt-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Завершить настройку
              </Link>
            </div>
          </div>
        )}

        {/* Ban banner */}
        {profile.is_banned && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
            <Icon name="block" size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Аккаунт заблокирован</p>
              {profile.ban_reason && (
                <p className="text-sm text-red-700 mt-1">{profile.ban_reason}</p>
              )}
              <p className="text-xs text-red-500 mt-2">
                Вы можете просматривать свои заказы и чаты, но не можете редактировать профиль, услуги или документы.
                Если считаете что это ошибка — напишите на <a href={SUPPORT_EMAIL_HREF} className="underline">{SUPPORT_EMAIL}</a>
              </p>
            </div>
          </div>
        )}

        {/* Status banner */}
        {!profile.is_banned && !profile.is_approved && (
          <div className="mb-8">
            {profile.is_submitted ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="font-semibold text-amber-800">Профиль на проверке</p>
                  <p className="text-sm text-amber-700 mt-1">Мы рассмотрим и одобрим его в ближайшее время.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Заполни профиль и начни принимать заявки</p>
                    <p className="text-sm text-gray-500">Абитуриенты увидят тебя только после одобрения профиля</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-bold text-indigo-600">{completionPercent}%</div>
                    <div className="text-xs text-gray-400">заполнено</div>
                  </div>
                </div>
                <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                {submitError && <p className="text-red-500 text-sm mt-3">{submitError}</p>}

                {/* Checklist for submit errors */}
                {Object.keys(submitErrors).length > 0 && (
                  <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-red-800 mb-2">Что нужно исправить:</p>
                    <ul className="space-y-1">
                      {Object.entries(submitErrors).map(([key, msg]) => (
                        <li key={key} className="text-xs text-red-600 flex items-center gap-1.5">
                          <Icon name="close" size={12} className="text-red-400" />
                          {key === "email" ? "Email: " : key === "telegram" ? "Telegram: " : ""}
                          {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pre-submit checklist */}
                {me && (
                  <div className="mt-3 space-y-1">
                    <div className={`text-xs flex items-center gap-1.5 ${me.email && me.email_verified ? "text-emerald-600" : "text-red-500"}`}>
                      <Icon name={me.email && me.email_verified ? "check_circle" : "cancel"} size={14} filled />
                      Email {me.email && me.email_verified ? "подтверждён" : "не подтверждён"}
                    </div>
                    <div className={`text-xs flex items-center gap-1.5 ${me.has_telegram ? "text-emerald-600" : "text-red-500"}`}>
                      <Icon name={me.has_telegram ? "check_circle" : "cancel"} size={14} filled />
                      Telegram {me.has_telegram ? "привязан" : "не привязан"}
                    </div>
                    <div className={`text-xs flex items-center gap-1.5 ${profile.profile_photo ? "text-emerald-600" : "text-red-500"}`}>
                      <Icon name={profile.profile_photo ? "check_circle" : "cancel"} size={14} filled />
                      Фото профиля {profile.profile_photo ? "загружено" : "не загружено"}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <Link
                    href="/mentors/profile"
                    className="text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-colors font-medium"
                  >
                    Заполнить профиль
                  </Link>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || completionPercent < 50 || !profile.profile_photo}
                    className="text-sm bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Отправляем..." : "Отправить на проверку"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Активных заказов", value: activeOrders.length, color: "text-indigo-600" },
            { label: "Ожидают оплаты", value: pendingOrders.length, color: "text-yellow-600" },
            { label: "Заработано (₸)", value: totalEarned.toLocaleString("ru-RU"), color: "text-green-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Orders */}
          <div className="lg:col-span-2 space-y-8">

            {/* Consultation requests */}
            {consultationRequests.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">Запросы на консультацию</h2>
                    <span className="text-xs bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                      {consultationRequests.length}
                    </span>
                  </div>
                </div>
                {profile.consultation && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Icon name="redeem" size={18} className="text-indigo-600" />
                        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Что увидят абитуриенты
                        </h3>
                      </div>
                      <Link
                        href="/mentors/profile"
                        className="text-xs text-indigo-600 hover:underline font-medium flex-shrink-0"
                      >
                        Изменить
                      </Link>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 whitespace-pre-line">
                      {profile.consultation}
                    </p>
                  </div>
                )}
                {acceptError && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-3">
                    {acceptError}
                  </div>
                )}
                <div className="space-y-3">
                  {consultationRequests.map((order) => {
                    const busy = acceptingId === order.id
                    return (
                      <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold">
                              {order.student_info?.full_name?.trim().charAt(0).toUpperCase() || "С"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {order.student_info?.full_name?.trim().split(/\s+/)[0] || "Абитуриент"}
                              </h3>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                              хочет провести консультацию
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAcceptConsultation(order.id)}
                          disabled={busy}
                          className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                          {acceptingId === order.id ? "Принимаем..." : "✓ Принять"}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Other orders */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Заказы</h2>
                <span className="text-sm text-gray-400">{otherOrders.length} всего</span>
              </div>

              {otherOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <div className="mb-4 flex justify-center">
                    <Icon name="inbox" size={48} className="text-gray-300" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Пока нет заказов</h3>
                  <p className="text-sm text-gray-400">
                    Заказы появятся когда абитуриенты запишутся на твои услуги
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {otherOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{order.service_title}</h3>
                          <p className="text-sm text-gray-400 mt-0.5">
                            {order.student_info?.full_name?.trim().split(/\s+/)[0] || "Абитуриент"}
                          </p>
                          <p className="text-xs text-gray-300 mt-1">
                            {new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ORDER_STATUS_STYLES[order.order_status] || "bg-gray-100 text-gray-500"}`}>
                            {ORDER_STATUS_LABELS[order.order_status] || order.order_status}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            +{Number(order.mentor_payout_amount).toLocaleString("ru-RU")} ₸
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Reviews */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Отзывы</h2>
                {reviews.length > 0 && (
                  <span className="text-xs text-gray-500 font-medium">
                    <span className="text-yellow-400">★</span> {profile.rating_avg?.toFixed(1) ?? "—"} · {reviews.length}
                  </span>
                )}
              </div>
              {reviews.length === 0 ? (
                <div className="text-center py-4">
                  <div className="mb-2 flex justify-center">
                    <Icon name="star" size={28} className="text-yellow-400" filled />
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Отзывы появятся после того как абитуриенты завершат заказы
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-1 mb-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={`text-xs ${s <= review.rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-3">
                        &ldquo;{review.text}&rdquo;
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-400 truncate">
                          {review.student_full_name}
                        </span>
                        <span className="text-xs text-gray-300 flex-shrink-0">
                          {new Date(review.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {reviews.length > 3 && (
                    <p className="text-xs text-gray-400 text-center pt-1">
                      и ещё {reviews.length - 3}{reviews.length - 3 === 1 ? " отзыв" : reviews.length - 3 < 5 ? " отзыва" : " отзывов"}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Services */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Мои услуги</h2>
                <Link href="/mentors/services" className="text-xs text-indigo-600 hover:underline font-medium">
                  Управлять
                </Link>
              </div>
              {services.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400 mb-3">Услуги не добавлены</p>
                  <Link
                    href="/mentors/services"
                    className="text-xs text-indigo-600 font-medium hover:underline"
                  >
                    + Добавить услугу
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.slice(0, 4).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{s.title}</p>
                        <p className="text-xs text-gray-400">{s.duration_minutes} мин</p>
                      </div>
                      <span className="text-sm font-bold text-gray-900 flex-shrink-0">{Number(s.price).toLocaleString("ru-RU")} ₸</span>
                    </div>
                  ))}
                  {services.length > 4 && (
                    <Link href="/mentors/services" className="text-xs text-indigo-600 hover:underline">
                      Ещё {services.length - 4} услуг
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Быстрые действия</h2>
              <div className="space-y-2">
                {[
                  { href: "/mentors/profile", icon: "person", label: "Редактировать профиль" },
                  { href: "/mentors/schedule", icon: "calendar_month", label: "Настроить расписание" },
                  { href: "/mentors/services", icon: "description", label: "Управлять услугами" },
                  { href: "/mentors/documents", icon: "folder", label: "Документы верификации" },
                  { href: `/mentors/${profile.id}`, icon: "visibility", label: "Предпросмотр профиля" },
                ].map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <Icon name={item.icon} size={20} className="text-gray-500 group-hover:text-indigo-600 transition-colors" />
                    <span className="text-sm text-gray-600 group-hover:text-indigo-600 transition-colors">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Expertise */}
            {profile.expertise_areas?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Специализации</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.expertise_areas.map((e) => (
                    <span key={e.area} className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium">
                      {EXPERTISE_LABELS[e.area] || e.area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
