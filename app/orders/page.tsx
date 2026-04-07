"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { fetchOrders } from "@/lib/api"
import { Order } from "@/types"

const STATUS_LABEL: Record<Order["order_status"], string> = {
  draft: "Черновик",
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  in_progress: "В работе",
  completed: "Завершён",
  disputed: "Спор",
  payout_pending: "Ожидает выплаты",
  paid_out: "Выплачен",
  cancelled: "Отменён",
}

const STATUS_STYLE: Record<Order["order_status"], string> = {
  draft: "bg-gray-50 text-gray-500",
  pending_payment: "bg-yellow-50 text-yellow-700",
  paid: "bg-blue-50 text-blue-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  completed: "bg-green-50 text-green-700",
  disputed: "bg-red-50 text-red-700",
  payout_pending: "bg-gray-100 text-gray-500",
  paid_out: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-400",
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [accepted, setAccepted] = useState<number[]>([])

  useEffect(() => {
    setRole(localStorage.getItem("role"))
    const stored = localStorage.getItem("accepted_orders")
    setAccepted(stored ? JSON.parse(stored) : [])
    fetchOrders()
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [])

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
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Мои заказы</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="font-semibold text-gray-900 mb-2">Заказов пока нет</h3>
            <p className="text-sm text-gray-400 mb-6">
              {role === "mentor" ? "Заказы появятся когда студенты запишутся к тебе" : "Найди ментора и запишись на консультацию"}
            </p>
            {role !== "mentor" && (
              <Link href="/mentors" className="inline-flex bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                Найти ментора
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start justify-between gap-4 hover:border-indigo-100 hover:shadow-sm transition-all group block"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                    {order.service_title}
                  </h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {role === "mentor"
                      ? (order.student_info?.full_name?.trim().split(/\s+/)[0] || "Студент")
                      : "Открыть заказ →"}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    {new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[order.order_status]}`}>
                    {STATUS_LABEL[order.order_status]}
                  </span>
                  <span className="text-lg font-bold text-gray-900">{Number(order.total_price).toLocaleString("ru-RU")} ₸</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
