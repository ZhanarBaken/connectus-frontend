import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchOrders, confirmOrderPayment, rejectOrderPayment } from "@/lib/api"
import { Order } from "@/types"
import CRMPaymentsPage from "./page"

vi.mock("@/lib/api")

function makeOrder(overrides: Partial<Order> = {}): Order {
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
    payment_instructions: { account_details: "Kaspi Gold 1234 5678", whatsapp_link: "", tg_sent_to_user: false },
    conversation_id: null,
    installment_number: null,
    engagement_duration_months: null,
    engagement_status: null,
    engagement_application_deadline: null,
    scheduled_at: null,
    due_at: null,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Order
}

describe("CRMPaymentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows the empty state when there are no pending-payment orders", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([makeOrder({ order_status: "completed" })])
    render(<CRMPaymentsPage />)

    expect(await screen.findByText("Нет ожидающих платежей")).toBeInTheDocument()
  })

  it("filters to only pending_payment orders and renders amount/service correctly", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({ id: 1, order_status: "pending_payment", total_price: "15000", service_title: "Проверка эссе" }),
      makeOrder({ id: 2, order_status: "completed" }),
    ])
    render(<CRMPaymentsPage />)

    expect(await screen.findByText("Заказ #1")).toBeInTheDocument()
    expect(screen.queryByText("Заказ #2")).not.toBeInTheDocument()
    expect(screen.getByText("15000 ₸")).toBeInTheDocument()
    expect(screen.getByText("Проверка эссе")).toBeInTheDocument()
    expect(screen.getByText("1 ожидают")).toBeInTheDocument()
  })

  it("shows an error banner when the fetch fails", async () => {
    vi.mocked(fetchOrders).mockRejectedValue(new Error("boom"))
    render(<CRMPaymentsPage />)

    expect(await screen.findByText("Не удалось загрузить заказы")).toBeInTheDocument()
  })

  it("confirms a payment and removes the order from the pending list", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchOrders).mockResolvedValue([makeOrder({ id: 1, order_status: "pending_payment" })])
    vi.mocked(confirmOrderPayment).mockResolvedValue(makeOrder({ id: 1, order_status: "paid" }))

    render(<CRMPaymentsPage />)
    await screen.findByText("Заказ #1")

    await user.click(screen.getByRole("button", { name: "Подтвердить" }))

    expect(confirmOrderPayment).toHaveBeenCalledWith(1)
    expect(await screen.findByText("Нет ожидающих платежей")).toBeInTheDocument()
  })

  it("requires a reason before rejecting a payment", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchOrders).mockResolvedValue([makeOrder({ id: 1, order_status: "pending_payment" })])

    render(<CRMPaymentsPage />)
    await screen.findByText("Заказ #1")

    await user.click(screen.getByRole("button", { name: "Отклонить" }))
    await user.click(screen.getByRole("button", { name: "Отклонить" }))

    expect(await screen.findByText("Укажите причину отклонения")).toBeInTheDocument()
    expect(rejectOrderPayment).not.toHaveBeenCalled()
  })

  it("rejects a payment with a reason and removes it from the list", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchOrders).mockResolvedValue([makeOrder({ id: 1, order_status: "pending_payment" })])
    vi.mocked(rejectOrderPayment).mockResolvedValue(makeOrder({ id: 1, order_status: "cancelled" }))

    render(<CRMPaymentsPage />)
    await screen.findByText("Заказ #1")

    await user.click(screen.getByRole("button", { name: "Отклонить" }))
    await user.type(screen.getByPlaceholderText("Причина..."), "Неверный чек")
    await user.click(screen.getByRole("button", { name: "Отклонить" }))

    expect(rejectOrderPayment).toHaveBeenCalledWith(1, "Неверный чек")
    expect(await screen.findByText("Нет ожидающих платежей")).toBeInTheDocument()
  })
})
