import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react"
import { useRouter } from "next/navigation"
import MentorPage from "./page"
import {
  fetchMentor,
  createOrder,
  fetchOrders,
  fetchStudentProfile,
  fetchPublicSettings,
  fetchMentorAvailability,
  fetchMentorAvailabilityOverview,
} from "@/lib/api"
import { fetchMentorReviews } from "@/lib/reviews"
import type { Mentor, MentorService, Order, StudentProfile } from "@/types"
import type { PublicSettings } from "@/lib/api"

vi.mock("@/lib/api")
vi.mock("@/lib/reviews")

function makeMentor(overrides: Partial<Mentor> = {}): Mentor {
  return {
    id: 3,
    full_name: "Данияр Сериков",
    countries: [],
    languages: [],
    school_or_university: "MIT",
    major: "CS",
    grant_or_scholarship: "",
    gpa: "",
    exam_results: "",
    expertise_areas: [],
    detailed_bio: "",
    linkedin_url: "",
    profile_photo: null,
    is_public: true,
    is_accepting_bookings: true,
    is_universal: false,
    rating_avg: null,
    rating_count: 0,
    services: [],
    ...overrides,
  }
}

function makeService(overrides: Partial<MentorService> = {}): MentorService {
  return {
    id: 20,
    title: "Сопровождение — поступление в вуз",
    description: "",
    price: "500000",
    currency: "KZT",
    duration_minutes: 60,
    payout_category: "support",
    grade_min: null,
    grade_max: null,
    meetings_min: 4,
    meetings_max: 8,
    duration_months_min: 6,
    duration_months_max: 12,
    is_price_negotiable: false,
    intro_call_enabled: true,
    is_active: true,
    ...overrides,
  }
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    student: 7,
    student_info: { id: 7, full_name: "Аружан", current_school_or_university: "", profile_photo: null },
    mentor: 3,
    mentor_service: 20,
    service_title: "Сопровождение",
    payout_category: "support",
    subtotal: "0.00",
    bonus_applied: "0.00",
    total_price: "0.00",
    platform_fee: "0.00",
    mentor_payout_amount: "0.00",
    payment_status: "unpaid",
    order_status: "in_progress",
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

function makePublicSettings(overrides: Partial<PublicSettings> = {}): PublicSettings {
  return {
    dispute_window_hours: 48,
    support_url: "",
    terms_text: "",
    platform_rules_text: "",
    data_consent_text: "",
    privacy_policy_text: "",
    support_intro_call_duration_minutes: 15,
    ...overrides,
  }
}

// React 19's `use()` suspends until the passed promise settles, and the
// retry only lands if the test explicitly awaits that same promise
// inside an `act()`. See app/orders/[id]/page.test.tsx for the same
// pattern with more detail.
async function renderMentorPage(id: string) {
  const paramsPromise = Promise.resolve({ id })
  let utils!: ReturnType<typeof render>
  await act(async () => {
    utils = render(<MentorPage params={paramsPromise} />)
  })
  await act(async () => {
    await paramsPromise
  })
  return utils
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem("access_token", "fake-token")
  vi.mocked(fetchMentorReviews).mockResolvedValue([])
  vi.mocked(fetchStudentProfile).mockRejectedValue(new Error("403"))
  vi.mocked(fetchPublicSettings).mockResolvedValue(makePublicSettings())
  vi.mocked(fetchMentorAvailabilityOverview).mockResolvedValue({
    timezone: "Asia/Almaty", duration_minutes: 60, dates: {},
  })
  vi.mocked(fetchMentorAvailability).mockResolvedValue({
    date: "2026-08-01", timezone: "Asia/Almaty", duration_minutes: 60, slots: ["11:00"],
  })
})

describe("MentorPage — auth gate", () => {
  it("redirects to login with a `next` param when there is no access token", async () => {
    localStorage.clear()
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    await renderMentorPage("3")

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login?next=/mentors/3"))
    expect(fetchMentor).not.toHaveBeenCalled()
  })
})

describe("MentorPage — basic rendering", () => {
  it("renders the mentor's name and university once loaded", async () => {
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())
    vi.mocked(fetchOrders).mockResolvedValue([])

    await renderMentorPage("3")

    expect(await screen.findByRole("heading", { name: "Данияр Сериков" })).toBeInTheDocument()
    expect(screen.getByText("MIT", { exact: false })).toBeInTheDocument()
  })
})

// ─── Regression #3: intro-call badge must not misfire for a session order
// under a (possibly paused) support engagement ───────────────────────────

