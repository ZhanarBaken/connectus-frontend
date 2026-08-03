import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { useRouter } from "@/i18n/navigation"
import OrdersPage from "./page"
import {
  authFetch, fetchOrders, fetchMentors, fetchMentorServices, fetchEngagementDocuments, fetchStudentProfile,
  markChatRead,
} from "@/lib/api"
import { connectChat, fetchChatMessages } from "@/lib/chat"
import type { Order, MentorCard, MentorService, StudentProfile } from "@/types"

vi.mock("@/lib/api")
vi.mock("@/lib/chat")

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

function makeService(overrides: Partial<MentorService> = {}): MentorService {
  return {
    id: 10,
    title: "Сопровождение — поступление в 3 вуза",
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
  vi.mocked(markChatRead).mockResolvedValue(undefined)
  vi.mocked(fetchChatMessages).mockResolvedValue([])
  vi.mocked(connectChat).mockImplementation(() => ({ send: vi.fn(() => true), close: vi.fn() }))
  vi.mocked(fetchMentorServices).mockResolvedValue([])
  vi.mocked(fetchEngagementDocuments).mockResolvedValue([])
})

afterEach(() => {
  window.Telegram = undefined
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

  it("links the Chat button straight to the order page outside Telegram", async () => {
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({ id: 1, student: 7, conversation_id: 55 }),
    ])

    render(<OrdersPage />)

    const chatLink = await screen.findByRole("link", { name: /Чат/ })
    expect(chatLink).toHaveAttribute("href", "/orders/1")
  })

  describe("inside the Telegram Mini App", () => {
    beforeEach(() => {
      window.Telegram = {
        WebApp: { initData: "raw-init-data", ready: vi.fn() } as unknown as TelegramWebApp,
      }
    })

    it("opens the chat as a fullscreen overlay instead of navigating, when tapping Chat", async () => {
      vi.mocked(fetchOrders).mockResolvedValue([
        makeOrder({ id: 1, student: 7, conversation_id: 55 }),
      ])

      render(<OrdersPage />)

      // A button now, not a link — no navigation away from this page.
      expect(screen.queryByRole("link", { name: /Чат/ })).not.toBeInTheDocument()
      fireEvent.click(await screen.findByRole("button", { name: /Чат/ }))

      expect(await screen.findByRole("heading", { name: "Аружан", level: 1 })).toBeInTheDocument()
    })

    it("closes the overlay on back and returns to the client list", async () => {
      vi.mocked(fetchOrders).mockResolvedValue([
        makeOrder({ id: 1, student: 7, conversation_id: 55 }),
      ])

      render(<OrdersPage />)

      fireEvent.click(await screen.findByRole("button", { name: /Чат/ }))
      expect(await screen.findByRole("heading", { name: "Аружан", level: 1 })).toBeInTheDocument()

      fireEvent.click(screen.getByRole("button", { name: "Назад" }))

      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: "Аружан", level: 1 })).not.toBeInTheDocument(),
      )
      expect(screen.getByRole("button", { name: /Чат/ })).toBeInTheDocument()
    })

    it("does not show a Chat control for a client with no conversation yet", async () => {
      vi.mocked(fetchOrders).mockResolvedValue([
        makeOrder({ id: 1, student: 7, conversation_id: null }),
      ])

      render(<OrdersPage />)

      await screen.findByRole("button", { name: /Аружан/ })
      expect(screen.queryByRole("button", { name: /Чат/ })).not.toBeInTheDocument()
      expect(screen.queryByRole("link", { name: /Чат/ })).not.toBeInTheDocument()
    })

    it("shows the send-invoice and add-task controls in the chat overlay, same as the order page", async () => {
      vi.mocked(fetchMentorServices).mockResolvedValue([makeService()])
      vi.mocked(fetchOrders).mockResolvedValue([
        makeOrder({ id: 1, student: 7, conversation_id: 55, support_engagement: 9, engagement_status: "active" }),
      ])

      render(<OrdersPage />)

      fireEvent.click(await screen.findByRole("button", { name: /Чат/ }))

      expect(await screen.findByText("Отправить заявку")).toBeInTheDocument()
      expect(screen.getByText("Добавить задачу")).toBeInTheDocument()
    })

    it("hides add-task when the client has no support engagement yet", async () => {
      vi.mocked(fetchMentorServices).mockResolvedValue([makeService()])
      vi.mocked(fetchOrders).mockResolvedValue([
        makeOrder({ id: 1, student: 7, conversation_id: 55, support_engagement: null }),
      ])

      render(<OrdersPage />)

      fireEvent.click(await screen.findByRole("button", { name: /Чат/ }))

      expect(await screen.findByText("Отправить заявку")).toBeInTheDocument()
      expect(screen.queryByText("Добавить задачу")).not.toBeInTheDocument()
    })

    it("hides add-task when the client's only engagement has already ended, even though support_engagement is still set on that old order", async () => {
      // support_engagement stays non-null forever on an order — it's the
      // engagement's own status that says whether it's still live. A
      // client can have a past, cancelled engagement and no current one.
      vi.mocked(fetchMentorServices).mockResolvedValue([makeService()])
      vi.mocked(fetchOrders).mockResolvedValue([
        makeOrder({
          id: 1, student: 7, conversation_id: 55,
          support_engagement: 3, engagement_status: "cancelled",
        }),
      ])

      render(<OrdersPage />)

      fireEvent.click(await screen.findByRole("button", { name: /Чат/ }))

      expect(await screen.findByText("Отправить заявку")).toBeInTheDocument()
      expect(screen.queryByText("Добавить задачу")).not.toBeInTheDocument()
    })
  })
})
