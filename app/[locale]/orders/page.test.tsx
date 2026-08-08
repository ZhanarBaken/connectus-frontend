import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { useRouter } from "@/i18n/navigation"
import OrdersPage from "./page"
import { authFetch, fetchOrders, fetchMentors, fetchStudentProfile } from "@/lib/api"
import type { Order, MentorCard, StudentProfile } from "@/types"

vi.mock("@/lib/api")

function okJson(body: unknown): Response {
  return { ok: true, json: async () => body } as Response
}

function mockRouter() {
  const replace = vi.fn()
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as ReturnType<typeof useRouter>)
  return { replace }
}

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
    support_engagement: null,
    installment_number: null,
    engagement_duration_months: null,
    engagement_status: null,
    scheduled_at: null,
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
  vi.mocked(authFetch).mockResolvedValue(okJson({ id: 1, email: "mentor@test.com" }))
})

describe("OrdersPage — student view", () => {
  beforeEach(() => {
    localStorage.setItem("role", "student")
    // useStudentOnboardingGate's own fetch — default to "complete" so it
    // doesn't fire an unrelated redirect in tests that don't care about it.
    vi.mocked(fetchStudentProfile).mockResolvedValue({ is_profile_complete: true } as StudentProfile)
  })

  it("redirects a student with an incomplete profile to the onboarding wizard (useStudentOnboardingGate)", async () => {
    localStorage.setItem("access_token", "fake-token")
    const { replace } = mockRouter()
    vi.mocked(fetchStudentProfile).mockResolvedValue({ is_profile_complete: false } as StudentProfile)
    vi.mocked(fetchOrders).mockResolvedValue([])

    render(<OrdersPage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/student"))
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

  it("shows a retryable error when loading mentor names fails, without blocking the order list", async () => {
    // Regression: the fetchMentors() call was wrapped in a try/catch that
    // silently swallowed failures — orders still rendered, but with no
    // indication that mentor names/photos failed to load.
    vi.mocked(fetchOrders).mockResolvedValue([makeOrder()])
    vi.mocked(fetchMentors).mockRejectedValueOnce(new Error("network"))

    render(<OrdersPage />)

    expect(await screen.findByText("Первичная консультация")).toBeInTheDocument()
    expect(screen.getByText("Не удалось загрузить имена менторов")).toBeInTheDocument()

    vi.mocked(fetchMentors).mockResolvedValueOnce([makeMentorCard()])
    fireEvent.click(screen.getByText("Повторить"))

    await waitFor(() => expect(screen.getByText("Данияр Сериков")).toBeInTheDocument())
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

describe("OrdersPage — mentor redirect", () => {
  it("redirects a mentor straight to the unified client list instead of rendering this page", async () => {
    localStorage.setItem("role", "mentor")
    localStorage.setItem("access_token", "fake-token")
    const { replace } = mockRouter()

    render(<OrdersPage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/mentor/clients"))
    expect(fetchOrders).not.toHaveBeenCalled()
  })
})
