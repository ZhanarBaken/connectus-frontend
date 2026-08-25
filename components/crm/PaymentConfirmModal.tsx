"use client"

import { useEffect, useState } from "react"
import { confirmOrderPayment, rejectOrderPayment, fetchOrderDocuments } from "@/lib/api"
import { AdminOrder, OrderDocument } from "@/types"

interface PaymentConfirmModalProps {
  order: AdminOrder
  onClose: () => void
  onConfirmed: (order: AdminOrder) => void
  onRejected: (order: AdminOrder) => void
}

export function PaymentConfirmModal({ order, onClose, onConfirmed, onRejected }: PaymentConfirmModalProps) {
  const [receipt, setReceipt] = useState<OrderDocument | null>(null)
  const [loadingReceipt, setLoadingReceipt] = useState(true)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchOrderDocuments(order.id)
      .then((docs) => setReceipt(docs.find((d) => d.kind === "payment_receipt") ?? null))
      .finally(() => setLoadingReceipt(false))
  }, [order.id])

  const handleConfirm = async () => {
    setSubmitting(true)
    setError("")
    try {
      const updated = await confirmOrderPayment(order.id)
      onConfirmed({ ...order, ...updated })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError("Укажите причину отклонения")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const updated = await rejectOrderPayment(order.id, trimmed)
      onRejected({ ...order, ...updated })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Подтверждение оплаты</h2>
        <p className="text-sm text-gray-500 mb-4">
          Заказ #{order.id} · {order.student_info?.full_name || `Студент #${order.student}`} · {order.total_price} ₸
        </p>

        {order.payment_instructions && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mb-3">
            Реквизиты: {order.payment_instructions.account_details}
          </p>
        )}

        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Квитанция</p>
          {loadingReceipt ? (
            <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
          ) : receipt ? (
            <a
              href={receipt.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              Открыть {receipt.original_filename}
            </a>
          ) : (
            <p className="text-sm text-amber-600">Студент ещё не загрузил квитанцию.</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {showReject ? (
          <div className="space-y-2">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Причина отклонения — увидит студент"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Отклонить платёж
              </button>
              <button
                onClick={() => setShowReject(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
              >
                Назад
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Подтвердить оплату
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:border-red-200 hover:text-red-500 transition-colors"
            >
              Отклонить
            </button>
            <button onClick={onClose} className="px-4 py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors">
              Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
