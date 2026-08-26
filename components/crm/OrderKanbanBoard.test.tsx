import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  fetchAdminOrders,
  confirmOrderPayment,
  rejectOrderPayment,
  fetchOrderDocuments,
  adminCancelOrder,
  resolveDispute,
} from "@/lib/api"
import { AdminOrder } from "@/types"
import { OrderKanbanBoard } from "./OrderKanbanBoard"

vi.mock("@/lib/api")

function makeAdminOrder(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 1,
    student: 1,
    student_info: { id: 1, full_name: "Данияр Ахметов", current_school_or_university: "", profile_photo: null },
    mentor: 2,
    mentor_service: 3,
    service_title: "Проверка эссе",
    payout_category: "primary_consultation",
    subtotal: "15000",
    total_price: "15000",
    platform_fee: "1500",
    mentor_payout_amount: "13500",
    payment_status: "unpaid",
    order_status: "pending_payment",
    payment_instructions: null,
    conversation_id: null,
    support_engagement: null,
    installment_number: null,
    engagement_duration_months: null,
    engagement_status: null,
    scheduled_at: null,
    due_at: null,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    mentor_info: { id: 2, full_name: "Айгерим Ержанова", profile_photo: null },
    student_email: "student@example.com",
    mentor_email: "mentor@example.com",
    dispute_id: null,
    ...overrides,
  } as AdminOrder
}

// jsdom's DataTransfer is not fully implemented — a plain object with
// get/setData is enough for the board's onDragStart/onDrop handlers,
// which only ever call those two methods.
function makeDataTransfer() {
  const store: Record<string, string> = {}
  return {
    setData: (k: string, v: string) => { store[k] = v },
    getData: (k: string) => store[k] ?? "",
  }
}

function dragOrderInto(orderId: number, columnKey: string) {
  const dataTransfer = makeDataTransfer()
  const card = screen.getByTestId(`order-card-${orderId}`)
  const column = screen.getByTestId(`kanban-column-${columnKey}`)
  fireEvent.dragStart(card, { dataTransfer })
  fireEvent.dragOver(column, { dataTransfer })
  fireEvent.drop(column, { dataTransfer })
}

