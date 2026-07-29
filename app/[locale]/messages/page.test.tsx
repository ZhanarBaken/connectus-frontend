import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { useRouter } from "@/i18n/navigation"
import MessagesPage from "./page"
import { fetchOrders, fetchMentors, clearAuth, fetchStudentProfile } from "@/lib/api"
import type { Order, MentorCard, StudentProfile } from "@/types"

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
    payment_status: "paid",
    order_status: "in_progress",
    payment_instructions: null,
    conversation_id: 55,
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
  // useStudentOnboardingGate's own fetch — default to "complete" so it
  // doesn't fire an unrelated redirect in tests that don't care about it.
  vi.mocked(fetchStudentProfile).mockResolvedValue({ is_profile_complete: true } as StudentProfile)
})

describe("MessagesPage — auth gate", () => {
  it("redirects to login with a `next` param when there is no access token", async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    render(<MessagesPage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login?next=/messages"))
    expect(fetchOrders).not.toHaveBeenCalled()
  })
})

describe("MessagesPage — student view", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "student")
  })

  it("redirects a student with an incomplete profile to the onboarding wizard (useStudentOnboardingGate)", async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })
    vi.mocked(fetchStudentProfile).mockResolvedValue({ is_profile_complete: false } as StudentProfile)
    vi.mocked(fetchOrders).mockResolvedValue([])

    render(<MessagesPage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/student"))
  })

  it("shows an empty state with a link to find a mentor", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([])

    render(<MessagesPage />)

    expect(await screen.findByText("Пока нет чатов")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Найти ментора" })).toHaveAttribute("href", "/mentors")
  })

  it("lists conversations with the mentor's name and order status", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([makeOrder()])
    vi.mocked(fetchMentors).mockResolvedValue([makeMentorCard()])

    render(<MessagesPage />)

    expect(await screen.findByText("Данияр Сериков")).toBeInTheDocument()
    expect(screen.getByText("Первичная консультация")).toBeInTheDocument()
    expect(screen.getByText("В работе")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Данияр Сериков/ })).toHaveAttribute("href", "/orders/1")
  })

  it("shows a retryable error when loading mentor names fails, without blocking the conversation list", async () => {
    // Regression: the fetchMentors() call was wrapped in a try/catch that
    // silently swallowed failures — conversations still rendered (with the
    // generic "Ментор" fallback), but with no indication anything failed.
    vi.mocked(fetchOrders).mockResolvedValue([makeOrder()])
    vi.mocked(fetchMentors).mockRejectedValueOnce(new Error("network"))

    render(<MessagesPage />)

    expect(await screen.findByText("Первичная консультация")).toBeInTheDocument()
    expect(screen.getByText("Не удалось загрузить имена и фото менторов")).toBeInTheDocument()

    vi.mocked(fetchMentors).mockResolvedValueOnce([makeMentorCard()])
    fireEvent.click(screen.getByText("Повторить"))

    await waitFor(() => expect(screen.getByText("Данияр Сериков")).toBeInTheDocument())
  })

  it("only shows orders that have an open conversation", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({ id: 1, conversation_id: null, service_title: "Без чата" }),
      makeOrder({ id: 2, conversation_id: 77, service_title: "С чатом" }),
    ])
    vi.mocked(fetchMentors).mockResolvedValue([makeMentorCard()])

    render(<MessagesPage />)

    expect(await screen.findByText("С чатом")).toBeInTheDocument()
    expect(screen.queryByText("Без чата")).not.toBeInTheDocument()
  })

  it("de-dupes multiple orders sharing the same conversation", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({ id: 1, conversation_id: 55, service_title: "Первая консультация" }),
      makeOrder({ id: 2, conversation_id: 55, service_title: "Вторая консультация" }),
    ])
    vi.mocked(fetchMentors).mockResolvedValue([makeMentorCard()])

    render(<MessagesPage />)

    await screen.findByText("Данияр Сериков")
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })

  it("clears auth and redirects to login when fetchOrders fails", async () => {
    vi.mocked(fetchOrders).mockRejectedValue(new Error("401"))
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    render(<MessagesPage />)

    await waitFor(() => expect(clearAuth).toHaveBeenCalled())
    expect(replace).toHaveBeenCalledWith("/auth/login")
  })
})

describe("MessagesPage — mentor view", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
  })

  it("shows an empty state without the 'find a mentor' link", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([])

    render(<MessagesPage />)

    expect(await screen.findByText("Пока нет чатов")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Найти ментора" })).not.toBeInTheDocument()
  })

  it("lists conversations by the student's name and does not call fetchMentors", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([makeOrder()])

    render(<MessagesPage />)

    expect(await screen.findByText("Аружан")).toBeInTheDocument()
    expect(fetchMentors).not.toHaveBeenCalled()
  })
})
