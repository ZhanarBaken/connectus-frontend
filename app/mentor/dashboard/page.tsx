"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchMentorProfile, fetchMentorServices, fetchOrders, submitMentorProfile } from "@/lib/api"
import { MentorProfile, MentorService, Order } from "@/types"

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  in_progress: "В работе",
  completed: "Завершён",
  disputed: "Спор",
  cancelled: "Отменён",
}

const ORDER_STATUS_STYLES: Record<string, string> = {
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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const role = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    if (role === "student") { router.replace("/student/dashboard"); return }

    Promise.all([fetchMentorProfile(), fetchMentorServices(), fetchOrders()])
      .then(([p, s, o]) => { setProfile(p); setServices(s); setOrders(o) })
      .catch(() => router.replace("/auth/login"))
      .finally(() => setLoading(false))
  }, [router])

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError("")
    try {
      await submitMentorProfile()
      const updated = await fetchMentorProfile()
      setProfile(updated)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Ошибка при отправке")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const activeOrders = orders.filter((o) => ["paid", "in_progress"].includes(o.order_status))
  const pendingOrders = orders.filter((o) => o.order_status === "pending_payment")
  const totalEarned = orders
    .filter((o) => o.order_status === "completed")
    .reduce((sum, o) => sum + parseFloat(o.mentor_payout_amount), 0)

  const profileCompletion = [
    profile.full_name,
    profile.school_or_university,
    profile.country,
    profile.major,
    profile.detailed_bio,
    profile.grant_or_scholarship,
  ].filter(Boolean).length

  const completionPercent = Math.round((profileCompletion / 6) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-sm text-gray-400 mb-1">Кабинет ментора</p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {profile.full_name || "Мой кабинет"}
              </h1>
              {profile.is_verified && (
                <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2.5 py-1 rounded-full">
                  ✓ Верифицирован
                </span>
              )}
            </div>
            {profile.school_or_university && (
              <p className="text-gray-500 mt-1 text-sm">
                {profile.school_or_university}
                {profile.country && ` · ${profile.country}`}
              </p>
            )}
          </div>
          <Link
            href="/mentors/profile"
            className="hidden sm:inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >
            Редактировать профиль
          </Link>
        </div>

        {/* Status banner */}
        {!profile.is_approved && (
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
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Заполни профиль и начни принимать заявки</p>
                    <p className="text-sm text-gray-500">Студенты увидят тебя только после одобрения профиля</p>
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
                <div className="flex gap-3 mt-4">
                  <Link
                    href="/mentors/profile"
                    className="text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-colors font-medium"
                  >
                    Заполнить профиль
                  </Link>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || completionPercent < 50}
                    className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Orders */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Входящие заказы</h2>
              <span className="text-sm text-gray-400">{orders.length} всего</span>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-5xl mb-4">📥</div>
                <h3 className="font-semibold text-gray-900 mb-2">Пока нет заказов</h3>
                <p className="text-sm text-gray-400">
                  Заказы появятся когда студенты запишутся на твои услуги
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{order.service_title}</h3>
                        <p className="text-sm text-gray-400 mt-0.5">
                          {order.student_info?.full_name?.trim().split(/\s+/)[0] || "Студент"}
                        </p>
                        <p className="text-xs text-gray-300 mt-1">
                          {new Date(order.created_at).toLocaleDateString("ru-RU", {
                            day: "numeric", month: "long",
                          })}
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Services */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
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
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Быстрые действия</h2>
              <div className="space-y-2">
                {[
                  { href: "/mentors/profile", icon: "👤", label: "Редактировать профиль" },
                  { href: "/mentors/services", icon: "📋", label: "Управлять услугами" },
                  { href: "/mentors/profile", icon: "👁", label: "Предпросмотр профиля" },
                ].map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm text-gray-600 group-hover:text-indigo-600 transition-colors">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Expertise */}
            {profile.expertise_areas?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
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
