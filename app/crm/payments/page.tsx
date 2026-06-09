"use client"

import { useEffect, useState } from "react"
import { fetchOrders, confirmOrderPayment, rejectOrderPayment } from "@/lib/api"
import { Order } from "@/types"
import { Avatar } from "@/components/Avatar"

export default function CRMPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({})
  const [showRejectInput, setShowRejectInput] = useState<number | null>(null)
  const [error, setError] = useState("")

  const load = () => {
    setLoading(true)
    fetchOrders()
      .then((all) => setOrders(all.filter((o) => o.order_status === "pending_payment")))
      .catch(() => setError("Не удалось загрузить заказы"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleConfirm = async (id: number) => {
    setActionLoading(id)
    setError("")
    try {
      await confirmOrderPayment(id)
      setOrders((prev) => prev.filter((o) => o.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: number) => {
    const reason = rejectReason[id]?.trim()
    if (!reason) {
      setError("Укажите причину отклонения")
      return
    }
    setActionLoading(id)
    setError("")
    try {
      await rejectOrderPayment(id, reason)
      setOrders((prev) => prev.filter((o) => o.id !== id))
      setShowRejectInput(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Платежи на подтверждение</h1>
        <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
          {orders.length} ожидают
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-sm">Нет ожидающих платежей</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <Avatar
                  name={order.student_info?.full_name || "С"}
                  src={order.student_info?.profile_photo}
                  className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-900">
                      {order.student_info?.full_name || `Студент #${order.student}`}
                    </span>
                    <span className="text-sm text-gray-400">Заказ #{order.id}</span>
                    <span className="text-sm font-bold text-gray-900">{order.total_price} ₸</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{order.service_title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.created_at).toLocaleString("ru-RU")}
                  </p>
                  {order.payment_instructions && (
                    <p className="text-xs text-gray-500 mt-1">
                      Реквизиты: {order.payment_instructions.account_details}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleConfirm(order.id)}
                    disabled={actionLoading === order.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    Подтвердить
                  </button>

                  {showRejectInput === order.id ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Причина..."
                        value={rejectReason[order.id] || ""}
                        onChange={(e) => setRejectReason((prev) => ({ ...prev, [order.id]: e.target.value }))}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-40 focus:outline-none focus:border-gray-400"
                      />
                      <button
                        onClick={() => handleReject(order.id)}
                        disabled={actionLoading === order.id}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        Отклонить
                      </button>
                      <button
                        onClick={() => setShowRejectInput(null)}
                        className="px-2 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowRejectInput(order.id)}
                      className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:border-red-200 hover:text-red-500 transition-colors"
                    >
                      Отклонить
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
