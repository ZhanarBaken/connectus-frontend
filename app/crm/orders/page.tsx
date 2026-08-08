"use client"

import { useEffect, useState } from "react"
import { fetchOrders } from "@/lib/api"
import { Order, OrderStatus } from "@/types"

const STATUS_LABEL: Record<string, string> = {
  draft: "Черновик",
  pending_payment: "Ждёт оплаты",
  in_progress: "В работе",
  completed: "Завершён",
  disputed: "Спор",
  cancelled: "Отменён",
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending_payment: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  disputed: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-400",
}

export default function CRMOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filtered, setFiltered] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatus | "all">("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchOrders()
      .then((all) => {
        setOrders(all)
        setFiltered(all)
      })
      .catch(() => setError("Не удалось загрузить заказы"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (filter === "all") {
      setFiltered(orders)
    } else {
      setFiltered(orders.filter((o) => o.order_status === filter))
    }
  }, [filter, orders])

  const statuses: Array<OrderStatus | "all"> = [
    "all", "pending_payment", "in_progress", "completed", "disputed", "cancelled",
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Все заказы</h1>

      <div className="flex gap-1 flex-wrap mb-4">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filter === s
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {s === "all" ? "Все" : STATUS_LABEL[s]} {s !== "all" && `(${orders.filter((o) => o.order_status === s).length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse h-14" />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Студент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Услуга</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Сумма</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 text-sm">Нет заказов</td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{o.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {o.student_info?.full_name || `#${o.student}`}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.service_title}</td>
                    <td className="px-4 py-3 font-medium">{o.total_price} ₸</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[o.order_status]}`}>
                        {STATUS_LABEL[o.order_status] || o.order_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(o.created_at).toLocaleDateString("ru-RU")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
