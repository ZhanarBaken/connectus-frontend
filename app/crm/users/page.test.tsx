import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchOrders } from "@/lib/api"
import { Order } from "@/types"
import CRMUsersPage from "./page"

vi.mock("@/lib/api")

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    student: 1,
    student_info: { id: 1, full_name: "Данияр Ахметов", current_school_or_university: "НИШ ФМН", profile_photo: null },
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
    engagement_application_deadline: null,
    scheduled_at: null,
    due_at: null,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Order
}

describe("CRMUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows the empty state when there are no orders/students", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([])
    render(<CRMUsersPage />)

    expect(await screen.findByText("Нет студентов")).toBeInTheDocument()
  })

  it("shows an error banner when the fetch fails", async () => {
    vi.mocked(fetchOrders).mockRejectedValue(new Error("boom"))
    render(<CRMUsersPage />)

    expect(await screen.findByText("Не удалось загрузить данные")).toBeInTheDocument()
  })

  it("groups multiple orders by student and counts them correctly", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({ id: 1, student: 1, order_status: "completed", created_at: "2026-01-01T00:00:00Z" }),
      makeOrder({ id: 2, student: 1, order_status: "pending_payment", created_at: "2026-01-05T00:00:00Z" }),
      makeOrder({
        id: 3,
        student: 2,
        student_info: { id: 2, full_name: "Асем Нурланова", current_school_or_university: "БИЛ", profile_photo: null },
        order_status: "completed",
        created_at: "2026-01-02T00:00:00Z",
      }),
    ])
    render(<CRMUsersPage />)

    expect(await screen.findByText("Данияр Ахметов")).toBeInTheDocument()
    expect(screen.getByText("Асем Нурланова")).toBeInTheDocument()
    expect(screen.getByText("2 всего")).toBeInTheDocument()

    const daniyarRow = screen.getByText("Данияр Ахметов").closest("tr")!
    expect(daniyarRow).toHaveTextContent("2") // orderCount
  })

  it("filters students by search text across name and school", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({ id: 1, student: 1 }),
      makeOrder({
        id: 2,
        student: 2,
        student_info: { id: 2, full_name: "Асем Нурланова", current_school_or_university: "БИЛ", profile_photo: null },
      }),
    ])
    render(<CRMUsersPage />)
    await screen.findByText("Данияр Ахметов")

    await user.type(screen.getByPlaceholderText("Поиск по имени или школе..."), "Асем")

    expect(screen.getByText("Асем Нурланова")).toBeInTheDocument()
    expect(screen.queryByText("Данияр Ахметов")).not.toBeInTheDocument()
  })
})
