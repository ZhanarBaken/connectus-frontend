import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import OrdersPage from "./page"
import { fetchOrders, fetchMentors } from "@/lib/api"
import type { Order, MentorCard } from "@/types"

vi.mock("@/lib/api")

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    student: 7,
    student_info: { id: 7, full_name: "Аружан Есенова", current_school_or_university: "", profile_photo: null },
    mentor: 3,
    mentor_service: 10,
    service_title: "Первичная консультация",
    payout_category: "primary_consultation",
    subtotal: "5000.00",
    total_price: "5000.00",
    platform_fee: "500.00",
    mentor_payout_amount: "4500.00",
    payment_status: "unpaid",
    order_status: "pending_payment",
    payment_instructions: null,
    conversation_id: null,
    installment_number: null,
    engagement_duration_months: null,
    engagement_status: null,
    due_at: null,
    completed_at: null,
    created_at: "2026-07-01T10:00:00Z",
    updated_at: "2026-07-01T10:00:00Z",
    ...overrides,
  }
}

function makeMentorCard(overrides: Partial<MentorCard> = {}): MentorCard {
  return {
    id: 3,
    profile_photo: null,
    full_name: "Данияр Сериков",
    countries: [],
    languages: [],
    school_or_university: "MIT",
    grant_or_scholarship: "",
    major: "CS",
    expertise_areas: [],
    detailed_bio: "",
    is_accepting_bookings: true,
    is_universal: false,
    rating_avg: null,
    rating_count: 0,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe("OrdersPage — student view", () => {
  beforeEach(() => {
    localStorage.setItem("role", "student")
  })

  it("shows an empty state with a link to find a mentor", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([])

    render(<OrdersPage />)

    expect(await screen.findByText("Заказов пока нет")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Найти ментора" })).toHaveAttribute("href", "/mentors")
  })

  it("renders a flat list of orders with mentor name and status", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([makeOrder()])
    vi.mocked(fetchMentors).mockResolvedValue([makeMentorCard()])

    render(<OrdersPage />)

    expect(await screen.findByText("Первичная консультация")).toBeInTheDocument()
    expect(screen.getByText("Данияр Сериков")).toBeInTheDocument()
    expect(screen.getByText("Ожидает оплаты")).toBeInTheDocument()
    expect(screen.getByText("5 000 ₸", { exact: false })).toBeInTheDocument()
  })

  it("tags an overdue pending-payment order", async () => {
    const overdueOrder = makeOrder({
      installment_number: 2,
      due_at: "2020-01-01T00:00:00Z",
    })
    vi.mocked(fetchOrders).mockResolvedValue([overdueOrder])
    vi.mocked(fetchMentors).mockResolvedValue([makeMentorCard()])

    render(<OrdersPage />)

    expect(await screen.findByText("Просрочено")).toBeInTheDocument()
  })

  it("tags a paused support engagement installment", async () => {
    const pausedOrder = makeOrder({
      installment_number: 2,
      engagement_status: "paused",
      due_at: "2026-06-01T00:00:00Z",
    })
    vi.mocked(fetchOrders).mockResolvedValue([pausedOrder])
    vi.mocked(fetchMentors).mockResolvedValue([makeMentorCard()])

    render(<OrdersPage />)

    expect(await screen.findByText("Приостановлено")).toBeInTheDocument()
  })
})

describe("OrdersPage — mentor view", () => {
  beforeEach(() => {
    localStorage.setItem("role", "mentor")
  })

  it("shows an empty state without the 'find a mentor' link", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([])

    render(<OrdersPage />)

    expect(await screen.findByText("Клиентов пока нет")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Найти ментора" })).not.toBeInTheDocument()
  })

  it("groups orders by client and expands to show the order list", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({ id: 1, student: 7, order_status: "in_progress" }),
      makeOrder({ id: 2, student: 7, service_title: "Проверка эссе", order_status: "completed" }),
    ])

    render(<OrdersPage />)

    const clientHeader = await screen.findByRole("button", { name: /Аружан/ })
    expect(screen.getByText("2 заказа")).toBeInTheDocument()
    // Active-count badge for the one still-in-progress order.
    expect(screen.getByText("1")).toBeInTheDocument()

    // Not expanded yet — individual order titles aren't shown.
    expect(screen.queryByText("Проверка эссе")).not.toBeInTheDocument()

    fireEvent.click(clientHeader)

    expect(await screen.findByText("Проверка эссе")).toBeInTheDocument()
    expect(screen.getByText("Первичная консультация")).toBeInTheDocument()
  })

  it("does not call fetchMentors for the mentor view", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([makeOrder()])

    render(<OrdersPage />)

    await waitFor(() => expect(fetchOrders).toHaveBeenCalled())
    expect(fetchMentors).not.toHaveBeenCalled()
  })
})
