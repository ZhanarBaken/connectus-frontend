import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "@/i18n/navigation"
import MentorDashboard from "./page"
import type { MentorProfile, MentorService, Order, SupportRequest, User } from "@/types"
import type { Review } from "@/lib/reviews"

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api")
  return {
    ...actual,
    fetchMentorProfile: vi.fn(),
    fetchMentorServices: vi.fn(),
    fetchOrders: vi.fn(),
    fetchMe: vi.fn(),
    clearAuth: vi.fn(),
    fetchPendingSupportRequests: vi.fn(),
    acceptSupportRequest: vi.fn(),
    declineSupportRequest: vi.fn(),
  }
})

vi.mock("@/lib/reviews", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reviews")>("@/lib/reviews")
  return {
    ...actual,
    fetchMentorReviews: vi.fn(),
  }
})

import {
  fetchMentorProfile,
  fetchMentorServices,
  fetchOrders,
  fetchMe,
  clearAuth,
  fetchPendingSupportRequests,
  acceptSupportRequest,
  declineSupportRequest,
} from "@/lib/api"
import { fetchMentorReviews } from "@/lib/reviews"

function makeMentorProfile(overrides: Partial<MentorProfile> = {}): MentorProfile {
  return {
    id: 1,
    full_name: "Айгерим Ержанова",
    age: 25,
    countries: [{ country: "US" }],
    languages: [],
    school_or_university: "Гарвард",
    major: "Computer Science",
    grant_or_scholarship: "Fulbright",
    gpa: "3.9",
    exam_results: "SAT 1500",
    detailed_bio: "Опытный ментор с 5-летним стажем.",
    linkedin_url: "",
    university_email: "",
    profile_photo: "https://example.com/photo.jpg",
    expertise_areas: [{ area: "admission" }],
    contacts: "",
    phone: "+7 700 000 0000",
    payout_details: "",
    graduation_year_or_current_course: "2020",
    is_approved: true,
    is_submitted: true,
    is_public: true,
    is_accepting_bookings: true,
    is_universal: false,
    is_banned: false,
    ban_reason: "",
    has_documents: true,
    rating_avg: 4.8,
    rating_count: 12,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    student: 10,
    student_info: {
      id: 10,
      full_name: "Данияр Сериков",
      current_school_or_university: "НИШ Алматы",
      profile_photo: null,
    },
    mentor: 1,
    mentor_service: 1,
    service_title: "Проверка эссе",
    payout_category: "delivery",
    subtotal: "20000",
    total_price: "20000",
    platform_fee: "5000",
    mentor_payout_amount: "15000",
    payment_status: "paid",
    order_status: "paid",
    payment_instructions: null,
    conversation_id: null,
    support_engagement: null,
    installment_number: null,
    engagement_duration_months: null,
    engagement_status: null,
    scheduled_at: null,
    due_at: null,
    completed_at: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  }
}

function makeSupportRequest(overrides: Partial<SupportRequest> = {}): SupportRequest {
  return {
    id: 1,
    student: 10,
    student_name: "Данияр Сериков",
    mentor_service: 1,
    service_title: "Полное сопровождение",
    status: "pending",
    created_at: "2026-07-01T00:00:00Z",
    responded_at: null,
    ...overrides,
  }
}

function makeService(overrides: Partial<MentorService> = {}): MentorService {
  return {
    id: 1,
    title: "Первичная консультация",
    description: "",
    price: "5000",
    currency: "KZT",
    duration_minutes: 30,
    payout_category: "primary_consultation",
    grade_min: null,
    grade_max: null,
    meetings_min: null,
    meetings_max: null,
    duration_months_min: null,
    duration_months_max: null,
    is_price_negotiable: false,
    intro_call_enabled: true,
    is_active: true,
    ...overrides,
  }
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: "mentor@example.com",
    role: "mentor",
    email_verified: true,
    has_telegram: true,
    telegram_username: "mentoruser",
    has_google: false,
    google_email_at_signup: null,
    has_password: true,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 1,
    mentor: 1,
    order: 1,
    rating: 5,
    text: "Отличный ментор, помог поступить!",
    mentor_reply: null,
    mentor_reply_at: null,
    student_full_name: "Данияр С.",
    created_at: "2026-07-01T00:00:00Z",
    ...overrides,
  }
}

function mockRouter() {
  const replace = vi.fn()
  const push = vi.fn()
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as ReturnType<typeof useRouter>)
  return { replace, push }
}

