"use client"

import { useState } from "react"
import { resolveDispute } from "@/lib/api"
import { AdminOrder, OrderStatus } from "@/types"

interface DisputeResolveModalProps {
  order: AdminOrder
  resolution: "full_refund" | "payout_mentor"
  onClose: () => void
  onResolved: (order: AdminOrder) => void
}

export function DisputeResolveModal({ order, resolution, onClose, onResolved }: DisputeResolveModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const label = resolution === "full_refund" ? "Возврат студенту" : "Выплата ментору"

  const handleConfirm = async () => {
    if (order.dispute_id == null) {
      setError("У заказа нет связанного спора — обновите доску и попробуйте снова")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await resolveDispute(order.dispute_id, resolution)
      // resolveDispute returns the Dispute, not the Order — the order's
      // outcome status is implied by the resolution the admin just picked.
      const newStatus: OrderStatus = resolution === "full_refund" ? "cancelled" : "completed"
      onResolved({ ...order, order_status: newStatus })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Разрешить спор</h2>
        <p className="text-sm text-gray-500 mb-4">
          Заказ #{order.id} · {label}
        </p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Подтвердить
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
