"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchStudentProfile, fetchOrders, fetchMentors, clearAuth } from "@/lib/api"
import { StudentProfile, Order } from "@/types"
import Icon from "@/components/Icon"
import { Avatar } from "@/components/Avatar"

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

export default function StudentDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [mentorNames, setMentorNames] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const role = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    if (role === "mentor") { router.replace("/mentor/dashboard"); return }

    Promise.all([fetchStudentProfile(), fetchOrders(), fetchMentors().catch(() => [])])
      .then(([p, o, mentors]) => {
        setProfile(p)
        setOrders(o)
        const map: Record<number, string> = {}
        for (const m of mentors) map[m.id] = m.full_name
        setMentorNames(map)
      })
      .catch(() => {
        // A stale/invalid token would otherwise send the login page
        // straight back here (it only checks token presence), and this
        // catch straight back to login — an infinite redirect loop the
        // browser eventually kills as a hard navigation failure. Clearing
        // the token here is what breaks the cycle.
        clearAuth()
        router.replace("/auth/login")
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeOrders = orders.filter((o) => ["paid", "in_progress"].includes(o.order_status))
  const pendingOrders = orders.filter((o) => o.order_status === "pending_payment")
  const completedOrders = orders.filter((o) => o.order_status === "completed")

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-sm text-gray-400 mb-1">Личный кабинет</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Привет, {profile?.full_name?.split(" ")[0] || "абитуриент"} <Icon name="waving_hand" size={28} className="text-yellow-500 align-baseline ml-1" />
            </h1>
            {profile?.current_school_or_university && (
              <p className="text-gray-500 mt-1 text-sm">{profile.current_school_or_university}</p>
            )}
          </div>
          <Link
            href="/mentors"
            className="hidden sm:inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            + Найти ментора
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Активных заказов", value: activeOrders.length, color: "text-indigo-600" },
            { label: "Ожидают оплаты", value: pendingOrders.length, color: "text-yellow-600" },
            { label: "Завершено", value: completedOrders.length, color: "text-green-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Orders */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Мои заказы</h2>
              <span className="text-sm text-gray-400">{orders.length} всего</span>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <div className="mb-4 flex justify-center">
                  <Icon name="description" size={48} className="text-gray-300" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Пока нет заказов</h3>
                <p className="text-sm text-gray-400 mb-6">Найди ментора и запишись на консультацию</p>
                <Link
                  href="/mentors"
                  className="inline-flex bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                  Найти ментора
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{order.service_title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{mentorNames[order.mentor] || "Ментор"}</p>
                        <p className="text-xs text-gray-300 mt-1">
                          {new Date(order.created_at).toLocaleDateString("ru-RU", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ORDER_STATUS_STYLES[order.order_status] || "bg-gray-100 text-gray-500"}`}>
                          {ORDER_STATUS_LABELS[order.order_status] || order.order_status}
                        </span>
                        <span className="text-lg font-bold text-gray-900">{Number(order.total_price).toLocaleString("ru-RU")} ₸</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* 30-day welcome promo — primary consultations are −50% */}
            {profile?.welcome_bonus_available && (
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-5">
                <h3 className="font-bold text-emerald-800 mb-1.5 text-sm inline-flex items-center gap-1.5">
                  🎁 −50% на первичные консультации
                </h3>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Подарок новичку — пробуй сколько хочешь менторов, скидка применится автоматически к каждой первичной консультации. Промокоды не нужны.
                </p>
                {profile.welcome_bonus_expires_at && (
                  <p className="text-[11px] font-semibold text-emerald-700 mt-2 inline-flex items-center gap-1">
                    ⏰ Сгорает {new Date(profile.welcome_bonus_expires_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                  </p>
                )}
              </div>
            )}

            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Мой профиль</h2>
                <Link
                  href="/students/profile"
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  Изменить
                </Link>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  src={profile?.profile_photo}
                  name={profile?.full_name}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500"
                  letterClassName="text-white font-bold text-lg"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">{profile?.full_name || "Без имени"}</div>
                  {profile?.current_school_or_university && (
                    <div className="text-xs text-gray-500 truncate">{profile.current_school_or_university}</div>
                  )}
                  {profile?.age ? (
                    <div className="text-xs text-gray-500">{profile.age} лет</div>
                  ) : null}
                </div>
              </div>
              <Link
                href="/students/profile"
                className="block text-center w-full border border-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                Редактировать профиль
              </Link>
            </div>

          </div>
        </div>

        {/* Mobile find mentor button */}
        <div className="sm:hidden mt-8">
          <Link
            href="/mentors"
            className="block text-center bg-gray-900 text-white px-5 py-4 rounded-2xl text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            + Найти ментора
          </Link>
        </div>
      </div>
    </div>
  )
}
