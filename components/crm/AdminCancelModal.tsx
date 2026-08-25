"use client"

import { useState } from "react"
import { adminCancelOrder } from "@/lib/api"
import { AdminOrder } from "@/types"

interface AdminCancelModalProps {
  order: AdminOrder
  onClose: () => void
  onCancelled: (order: AdminOrder) => void
}

export function AdminCancelModal({ order, onClose, onCancelled }: AdminCancelModalProps) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleCancel = async () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError("Укажите причину отмены")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const updated = await adminCancelOrder(order.id, trimmed)
      onCancelled({ ...order, ...updated })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Отменить заказ</h2>
        <p className="text-sm text-gray-500 mb-4">Заказ #{order.id} — ментор получит уведомление.</p>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Причина отмены"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Отменить заказ
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
          >
            Назад
          </button>
        </div>
      </div>
    </div>
  )
}