describe("MentorDashboard", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(fetchMe).mockResolvedValue(makeUser())
    vi.mocked(fetchMentorReviews).mockResolvedValue([])
    vi.mocked(fetchPendingSupportRequests).mockResolvedValue([])
  })

  it("redirects to /auth/login when there is no access token", async () => {
    const { replace } = mockRouter()
    render(<MentorDashboard />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"))
    expect(fetchMentorProfile).not.toHaveBeenCalled()
  })

  it("redirects to /student/dashboard when role is student", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "student")
    const { replace } = mockRouter()
    render(<MentorDashboard />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/student/dashboard"))
    expect(fetchMentorProfile).not.toHaveBeenCalled()
  })

  it("clears auth and redirects to login if loading profile fails", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    vi.mocked(fetchMentorProfile).mockRejectedValue(new Error("boom"))
    vi.mocked(fetchMentorServices).mockResolvedValue([])
    vi.mocked(fetchOrders).mockResolvedValue([])
    render(<MentorDashboard />)
    await waitFor(() => expect(clearAuth).toHaveBeenCalled())
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"))
  })

  it("redirects a not-yet-submitted mentor to the onboarding wizard (useMentorOnboardingGate)", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      makeMentorProfile({ is_submitted: false, is_approved: false }),
    )
    vi.mocked(fetchMentorServices).mockResolvedValue([])
    vi.mocked(fetchOrders).mockResolvedValue([])
    render(<MentorDashboard />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/mentor"))
  })

  describe("authenticated mentor", () => {
    beforeEach(() => {
      localStorage.setItem("access_token", "fake-token")
      localStorage.setItem("role", "mentor")
      mockRouter()
    })

    it("renders mentor profile info once loaded", async () => {
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([])

      render(<MentorDashboard />)

      expect(await screen.findByText("Айгерим Ержанова")).toBeInTheDocument()
      expect(screen.getByText("Верифицирован")).toBeInTheDocument()
    })

    it("does not render the support-requests card when there are none pending", async () => {
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([])
      vi.mocked(fetchPendingSupportRequests).mockResolvedValue([])

      render(<MentorDashboard />)

      await screen.findByText("Пока нет заказов")
      expect(screen.queryByText("Новые запросы")).not.toBeInTheDocument()
    })

    it("renders pending support requests with accept/decline actions", async () => {
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([])
      vi.mocked(fetchPendingSupportRequests).mockResolvedValue([makeSupportRequest()])

      render(<MentorDashboard />)

      expect(await screen.findByText("Новые запросы")).toBeInTheDocument()
      expect(screen.getByText("Полное сопровождение")).toBeInTheDocument()
      expect(screen.getByText("Данияр Сериков")).toBeInTheDocument()
    })

    it("accepting a request calls the API and removes it from the list", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([])
      const request = makeSupportRequest()
      vi.mocked(fetchPendingSupportRequests).mockResolvedValue([request])
      vi.mocked(acceptSupportRequest).mockResolvedValue({ ...request, status: "accepted" })

      render(<MentorDashboard />)

      await screen.findByText("Новые запросы")
      await user.click(screen.getByText("Принять"))

      await waitFor(() => expect(acceptSupportRequest).toHaveBeenCalledWith(1))
      await waitFor(() => expect(screen.queryByText("Новые запросы")).not.toBeInTheDocument())
    })

    it("declining a request calls the API and removes it from the list", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([])
      const request = makeSupportRequest()
      vi.mocked(fetchPendingSupportRequests).mockResolvedValue([request])
      vi.mocked(declineSupportRequest).mockResolvedValue({ ...request, status: "declined" })

      render(<MentorDashboard />)

      await screen.findByText("Новые запросы")
      await user.click(screen.getByText("Отклонить"))

      await waitFor(() => expect(declineSupportRequest).toHaveBeenCalledWith(1))
      await waitFor(() => expect(screen.queryByText("Новые запросы")).not.toBeInTheDocument())
    })

    it("shows a retryable error instead of silently hiding the queue when loading support requests fails", async () => {
      // Regression: fetchPendingSupportRequests().catch(() => {}) meant a
      // failed fetch looked identical to "no pending requests" — the whole
      // section just never appeared.
      const user = userEvent.setup()
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([])
      vi.mocked(fetchPendingSupportRequests).mockRejectedValueOnce(new Error("network"))

      render(<MentorDashboard />)

      expect(await screen.findByText("Не удалось загрузить новые запросы")).toBeInTheDocument()
      expect(screen.queryByText("Новые запросы")).not.toBeInTheDocument()

      vi.mocked(fetchPendingSupportRequests).mockResolvedValueOnce([makeSupportRequest()])
      await user.click(screen.getByText("Повторить"))

      await waitFor(() => expect(screen.getByText("Новые запросы")).toBeInTheDocument())
    })

    it("shows an inline error when accepting a request fails", async () => {
      // Regression: handleAcceptRequest's catch was empty — a failed accept
      // silently left the request in the list with no feedback at all.
      const user = userEvent.setup()
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([])
      const request = makeSupportRequest()
      vi.mocked(fetchPendingSupportRequests).mockResolvedValue([request])
      vi.mocked(acceptSupportRequest).mockRejectedValueOnce(new Error("Не удалось выполнить действие с запросом"))

      render(<MentorDashboard />)

      await screen.findByText("Новые запросы")
      await user.click(screen.getByText("Принять"))

      await waitFor(() => {
        expect(screen.getByText("Не удалось выполнить действие с запросом")).toBeInTheDocument()
      })
      expect(screen.getByText("Новые запросы")).toBeInTheDocument()
    })

    it("shows the empty orders state when there are no orders", async () => {
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([])

      render(<MentorDashboard />)

      expect(await screen.findByText("Пока нет заказов")).toBeInTheDocument()
      expect(screen.getByText("0 всего")).toBeInTheDocument()
    })

    it("does NOT render a consultation-requests block, even for a draft order — dead code stays dead", async () => {
      const draftOrder = makeOrder({
        id: 99,
        order_status: "draft",
        service_title: "Первичная консультация — заявка",
      })
      const paidOrder = makeOrder({ id: 2, order_status: "paid", service_title: "Проверка эссе" })
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([draftOrder, paidOrder])

      render(<MentorDashboard />)

      // The dead "Запросы на консультацию" block (and its accept-order
      // flow) was removed because backend can no longer create draft
      // orders. It must never reappear, even when a draft order is
      // present in the fixture data.
      await screen.findByText("Проверка эссе")
      expect(screen.queryByText(/Запросы на консультацию/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Принять/)).not.toBeInTheDocument()

      // The unified "Заказы" list shows every order regardless of
      // status, and the counter reflects the full unsplit list.
      expect(screen.getByText("2 всего")).toBeInTheDocument()
      expect(screen.getByText("Первичная консультация — заявка")).toBeInTheDocument()
      expect(screen.getByText("Проверка эссе")).toBeInTheDocument()
      // The draft order still renders with its status label from
      // ORDER_STATUS_LABELS ("Запрос"), it's just not split into a
      // separate section.
      expect(screen.getByText("Запрос")).toBeInTheDocument()
    })

    it("renders reviews when present and the empty state when absent", async () => {
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([])
      vi.mocked(fetchMentorReviews).mockResolvedValue([makeReview()])

      render(<MentorDashboard />)

      expect(await screen.findByText(/Отличный ментор, помог поступить!/)).toBeInTheDocument()
    })

    it("shows the reviews empty state when there are none", async () => {
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([])
      vi.mocked(fetchMentorReviews).mockResolvedValue([])

      render(<MentorDashboard />)

      expect(await screen.findByText(/Отзывы появятся после того как абитуриенты завершат заказы/)).toBeInTheDocument()
    })

    it("renders services list with prices", async () => {
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([makeService()])
      vi.mocked(fetchOrders).mockResolvedValue([])

      render(<MentorDashboard />)

      expect(await screen.findByText("Первичная консультация")).toBeInTheDocument()
      expect(screen.getByText("5 000 ₸")).toBeInTheDocument()
    })

    it("shows 'Договорная' instead of 0 ₸ for a negotiable-price service", async () => {
      // Regression: price is null when is_price_negotiable is true
      // (backend masks the stored value) — Number(null) is 0, which
      // used to render as a literal "0 ₸".
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([
        makeService({ price: null, is_price_negotiable: true }),
      ])
      vi.mocked(fetchOrders).mockResolvedValue([])

      render(<MentorDashboard />)

      expect(await screen.findByText("Первичная консультация")).toBeInTheDocument()
      expect(screen.getByText("Договорная")).toBeInTheDocument()
      expect(screen.queryByText("0 ₸")).not.toBeInTheDocument()
    })

    it("computes total earned only from completed orders", async () => {
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([
        makeOrder({ id: 1, order_status: "completed", mentor_payout_amount: "10000" }),
        makeOrder({ id: 2, order_status: "completed", mentor_payout_amount: "5000" }),
        makeOrder({ id: 3, order_status: "paid", mentor_payout_amount: "999999" }),
      ])

      render(<MentorDashboard />)

      await screen.findByText("3 всего")
      expect(screen.getByText(/15\s000/)).toBeInTheDocument()
    })

    it("shows the under-review banner (with the 24-hour reassurance) for a submitted-but-not-approved profile", async () => {
      // Regression: the page used to also render its own duplicate
      // "Профиль на проверке" banner without the 24-hour copy,
      // alongside <MentorStatusBanner> — now MentorStatusBanner is the
      // only one, and it's the version with the 24-hour text.
      vi.mocked(fetchMentorProfile).mockResolvedValue(
        makeMentorProfile({ is_submitted: true, is_approved: false }),
      )
      vi.mocked(fetchMentorServices).mockResolvedValue([])
      vi.mocked(fetchOrders).mockResolvedValue([])

      render(<MentorDashboard />)

      expect(await screen.findByText(/24 часов/)).toBeInTheDocument()
    })
  })
})