describe("MentorPage — intro-call badge vs. support-engagement session order", () => {
  it("shows the intro-call-booked badge for a genuine standalone intro-call order", async () => {
    const service = makeService()
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor({ services: [service] }))
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({
        mentor_service: service.id,
        installment_number: null,
        engagement_status: null,
        order_status: "in_progress",
      }),
    ])

    await renderMentorPage("3")

    expect(await screen.findByText("Intro-call забронирован")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Забронировать intro-call" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Забронировать сессию" })).not.toBeInTheDocument()
  })

  it("does not show the intro-call badge for a session order under a paused engagement", async () => {
    const service = makeService()
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor({ services: [service] }))
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({
        mentor_service: service.id,
        installment_number: null,
        engagement_status: "paused",
        order_status: "pending_payment",
      }),
    ])

    await renderMentorPage("3")

    await screen.findByText(service.title)
    // This is the exact regression: a session order tied to a (paused)
    // support engagement must never be mistaken for a booked intro-call,
    // even though both share installment_number === null.
    expect(screen.queryByText("Intro-call забронирован")).not.toBeInTheDocument()
    // Paused (not active) — "book a session" must not show either.
    expect(screen.queryByRole("button", { name: "Забронировать сессию" })).not.toBeInTheDocument()
    // No genuine intro-call order exists yet (the only order here belongs
    // to the engagement), so the page correctly still offers to book one.
    expect(screen.getByRole("button", { name: "Забронировать intro-call" })).toBeInTheDocument()
  })

  it("shows the 'book a session' button only when the engagement is active", async () => {
    const service = makeService()
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor({ services: [service] }))
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({
        mentor_service: service.id,
        installment_number: 1,
        engagement_status: "active",
        order_status: "paid",
      }),
    ])

    await renderMentorPage("3")

    expect(await screen.findByRole("button", { name: "Забронировать сессию" })).toBeInTheDocument()
  })

  it("offers a fresh intro-call booking button when no order exists yet", async () => {
    const service = makeService()
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor({ services: [service] }))
    vi.mocked(fetchOrders).mockResolvedValue([])

    await renderMentorPage("3")

    expect(await screen.findByRole("button", { name: "Забронировать intro-call" })).toBeInTheDocument()
  })
})

// ─── Regression #4: a failed booking triggers a fetchOrders refetch ────────

describe("MentorPage — booking failure self-heals stale buttons", () => {
  it("refetches orders after createOrder rejects inside the booking modal", async () => {
    const service = makeService({ payout_category: "delivery", price: "20000" })
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor({ services: [service] }))
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(createOrder).mockRejectedValue(new Error("Slot no longer available"))

    await renderMentorPage("3")

    const bookButton = await screen.findByRole("button", { name: "Записаться" })
    fireEvent.click(bookButton)

    // Navigate to a future month so every visible day cell is bookable
    // (today/past dates are disabled by BookingCalendar).
    const nextMonthButton = await screen.findByRole("button", { name: "Следующий месяц" })
    fireEvent.click(nextMonthButton)

    const dayButtons = await waitFor(() => {
      const candidates = screen.getAllByRole("button").filter(
        (btn) => /^\d{1,2}$/.test(btn.textContent?.trim() ?? "") && !btn.hasAttribute("disabled"),
      )
      expect(candidates.length).toBeGreaterThan(0)
      return candidates
    })
    fireEvent.click(dayButtons[0])

    const slotButton = await screen.findByRole("button", { name: "11:00" })
    fireEvent.click(slotButton)

    const confirmButton = await screen.findByRole("button", { name: "Записаться на 11:00" })

    expect(fetchOrders).toHaveBeenCalledTimes(1)

    fireEvent.click(confirmButton)

    await waitFor(() => expect(createOrder).toHaveBeenCalled())
    await waitFor(() => expect(fetchOrders).toHaveBeenCalledTimes(2))
  })
})

// ─── Regression #5: intro-call duration comes from backend settings ────────

describe("MentorPage — intro-call duration from backend settings", () => {
  it("uses the fetched duration instead of the hardcoded default", async () => {
    const service = makeService()
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor({ services: [service] }))
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchPublicSettings).mockResolvedValue(makePublicSettings({
      support_intro_call_duration_minutes: 20,
    }))

    await renderMentorPage("3")

    expect(await screen.findByText("Intro-call 20 мин бесплатно")).toBeInTheDocument()

    const bookButton = screen.getByRole("button", { name: "Забронировать intro-call" })
    fireEvent.click(bookButton)

    expect(await screen.findByText("20 мин · бесплатно")).toBeInTheDocument()
  })

  it("falls back to the 15-minute default while settings are pending / on failure", async () => {
    const service = makeService()
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor({ services: [service] }))
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchPublicSettings).mockRejectedValue(new Error("network error"))

    await renderMentorPage("3")

    expect(await screen.findByText("Intro-call 15 мин бесплатно")).toBeInTheDocument()
  })
})

