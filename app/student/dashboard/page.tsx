"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchStudentProfile, fetchOrders } from "@/lib/api"
import { StudentProfile, Order } from "@/types"

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const role = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    if (role === "mentor") { router.replace("/mentor/dashboard"); return }

    Promise.all([fetchStudentProfile(), fetchOrders()])
      .then(([p, o]) => { setProfile(p); setOrders(o) })
      .catch(() => router.replace("/auth/login"))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeOrders = orders.filter((o) => ["paid", "in_progress"].includes(o.order_status))
  const pendingOrders = orders.filter((o) => o.order_status === "pending_payment")
  const completedOrders = orders.filter((o) => o.order_status === "completed")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-sm text-gray-400 mb-1">Личный кабинет</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Привет, {profile?.full_name?.split(" ")[0] || "студент"} 👋
            </h1>
            {profile?.current_school_or_university && (
              <p className="text-gray-500 mt-1 text-sm">{profile.current_school_or_university}</p>
            )}
          </div>
          <Link
            href="/mentors"
            className="hidden sm:inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
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
              <h2 className="text-lg font-bold text-gray-900">Мои заказы</h2>
              <span className="text-sm text-gray-400">{orders.length} всего</span>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="font-semibold text-gray-900 mb-2">Пока нет заказов</h3>
                <p className="text-sm text-gray-400 mb-6">Найди ментора и запишись на консультацию</p>
                <Link
                  href="/mentors"
                  className="inline-flex bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Найти ментора
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-100 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{order.service_title}</h3>
                        <p className="text-sm text-gray-400 mt-0.5">{order.mentor_email}</p>
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
                        <span className="text-lg font-bold text-gray-900">${order.total_price}</span>
                      </div>
                    </div>

                    {/* Payment pending */}
                    {order.order_status === "pending_payment" && (
                      <div className="mt-4 pt-4 border-t border-gray-50">
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center gap-2 text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                        >
                          Перейти к заказу →
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Мой профиль</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 font-bold text-lg">
                    {profile?.full_name?.charAt(0) || "?"}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{profile?.full_name}</div>
                  {profile?.current_school_or_university && (
                    <div className="text-xs text-gray-400">{profile.current_school_or_university}</div>
                  )}
                  {profile?.age && (
                    <div className="text-xs text-gray-400">{profile.age} лет</div>
                  )}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-indigo-600 rounded-2xl p-6 text-white">
              <div className="text-2xl mb-3">🎓</div>
              <h3 className="font-semibold mb-2">Найди своего ментора</h3>
              <p className="text-indigo-200 text-xs mb-4 leading-relaxed">
                Более 50 менторов из топ университетов готовы помочь с поступлением
              </p>
              <Link
                href="/mentors"
                className="block text-center bg-white text-indigo-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-colors"
              >
                Смотреть менторов
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile find mentor button */}
        <div className="sm:hidden mt-8">
          <Link
            href="/mentors"
            className="block text-center bg-indigo-600 text-white px-5 py-4 rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            + Найти ментора
          </Link>
        </div>
      </div>
    </div>
  )
}
