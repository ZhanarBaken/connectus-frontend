// Which order_status → order_status drags the CRM Kanban board allows,
// and why the rest are blocked. Deliberately NOT a generic "set status"
// endpoint — each allowed drag maps to an existing, business-rule-aware
// action (payment confirm, admin-cancel, dispute resolve), enforced here
// client-side before any API call is made.

export type ColumnKey = "pending_payment" | "in_progress" | "completed" | "disputed" | "cancelled"

export const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "pending_payment", label: "Ждёт оплаты" },
  { key: "in_progress", label: "В работе" },
  { key: "completed", label: "Завершён" },
  { key: "disputed", label: "Спор" },
  { key: "cancelled", label: "Отменён" },
]

const ALLOWED: Partial<Record<ColumnKey, ColumnKey[]>> = {
  pending_payment: ["in_progress", "cancelled"],
  disputed: ["completed", "cancelled"],
}

export function isAllowedTransition(from: ColumnKey, to: ColumnKey): boolean {
  return ALLOWED[from]?.includes(to) ?? false
}

export function blockReason(from: ColumnKey, to: ColumnKey): string {
  if (from === "completed" || from === "cancelled") {
    return "Статус финальный — заказ больше нельзя переместить."
  }
  if (from === "in_progress" && to === "completed") {
    return "Завершить заказ может только ментор — это подтверждает доставку услуги."
  }
  if (from === "in_progress" && to === "disputed") {
    return "Спор открывает только участник сделки (студент или ментор)."
  }
  if (from === "in_progress" && to === "cancelled") {
    return "Отмена оплаченного заказа — только через открытие и разрешение спора."
  }
  return "Такой переход недоступен из CRM."
}