describe("MentorPage — consultation ordering", () => {
  it("orders a free/paid consultation and navigates to the created order", async () => {
    const consultation = makeService({
      id: 30,
      title: "Первичная консультация",
      payout_category: "primary_consultation",
      price: "5000",
    })
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor({ services: [consultation] }))
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(createOrder).mockResolvedValue(makeOrder({ id: 99, mentor_service: 30 }))
    const push = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    await renderMentorPage("3")

    const orderButton = await screen.findByRole("button", { name: /Заказать консультацию за/ })
    fireEvent.click(orderButton)

    // Consultations without an available-slots grid still route through
    // the calendar modal — pick a day + time like the paid-service flow.
    const nextMonthButton = await screen.findByRole("button", { name: "Следующий месяц" })
    fireEvent.click(nextMonthButton)
    const dayButtons = await waitFor(() => {
      const candidates = screen.getAllByRole("button").filter(
        (btn) => /^\d{1,2}$/.test(btn.textContent?.trim() ?? "") && !btn.hasAttribute("disabled"),
      )
      expect(candidates.length).toBeGreaterThan(0)
      return candidates
    })
    fireEvent.click(dayButtons[0])
    const slotButton = await screen.findByRole("button", { name: "11:00" })
    fireEvent.click(slotButton)
    const confirmButton = await screen.findByRole("button", { name: "Записаться на 11:00" })
    fireEvent.click(confirmButton)

    await waitFor(() => expect(createOrder).toHaveBeenCalledWith(30, expect.stringContaining("T11:00:00+05:00")))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/orders/99"))
  })
})

describe("MentorPage — welcome bonus discount", () => {
  function makeStudentProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
    return {
      id: 7,
      full_name: "Аружан",
      date_of_birth: null,
      age: null,
      current_school_or_university: "",
      contacts: "",
      school_grade: "",
      city: "",
      school_graduation_year: null,
      desired_major: "",
      desired_countries: "",
      exam_results: "",
      gpa: "",
      profile_photo: null,
      is_public: true,
      welcome_bonus_available: true,
      welcome_bonus_expires_at: "2026-08-15T00:00:00Z",
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
      ...overrides,
    }
  }

  it("shows the halved price when the student has an active welcome bonus", async () => {
    const consultation = makeService({
      id: 30,
      title: "Первичная консультация",
      payout_category: "primary_consultation",
      price: "5000",
    })
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor({ services: [consultation] }))
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())

    await renderMentorPage("3")

    // toLocaleString("ru-RU") separates thousands with a non-breaking
    // space (U+00A0) — match it with \s rather than a literal space.
    expect(await screen.findByRole("button", { name: /Заказать за 2\s500\s₸/ })).toBeInTheDocument()
  })

  it("shows the full price when there is no welcome bonus (e.g. mentor viewing)", async () => {
    const consultation = makeService({
      id: 30,
      title: "Первичная консультация",
      payout_category: "primary_consultation",
      price: "5000",
    })
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor({ services: [consultation] }))
    vi.mocked(fetchOrders).mockResolvedValue([])
    // fetchStudentProfile rejects (403) by default beforeEach setup.

    await renderMentorPage("3")

    expect(await screen.findByRole("button", { name: /Заказать консультацию за 5\s000\s₸/ })).toBeInTheDocument()
  })
})

describe("MentorPage — reviews", () => {
  it("shows an empty state when there are no reviews", async () => {
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorReviews).mockResolvedValue([])

    await renderMentorPage("3")

    expect(await screen.findByText("У этого ментора пока нет отзывов")).toBeInTheDocument()
  })

  it("renders a list of reviews", async () => {
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorReviews).mockResolvedValue([
      {
        id: 1, mentor: 3, order: 1, rating: 5, text: "Отличный ментор!",
        mentor_reply: null, mentor_reply_at: null,
        student_full_name: "Аружан Е.", created_at: "2026-07-01T10:00:00Z",
      },
    ])

    await renderMentorPage("3")

    expect(await screen.findByText("“Отличный ментор!”")).toBeInTheDocument()
  })
})

describe("MentorPage — not found", () => {
  it("redirects to /mentors when fetchMentor fails", async () => {
    vi.mocked(fetchMentor).mockRejectedValue(new Error("404"))
    vi.mocked(fetchOrders).mockResolvedValue([])
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    await renderMentorPage("999")

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/mentors"))
  })
})
