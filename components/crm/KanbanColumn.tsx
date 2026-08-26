"use client"

import { useState } from "react"
import { AdminOrder } from "@/types"
import { ColumnKey } from "./kanbanTransitions"
import { OrderCard } from "./OrderCard"

interface KanbanColumnProps {
  columnKey: ColumnKey
  label: string
  orders: AdminOrder[]
  onDropOrder: (orderId: number, to: ColumnKey) => void
  onOpenPayment: (order: AdminOrder) => void
  onOpenDispute: (order: AdminOrder, resolution: "full_refund" | "payout_mentor") => void
}

export function KanbanColumn({
  columnKey, label, orders, onDropOrder, onOpenPayment, onOpenDispute,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false)

  return (
    <div
      data-testid={`kanban-column-${columnKey}`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsOver(false)
        const orderId = Number(e.dataTransfer.getData("text/plain"))
        if (orderId) onDropOrder(orderId, columnKey)
      }}
      className={`flex-shrink-0 w-72 rounded-2xl p-3 border transition-colors ${
        isOver ? "border-gray-400 bg-gray-100" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        <span className="text-xs text-gray-400">{orders.length}</span>
      </div>
      <div className="space-y-2 min-h-[40px]">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} onOpenPayment={onOpenPayment} onOpenDispute={onOpenDispute} />
        ))}
        {orders.length === 0 && <p className="text-xs text-gray-300 text-center py-4">Пусто</p>}
      </div>
    </div>
  )
}
