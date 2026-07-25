import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "next/navigation"
import StudentDashboard from "./page"
import type { MentorCard, Order, StudentProfile } from "@/types"

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api")
  return {
    ...actual,
    fetchStudentProfile: vi.fn(),
    fetchOrders: vi.fn(),
    fetchMentors: vi.fn(),
    clearAuth: vi.fn(),
  }
})

import { fetchStudentProfile, fetchOrders, fetchMentors, clearAuth } from "@/lib/api"

function makeStudentProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    id: 1,
    full_name: "Данияр Сериков",
    date_of_birth: null,
    age: 17,
    current_school_or_university: "НИШ Алматы",
    contacts: "",
    school_grade: "11 класс",
    city: "Алматы",
    school_graduation_year: 2026,
    desired_major: "",
    desired_countries: "",
    exam_results: "",
    gpa: "",
    profile_photo: null,
    is_public: true,
    welcome_bonus_available: false,
    welcome_bonus_expires_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    student: 1,
    student_info: { id: 1, full_name: "Данияр Сериков", current_school_or_university: "НИШ", profile_photo: null },
    mentor: 5,
    mentor_service: 1,
    service_title: "Проверка эссе",
    payout_category: "delivery",
    subtotal: "20000",
    bonus_applied: "0",
    total_price: "20000",
    platform_fee: "5000",
    mentor_payout_amount: "15000",
    payment_status: "paid",
    order_status: "paid",
    payment_instructions: null,
    conversation_id: null,
    installment_number: null,
    engagement_duration_months: null,
    engagement_status: null,
    due_at: null,
    completed_at: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  }
}

function makeMentorCard(overrides: Partial<MentorCard> = {}): MentorCard {
  return {
    id: 5,
    profile_photo: null,
    full_name: "Айгерим Ержанова",
    countries: [],
    languages: [],
    school_or_university: "",
    grant_or_scholarship: "",
    major: "",
    expertise_areas: [],
    detailed_bio: "",
    is_accepting_bookings: true,
    is_universal: false,
    rating_avg: null,
    rating_count: 0,
    ...overrides,
  }
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

describe("StudentDashboard", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("redirects to /auth/login when there is no access token", async () => {
    const { replace } = mockRouter()
    render(<StudentDashboard />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"))
    expect(fetchStudentProfile).not.toHaveBeenCalled()
  })

  it("redirects to /mentor/dashboard when role is mentor", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    render(<StudentDashboard />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/mentor/dashboard"))
    expect(fetchStudentProfile).not.toHaveBeenCalled()
  })

  it("clears auth and redirects to login if loading data fails", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "student")
    const { replace } = mockRouter()
    vi.mocked(fetchStudentProfile).mockRejectedValue(new Error("boom"))
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentors).mockResolvedValue([])
    render(<StudentDashboard />)
    await waitFor(() => expect(clearAuth).toHaveBeenCalled())
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"))
  })

  describe("authenticated student", () => {
    beforeEach(() => {
      localStorage.setItem("access_token", "fake-token")
      localStorage.setItem("role", "student")
      mockRouter()
    })

    it("greets the student by first name", async () => {
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())
      vi.mocked(fetchOrders).mockResolvedValue([])
      vi.mocked(fetchMentors).mockResolvedValue([])

      render(<StudentDashboard />)

      expect(await screen.findByText(/Привет, Данияр/)).toBeInTheDocument()
    })

    it("shows the empty orders state with a link to find a mentor", async () => {
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())
      vi.mocked(fetchOrders).mockResolvedValue([])
      vi.mocked(fetchMentors).mockResolvedValue([])

      render(<StudentDashboard />)

      expect(await screen.findByText("Пока нет заказов")).toBeInTheDocument()
      const findMentorLinks = screen.getAllByRole("link", { name: /Найти ментора/ })
      expect(findMentorLinks.length).toBeGreaterThan(0)
      for (const link of findMentorLinks) {
        expect(link).toHaveAttribute("href", "/mentors")
      }
    })

    it("renders orders with the mentor's name resolved from the mentors list", async () => {
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())
      vi.mocked(fetchOrders).mockResolvedValue([makeOrder()])
      vi.mocked(fetchMentors).mockResolvedValue([makeMentorCard()])

      render(<StudentDashboard />)

      expect(await screen.findByText("Проверка эссе")).toBeInTheDocument()
      expect(screen.getByText("Айгерим Ержанова")).toBeInTheDocument()
      expect(screen.getByText("Оплачен")).toBeInTheDocument()
    })

    it("falls back to a generic label when the mentor lookup fails", async () => {
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())
      vi.mocked(fetchOrders).mockResolvedValue([makeOrder()])
      vi.mocked(fetchMentors).mockRejectedValue(new Error("network error"))

      render(<StudentDashboard />)

      expect(await screen.findByText("Проверка эссе")).toBeInTheDocument()
      expect(screen.getByText("Ментор")).toBeInTheDocument()
    })

    it("splits stats correctly across active / pending / completed orders", async () => {
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())
      vi.mocked(fetchOrders).mockResolvedValue([
        makeOrder({ id: 1, order_status: "paid" }),
        makeOrder({ id: 2, order_status: "in_progress" }),
        makeOrder({ id: 3, order_status: "pending_payment" }),
        makeOrder({ id: 4, order_status: "completed" }),
        makeOrder({ id: 5, order_status: "completed" }),
      ])
      vi.mocked(fetchMentors).mockResolvedValue([])

      render(<StudentDashboard />)

      await screen.findByText("5 всего")
      const stats = screen.getAllByText(/^[0-9]+$/)
      const values = stats.map((el) => el.textContent)
      expect(values).toEqual(["2", "1", "2"])
    })

    it("shows the welcome bonus banner when available", async () => {
      vi.mocked(fetchStudentProfile).mockResolvedValue(
        makeStudentProfile({
          welcome_bonus_available: true,
          welcome_bonus_expires_at: "2026-08-20T00:00:00Z",
        }),
      )
      vi.mocked(fetchOrders).mockResolvedValue([])
      vi.mocked(fetchMentors).mockResolvedValue([])

      render(<StudentDashboard />)

      expect(await screen.findByText(/−50% на первичные консультации/)).toBeInTheDocument()
      expect(screen.getByText(/Сгорает 20 августа/)).toBeInTheDocument()
    })

    it("does not show the welcome bonus banner when unavailable", async () => {
      vi.mocked(fetchStudentProfile).mockResolvedValue(
        makeStudentProfile({ welcome_bonus_available: false }),
      )
      vi.mocked(fetchOrders).mockResolvedValue([])
      vi.mocked(fetchMentors).mockResolvedValue([])

      render(<StudentDashboard />)

      await screen.findByText("Пока нет заказов")
      expect(screen.queryByText(/−50% на первичные консультации/)).not.toBeInTheDocument()
    })
  })
})
