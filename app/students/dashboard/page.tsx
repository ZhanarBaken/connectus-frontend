"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { fetchStudentProfile, fetchOrders } from "@/lib/api"
import { StudentProfile, Order } from "@/types"

export default function StudentDashboardPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchStudentProfile(), fetchOrders()])
      .then(([p, o]) => {
        setProfile(p)
        setOrders(o)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">
        Загрузка...
      </main>
    )
  }

  const activeOrders = orders.filter((o) =>
    o.order_status === "pending_payment" || o.order_status === "in_progress"
  )

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{profile?.full_name || "Мой кабинет"}</h1>
        {profile?.current_school && (
          <p className="text-gray-500 text-sm mt-1">{profile.current_school}</p>
        )}
      </div>

      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Активные заказы
          </h2>
          <div className="flex flex-col gap-3">
            {activeOrders.map((order) => (
              <div key={order.id} className="border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{order.service_title}</p>
                  <p className="text-sm text-gray-500">{order.mentor_email}</p>
                </div>
                {order.order_status === "pending_payment" && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                    Ожидает оплаты
                  </span>
                )}
                {order.order_status === "in_progress" && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                    В работе
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <Link href="/" className="border rounded-xl p-5 hover:shadow-md transition">
          <p className="font-semibold mb-1">Найти ментора</p>
          <p className="text-sm text-gray-500">Просмотреть каталог менторов</p>
        </Link>
        <Link href="/orders" className="border rounded-xl p-5 hover:shadow-md transition">
          <p className="font-semibold mb-1">Мои заказы</p>
          <p className="text-sm text-gray-500">История и статусы заказов</p>
        </Link>
        <Link href="/profile" className="border rounded-xl p-5 hover:shadow-md transition">
          <p className="font-semibold mb-1">Профиль</p>
          <p className="text-sm text-gray-500">Редактировать информацию о себе</p>
        </Link>
      </div>
    </main>
  )
}
