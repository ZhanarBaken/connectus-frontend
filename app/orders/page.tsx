"use client"

import { useState, useEffect } from "react"
import { fetchOrders } from "@/lib/api"
import { Order } from "@/types"

const STATUS_LABEL: Record<Order["order_status"], string> = {
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  in_progress: "В работе",
  completed: "Завершён",
  disputed: "Спор",
  payout_pending: "Ожидает выплаты",
  paid_out: "Выплачен",
  cancelled: "Отменён",
}

const STATUS_COLOR: Record<Order["order_status"], string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  paid: "bg-blue-100 text-blue-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  disputed: "bg-red-100 text-red-800",
  payout_pending: "bg-gray-100 text-gray-700",
  paid_out: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-500",
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [role, setRole] = useState<string | null>(null)
  const [accepted, setAccepted] = useState<number[]>([])

  useEffect(() => {
    setRole(localStorage.getItem("role"))
    fetchOrders()
      .then(setOrders)
      .catch(() => setError("Не удалось загрузить заказы"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">
        Загрузка...
      </main>
    )
  }

  if (error) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center text-red-500">
        {error}
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-6">Мои заказы</h1>

        {orders.length === 0 && (
          <p className="text-gray-500">Заказов пока нет.</p>
        )}

        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div key={order.id} className="border rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold">{order.service_title}</p>
                  {role === "mentor" ? (
                    <p className="text-sm text-gray-500">
                      {order.student_info.full_name}
                      {order.student_info.current_school_or_university
                        ? ` · ${order.student_info.current_school_or_university}`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">{order.mentor_email}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[order.order_status]}`}>
                  {STATUS_LABEL[order.order_status]}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex gap-6">
                  <span>Сумма: <span className="font-semibold text-black">${order.total_price}</span></span>
                  <span className="text-gray-400">
                    {new Date(order.created_at).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                {role === "mentor" && order.order_status === "in_progress" && (
                  accepted.includes(order.id) ? (
                    <span className="text-xs text-green-700 font-medium">Принято</span>
                  ) : (
                    <button
                      onClick={() => setAccepted((prev) => [...prev, order.id])}
                      className="bg-black text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-800 transition"
                    >
                      Принять
                    </button>
                  )
                )}
              </div>

              {role !== "mentor" && order.payment_instructions && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm mt-3">
                  <p className="font-semibold text-amber-900 mb-1">Как оплатить</p>
                  <p className="text-amber-800 mb-2">{order.payment_instructions.account_details}</p>
                  <a
                    href={order.payment_instructions.whatsapp_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-green-600 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-green-700 transition"
                  >
                    Отправить чек в WhatsApp
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
    </main>
  )
}
