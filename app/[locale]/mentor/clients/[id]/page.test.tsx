import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "@/i18n/navigation"
import MentorClientWindowPage from "./page"
import type { MentorProfile, MentorService, Order, SupportTask } from "@/types"

vi.mock("@/lib/api")
vi.mock("@/lib/chat")

import {
  authFetch, fetchMentorClient, fetchMentorClientTasks, fetchMentorClientDocuments, fetchOrders,
  fetchMentorProfile, fetchMentorServices, fetchEngagementDocuments, markChatRead, updateSupportTask,
  type MentorClient, type MentorClientDocument,
} from "@/lib/api"
import { fetchChatMessages, connectChat, startConversationWithClient } from "@/lib/chat"

function okJson(body: unknown): Response {
  return { ok: true, json: async () => body } as Response
}

function makeClient(overrides: Partial<MentorClient> = {}): MentorClient {
  return {
    id: 9,
    full_name: "Асель Смагулова",
    current_school_or_university: "NIS",
    city: "Алматы",
    profile_photo: null,
    conversation_id: 55,
    engagement_id: 5,
    ...overrides,
  }
}

function makeMentorProfile(overrides: Partial<MentorProfile> = {}): MentorProfile {
  return {
    id: 1,
    full_name: "Айгерим Ержанова",
    age: 25,
    countries: [],
    languages: [],
    school_or_university: "",
    major: "",
    grant_or_scholarship: "",
    gpa: "",
    exam_results: "",
    detailed_bio: "",
    linkedin_url: "",
    university_email: "",
    profile_photo: null,
    expertise_areas: [],
    contacts: "",
    phone: "",
    payout_details: "",
    graduation_year_or_current_course: "",
    is_approved: true,
    is_submitted: true,
    is_public: true,
    is_accepting_bookings: true,
    is_universal: false,
    is_banned: false,
    ban_reason: "",
    has_documents: true,
    rating_avg: null,
    rating_count: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeTask(overrides: Partial<SupportTask> = {}): SupportTask {
  return {
    id: 1,
    engagement: 5,
    title: "Загрузи эссе на проверку",
    description: "",
    deadline: null,
    is_done: false,
    completed_at: null,
    created_at: "2026-07-01T10:00:00Z",
    updated_at: "2026-07-01T10:00:00Z",
    document: null,
    ...overrides,
  }
}

function makeDocument(overrides: Partial<MentorClientDocument> = {}): MentorClientDocument {
  return {
    id: 1,
    kind: "general",
    status: "pending",
    original_filename: "essay.pdf",
    content_type: "application/pdf",
    size_bytes: 2048,
    description: "",
    download_url: "https://example.com/essay.pdf",
    uploaded_by: 7,
    uploaded_by_email: "student@test.com",
    uploaded_at: "2026-07-01T10:00:00Z",
    order_id: 42,
    engagement_id: 5,
    ...overrides,
  }
}

function makeService(overrides: Partial<MentorService> = {}): MentorService {
  return {
    id: 10,
    title: "Сопровождение — поступление в 3 вуза",
    description: "",
    price: "500000",
    client_price: "500000",
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
    id: 42,
    student: 9,
    student_info: { id: 9, full_name: "Асель Смагулова", current_school_or_university: "NIS", profile_photo: null },
    mentor: 1,
    mentor_service: 10,
    service_title: "Сопровождение",
    payout_category: "support",
    subtotal: "500000.00",
    total_price: "500000.00",
    platform_fee: "50000.00",
    mentor_payout_amount: "450000.00",
    payment_status: "paid",
    order_status: "in_progress",
    payment_instructions: null,
    conversation_id: 55,
    support_engagement: 5,
    installment_number: 1,
    engagement_duration_months: 6,
    engagement_status: "active",
    scheduled_at: null,
    due_at: null,
    completed_at: null,
    created_at: "2026-07-01T10:00:00Z",
    updated_at: "2026-07-01T10:00:00Z",
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

async function renderClientWindow(id: string) {
  const paramsPromise = Promise.resolve({ id })
  let utils!: ReturnType<typeof render>
  await act(async () => {
    utils = render(<MentorClientWindowPage params={paramsPromise} />)
  })
  await act(async () => {
    await paramsPromise
  })
  return utils
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(authFetch).mockResolvedValue(okJson({ id: 1, email: "mentor@test.com" }))
  vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
  vi.mocked(fetchMentorServices).mockResolvedValue([])
  vi.mocked(fetchMentorClientTasks).mockResolvedValue([])
  vi.mocked(fetchMentorClientDocuments).mockResolvedValue([])
  vi.mocked(fetchOrders).mockResolvedValue([])
  vi.mocked(fetchEngagementDocuments).mockResolvedValue([])
  vi.mocked(markChatRead).mockResolvedValue(undefined)
  vi.mocked(fetchChatMessages).mockResolvedValue([])
  vi.mocked(connectChat).mockImplementation(() => ({ send: vi.fn(() => true), close: vi.fn() }))
})

describe("MentorClientWindowPage", () => {
  it("redirects to login when there is no access token", async () => {
    const { replace } = mockRouter()
    await renderClientWindow("9")
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login?next=/mentor/clients/9"))
  })

  describe("authenticated", () => {
    beforeEach(() => {
      localStorage.setItem("access_token", "fake-token")
      localStorage.setItem("role", "mentor")
      mockRouter()
    })

    it("shows the client's name and school/city", async () => {
      vi.mocked(fetchMentorClient).mockResolvedValue(makeClient())

      await renderClientWindow("9")

      expect(await screen.findByText("Асель Смагулова")).toBeInTheDocument()
      expect(screen.getByText("NIS · Алматы")).toBeInTheDocument()
    })

    it("shows the no-engagement hint and hides task creation when engagement_id is null", async () => {
      vi.mocked(fetchMentorClient).mockResolvedValue(makeClient({ engagement_id: null }))
      vi.mocked(fetchMentorServices).mockResolvedValue([makeService()])

      await renderClientWindow("9")

      expect(await screen.findByText("Сейчас нет активного сопровождения — показана история.")).toBeInTheDocument()
      expect(screen.queryByText("Добавить задачу")).not.toBeInTheDocument()
      // Invoice CTA stays available even with no active engagement.
      expect(screen.getByText("Отправить заявку")).toBeInTheDocument()
    })

    it("shows the add-task control when there is a live engagement", async () => {
      vi.mocked(fetchMentorClient).mockResolvedValue(makeClient({ engagement_id: 5 }))

      await renderClientWindow("9")

      expect(await screen.findByText("Добавить задачу")).toBeInTheDocument()
      expect(screen.queryByText("Сейчас нет активного сопровождения — показана история.")).not.toBeInTheDocument()
    })

    it("renders tasks from every engagement, marking only the current one editable", async () => {
      vi.mocked(fetchMentorClient).mockResolvedValue(makeClient({ engagement_id: 5 }))
      vi.mocked(fetchMentorClientTasks).mockResolvedValue([
        makeTask({ id: 1, engagement: 5, title: "Текущая задача" }),
        makeTask({ id: 2, engagement: 3, title: "Задача из прошлого" }),
      ])

      await renderClientWindow("9")

      const current = await screen.findByLabelText("Текущая задача")
      const past = screen.getByLabelText("Задача из прошлого")
      expect(current).not.toBeDisabled()
      expect(past).toBeDisabled()
    })

    it("lets the mentor change a task's deadline inline", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.setSystemTime(new Date("2026-07-15T12:00:00"))
      vi.mocked(fetchMentorClient).mockResolvedValue(makeClient({ engagement_id: 5 }))
      vi.mocked(fetchMentorClientTasks).mockResolvedValue([makeTask({ id: 1, engagement: 5 })])
      vi.mocked(updateSupportTask).mockResolvedValue(
        makeTask({ id: 1, engagement: 5, deadline: "2026-07-20" }),
      )

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      await renderClientWindow("9")

      await screen.findByText("Загрузи эссе на проверку")
      await user.click(screen.getByLabelText("Изменить дедлайн"))
      await user.click(await screen.findByRole("button", { name: "Дедлайн" }))
      const dayButtons = screen.getAllByRole("button", { name: "20" })
      await user.click(dayButtons.find((b) => !b.hasAttribute("disabled"))!)

      await waitFor(() =>
        expect(updateSupportTask).toHaveBeenCalledWith(5, 1, { deadline: "2026-07-20" }),
      )
      vi.useRealTimers()
    })

    it("renders documents with a link back to their order", async () => {
      vi.mocked(fetchMentorClient).mockResolvedValue(makeClient())
      vi.mocked(fetchMentorClientDocuments).mockResolvedValue([makeDocument()])

      await renderClientWindow("9")

      const filename = await screen.findByText("essay.pdf")
      expect(filename.closest("a")).toHaveAttribute("href", "https://example.com/essay.pdf")
    })

    it("shows empty states when there is no history yet", async () => {
      vi.mocked(fetchMentorClient).mockResolvedValue(makeClient({ engagement_id: null }))

      await renderClientWindow("9")

      expect(await screen.findByText("Пока нет задач")).toBeInTheDocument()
      expect(screen.getByText("Пока нет документов")).toBeInTheDocument()
      expect(screen.getByText("Пока не было заказов")).toBeInTheDocument()
    })

    it("renders the order/service history with status badges", async () => {
      vi.mocked(fetchMentorClient).mockResolvedValue(makeClient())
      vi.mocked(fetchOrders).mockResolvedValue([makeOrder()])

      await renderClientWindow("9")

      expect(await screen.findByText("Сопровождение")).toBeInTheDocument()
      expect(screen.getByText("В работе")).toBeInTheDocument()
    })

    it("starts a conversation automatically when the client has none yet", async () => {
      vi.mocked(fetchMentorClient).mockResolvedValue(makeClient({ conversation_id: null }))
      vi.mocked(startConversationWithClient).mockResolvedValue({
        id: 88, mentor: 1, student: 9, created_at: "2026-01-01T00:00:00Z",
        closed_at: null, is_active: true, other_party_name: "Асель Смагулова", other_party_photo: null,
      })

      await renderClientWindow("9")

      await waitFor(() => expect(startConversationWithClient).toHaveBeenCalledWith(9))
    })
  })
})
