"use client"

import { useEffect, useState } from "react"
import { fetchAdminOrders } from "@/lib/api"
import { AdminOrder } from "@/types"
import { COLUMNS, ColumnKey, isAllowedTransition, blockReason } from "./kanbanTransitions"
import { KanbanColumn } from "./KanbanColumn"
import { PaymentConfirmModal } from "./PaymentConfirmModal"
import { DisputeResolveModal } from "./DisputeResolveModal"
import { AdminCancelModal } from "./AdminCancelModal"

export function OrderKanbanBoard() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const [paymentOrder, setPaymentOrder] = useState<AdminOrder | null>(null)
  const [cancelOrder, setCancelOrder] = useState<AdminOrder | null>(null)
  const [disputeState, setDisputeState] = useState<
    { order: AdminOrder; resolution: "full_refund" | "payout_mentor" } | null
  >(null)

  useEffect(() => {
    fetchAdminOrders()
      .then(setOrders)
      .catch(() => setError("Не удалось загрузить заказы"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(""), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const updateOrder = (updated: AdminOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
  }

  const handleDropOrder = (orderId: number, to: ColumnKey) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return
    const from = order.order_status as ColumnKey
    if (from === to) return

    if (!isAllowedTransition(from, to)) {
      setNotice(blockReason(from, to))
      return
    }
    if (from === "pending_payment" && to === "in_progress") {
      setPaymentOrder(order)
      return
    }
    if (from === "pending_payment" && to === "cancelled") {
      setCancelOrder(order)
      return
    }
    if (from === "disputed" && to === "completed") {
      setDisputeState({ order, resolution: "payout_mentor" })
      return
    }
    if (from === "disputed" && to === "cancelled") {
      setDisputeState({ order, resolution: "full_refund" })
    }
  }

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = orders.filter((o) => o.order_status === col.key)
    return acc
  }, {} as Record<ColumnKey, AdminOrder[]>)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Заказы</h1>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}
      {notice && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700 mb-4">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 bg-gray-100 rounded-2xl animate-pulse h-64" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              columnKey={col.key}
              label={col.label}
              orders={grouped[col.key] ?? []}
              onDropOrder={handleDropOrder}
              onOpenPayment={setPaymentOrder}
              onOpenDispute={(order, resolution) => setDisputeState({ order, resolution })}
            />
          ))}
        </div>
      )}

      {paymentOrder && (
        <PaymentConfirmModal
          order={paymentOrder}
          onClose={() => setPaymentOrder(null)}
          onConfirmed={(updated) => { updateOrder(updated); setPaymentOrder(null) }}
          onRejected={(updated) => { updateOrder(updated); setPaymentOrder(null) }}
        />
      )}
      {cancelOrder && (
        <AdminCancelModal
          order={cancelOrder}
          onClose={() => setCancelOrder(null)}
          onCancelled={(updated) => { updateOrder(updated); setCancelOrder(null) }}
        />
      )}
      {disputeState && (
        <DisputeResolveModal
          order={disputeState.order}
          resolution={disputeState.resolution}
          onClose={() => setDisputeState(null)}
          onResolved={(updated) => { updateOrder(updated); setDisputeState(null) }}
        />
      )}
    </div>
  )
}