describe("OrderKanbanBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows an error banner when the fetch fails", async () => {
    vi.mocked(fetchAdminOrders).mockRejectedValue(new Error("boom"))
    render(<OrderKanbanBoard />)

    expect(await screen.findByText("Не удалось загрузить заказы")).toBeInTheDocument()
  })

  it("groups orders into the right columns", async () => {
    vi.mocked(fetchAdminOrders).mockResolvedValue([
      makeAdminOrder({ id: 1, order_status: "pending_payment" }),
      makeAdminOrder({ id: 2, order_status: "in_progress" }),
      makeAdminOrder({ id: 3, order_status: "completed" }),
    ])
    render(<OrderKanbanBoard />)

    expect(await screen.findByTestId("order-card-1")).toBeInTheDocument()
    expect(screen.getByTestId("kanban-column-pending_payment")).toContainElement(screen.getByTestId("order-card-1"))
    expect(screen.getByTestId("kanban-column-in_progress")).toContainElement(screen.getByTestId("order-card-2"))
    expect(screen.getByTestId("kanban-column-completed")).toContainElement(screen.getByTestId("order-card-3"))
  })

  it("dragging pending_payment into in_progress opens the payment confirm modal instead of calling the API directly", async () => {
    vi.mocked(fetchAdminOrders).mockResolvedValue([makeAdminOrder({ id: 1, order_status: "pending_payment" })])
    vi.mocked(fetchOrderDocuments).mockResolvedValue([])
    render(<OrderKanbanBoard />)
    await screen.findByTestId("order-card-1")

    dragOrderInto(1, "in_progress")

    expect(await screen.findByText("Подтверждение оплаты")).toBeInTheDocument()
    expect(confirmOrderPayment).not.toHaveBeenCalled()
  })

  it("confirming payment in the modal moves the card to in_progress", async () => {
    const user = userEvent.setup()
    const order = makeAdminOrder({ id: 1, order_status: "pending_payment" })
    vi.mocked(fetchAdminOrders).mockResolvedValue([order])
    vi.mocked(fetchOrderDocuments).mockResolvedValue([])
    vi.mocked(confirmOrderPayment).mockResolvedValue({ ...order, order_status: "in_progress" })
    render(<OrderKanbanBoard />)
    await screen.findByTestId("order-card-1")

    dragOrderInto(1, "in_progress")
    await screen.findByText("Подтверждение оплаты")
    await user.click(screen.getByRole("button", { name: "Подтвердить оплату" }))

    expect(confirmOrderPayment).toHaveBeenCalledWith(1)
    expect(await screen.findByTestId("kanban-column-in_progress")).toContainElement(
      screen.getByTestId("order-card-1"),
    )
  })

  it("dragging in_progress into completed is blocked and shows an explanation, without calling any API", async () => {
    vi.mocked(fetchAdminOrders).mockResolvedValue([makeAdminOrder({ id: 1, order_status: "in_progress" })])
    render(<OrderKanbanBoard />)
    await screen.findByTestId("order-card-1")

    dragOrderInto(1, "completed")

    expect(await screen.findByText(/Завершить заказ может только ментор/)).toBeInTheDocument()
    expect(confirmOrderPayment).not.toHaveBeenCalled()
    expect(adminCancelOrder).not.toHaveBeenCalled()
    expect(screen.getByTestId("kanban-column-in_progress")).toContainElement(screen.getByTestId("order-card-1"))
  })

  it("dragging pending_payment into cancelled opens the admin cancel modal", async () => {
    const user = userEvent.setup()
    const order = makeAdminOrder({ id: 1, order_status: "pending_payment" })
    vi.mocked(fetchAdminOrders).mockResolvedValue([order])
    vi.mocked(adminCancelOrder).mockResolvedValue({ ...order, order_status: "cancelled" })
    render(<OrderKanbanBoard />)
    await screen.findByTestId("order-card-1")

    dragOrderInto(1, "cancelled")
    await screen.findByRole("heading", { name: "Отменить заказ" })
    await user.type(screen.getByPlaceholderText("Причина отмены"), "Дубликат")
    await user.click(screen.getByRole("button", { name: "Отменить заказ" }))

    expect(adminCancelOrder).toHaveBeenCalledWith(1, "Дубликат")
    expect(await screen.findByTestId("kanban-column-cancelled")).toContainElement(screen.getByTestId("order-card-1"))
  })

  it("the quick payout button on a disputed card opens the dispute resolve modal preset to payout_mentor", async () => {
    const user = userEvent.setup()
    const order = makeAdminOrder({ id: 1, order_status: "disputed", dispute_id: 77 })
    vi.mocked(fetchAdminOrders).mockResolvedValue([order])
    vi.mocked(resolveDispute).mockResolvedValue({} as never)
    render(<OrderKanbanBoard />)
    await screen.findByTestId("order-card-1")

    await user.click(screen.getByRole("button", { name: "Выплата" }))
    await screen.findByText("Разрешить спор")
    await user.click(screen.getByRole("button", { name: "Подтвердить" }))

    expect(resolveDispute).toHaveBeenCalledWith(77, "payout_mentor")
    expect(await screen.findByTestId("kanban-column-completed")).toContainElement(screen.getByTestId("order-card-1"))
  })

  it("the quick refund button on a disputed card resolves with full_refund and moves the card to cancelled", async () => {
    const user = userEvent.setup()
    const order = makeAdminOrder({ id: 1, order_status: "disputed", dispute_id: 77 })
    vi.mocked(fetchAdminOrders).mockResolvedValue([order])
    vi.mocked(resolveDispute).mockResolvedValue({} as never)
    render(<OrderKanbanBoard />)
    await screen.findByTestId("order-card-1")

    await user.click(screen.getByRole("button", { name: "Возврат" }))
    await user.click(screen.getByRole("button", { name: "Подтвердить" }))

    expect(resolveDispute).toHaveBeenCalledWith(77, "full_refund")
    expect(await screen.findByTestId("kanban-column-cancelled")).toContainElement(screen.getByTestId("order-card-1"))
  })

  it("rejecting a payment in the modal keeps the card in pending_payment on API failure and shows the error", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminOrders).mockResolvedValue([makeAdminOrder({ id: 1, order_status: "pending_payment" })])
    vi.mocked(fetchOrderDocuments).mockResolvedValue([])
    vi.mocked(rejectOrderPayment).mockRejectedValue(new Error("Не удалось отклонить платёж"))
    render(<OrderKanbanBoard />)
    await screen.findByTestId("order-card-1")

    await user.click(screen.getByRole("button", { name: "Проверить оплату" }))
    await user.click(screen.getByRole("button", { name: "Отклонить" }))
    await user.type(screen.getByPlaceholderText("Причина отклонения — увидит студент"), "Не вижу оплату")
    await user.click(screen.getByRole("button", { name: "Отклонить платёж" }))

    expect(await screen.findByText("Не удалось отклонить платёж")).toBeInTheDocument()
    expect(screen.getByTestId("kanban-column-pending_payment")).toContainElement(screen.getByTestId("order-card-1"))
  })
})
