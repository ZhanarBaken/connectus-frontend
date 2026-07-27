import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchOrders } from "@/lib/api"
import { Order } from "@/types"
import CRMOrdersPage from "./page"

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
    payment_instructions: null,
    conversation_id: null,
    installment_number: null,
    engagement_duration_months: null,
    engagement_status: null,
    scheduled_at: null,
    due_at: null,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Order
}

describe("CRMOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows the empty state when there are no orders", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([])
    render(<CRMOrdersPage />)

    expect(await screen.findByText("Нет заказов")).toBeInTheDocument()
  })

  it("shows an error banner when the fetch fails", async () => {
    vi.mocked(fetchOrders).mockRejectedValue(new Error("boom"))
    render(<CRMOrdersPage />)

    expect(await screen.findByText("Не удалось загрузить заказы")).toBeInTheDocument()
  })

  it("renders all orders with student, amount, and translated status", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({ id: 1, order_status: "pending_payment" }),
      makeOrder({
        id: 2,
        order_status: "completed",
        service_title: "Консультация",
        student: 2,
        student_info: { id: 2, full_name: "Асем Нурланова", current_school_or_university: "", profile_photo: null },
      }),
    ])
    render(<CRMOrdersPage />)

    expect(await screen.findByText("Данияр Ахметов")).toBeInTheDocument()
    expect(screen.getByText("Асем Нурланова")).toBeInTheDocument()
    expect(screen.getAllByText("15000 ₸")).toHaveLength(2)
    expect(screen.getByText("Ждёт оплаты")).toBeInTheDocument()
    expect(screen.getByText("Завершён")).toBeInTheDocument()
  })

  it("filters the table by order status when a status tab is clicked", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({ id: 1, order_status: "pending_payment" }),
      makeOrder({ id: 2, order_status: "completed" }),
    ])
    render(<CRMOrdersPage />)
    await screen.findByText("Ждёт оплаты")

    await user.click(screen.getByRole("button", { name: /^Завершён/ }))

    expect(screen.getByRole("cell", { name: "2" })).toBeInTheDocument()
    expect(screen.queryByRole("cell", { name: "1" })).not.toBeInTheDocument()
  })

  it("shows a falls-back label to the raw student id when student_info is missing a name", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({ id: 1, student: 77, student_info: { id: 77, full_name: "", current_school_or_university: "", profile_photo: null } }),
    ])
    render(<CRMOrdersPage />)

    expect(await screen.findByText("#77")).toBeInTheDocument()
  })
})
