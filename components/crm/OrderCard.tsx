import { AdminOrder } from "@/types"
import { Avatar } from "@/components/Avatar"

interface OrderCardProps {
  order: AdminOrder
  onOpenPayment: (order: AdminOrder) => void
  onOpenDispute: (order: AdminOrder, resolution: "full_refund" | "payout_mentor") => void
}

export function OrderCard({ order, onOpenPayment, onOpenDispute }: OrderCardProps) {
  return (
    <div
      draggable
      data-testid={`order-card-${order.id}`}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(order.id))}
      className="bg-white border border-gray-200 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-gray-300 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Avatar
          name={order.student_info?.full_name || "С"}
          src={order.student_info?.profile_photo}
          className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700"
          letterClassName="text-xs font-bold"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {order.student_info?.full_name || `Студент #${order.student}`}
          </p>
          <p className="text-xs text-gray-400 truncate">{order.mentor_info.full_name}</p>
        </div>
        <span className="text-xs font-bold text-gray-900 shrink-0">{order.total_price} ₸</span>
      </div>
      <p className="text-xs text-gray-500 truncate mb-2">{order.service_title}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-300">#{order.id}</span>
        {order.order_status === "pending_payment" && (
          <button
            onClick={() => onOpenPayment(order)}
            className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-medium hover:bg-amber-100 transition-colors"
          >
            Проверить оплату
          </button>
        )}
        {order.order_status === "disputed" && (
          <div className="flex gap-1">
            <button
              onClick={() => onOpenDispute(order, "full_refund")}
              className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-medium hover:bg-blue-100 transition-colors"
            >
              Возврат
            </button>
            <button
              onClick={() => onOpenDispute(order, "payout_mentor")}
              className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-[11px] font-medium hover:bg-green-100 transition-colors"
            >
              Выплата
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
