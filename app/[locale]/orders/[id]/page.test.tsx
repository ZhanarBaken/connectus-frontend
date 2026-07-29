import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react"
import { useRouter } from "@/i18n/navigation"
import OrderPage, { invoiceDraftKey, translateInvoiceErrorMessage } from "./page"
import {
  fetchOrder,
  fetchMentor,
  fetchOrders,
  completeOrder,
  cancelOrder,
  rescheduleOrder,
  fetchMentorAvailability,
  fetchMentorAvailabilityOverview,
  createDispute,
  authFetch,
  markChatRead,
  fetchOrderDocuments,
  deleteOrderDocument,
  setDocumentStatus,
  fetchDocumentComments,
  postDocumentComment,
  fetchMentorServices,
  createSupportInvoice,
  endSupportEngagement,
  fetchSupportTasks,
  createSupportTask,
  updateSupportTask,
  deleteSupportTask,
  confirmIntroCall,
  declineIntroCall,
  fetchStudentProfile,
  SESSION_EXPIRED_EVENT,
} from "@/lib/api"
import { fetchChatMessages, fetchConversation, connectChat, closeConversation } from "@/lib/chat"
import { fetchMentorReviews, hasReviewForOrder } from "@/lib/reviews"
import type { Order, Mentor, MentorService, ChatMessage, StudentProfile } from "@/types"
import type { ChatConnection } from "@/lib/chat"

vi.mock("@/lib/api")
vi.mock("@/lib/chat")
vi.mock("@/lib/reviews")

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 42,
    student: 7,
    student_info: {
      id: 7,
      full_name: "Аружан Есенова",
      current_school_or_university: "NIS Almaty",
      profile_photo: null,
    },
    mentor: 3,
    mentor_service: 10,
    service_title: "Первичная консультация",
    payout_category: "primary_consultation",
    subtotal: "10000.00",
    total_price: "10000.00",
    platform_fee: "1000.00",
    mentor_payout_amount: "9000.00",
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

function okJson(data: unknown): Response {
  return { ok: true, json: async () => data } as Response
}

// React 19's `use()` suspends on the first render and only resumes once
// the passed promise settles. The resumption is scheduled via a
// microtask on that exact promise — outside of an `act()` that also
// awaits the promise itself, RTL's queries never observe the retry (the
// component stays stuck on the Suspense boundary forever). This helper
// centralizes the two-step act dance every test needs.
async function renderOrderPage(id: string) {
  const paramsPromise = Promise.resolve({ id })
  let utils!: ReturnType<typeof render>
  await act(async () => {
    utils = render(<OrderPage params={paramsPromise} />)
  })
  await act(async () => {
    await paramsPromise
  })
  return utils
}

function setupCommonMocks() {
  vi.mocked(authFetch).mockResolvedValue(okJson({ id: 1, email: "mentor@test.com" }))
  vi.mocked(fetchOrderDocuments).mockResolvedValue([])
  vi.mocked(fetchSupportTasks).mockResolvedValue([])
  vi.mocked(markChatRead).mockResolvedValue(undefined)
  vi.mocked(fetchChatMessages).mockResolvedValue([])
  vi.mocked(fetchConversation).mockResolvedValue({
    id: 1,
    mentor: 3,
    student: 7,
    created_at: "2026-07-01T10:00:00Z",
    closed_at: null,
    is_active: true,
  })
  vi.mocked(connectChat).mockImplementation(
    () => ({ send: vi.fn(() => true), close: vi.fn() }) as ChatConnection,
  )
  vi.mocked(fetchMentorReviews).mockResolvedValue([])
  vi.mocked(hasReviewForOrder).mockResolvedValue(false)
  // useStudentOnboardingGate's own fetch — default to "complete" so it
  // doesn't fire an unrelated redirect in tests that don't care about it.
  vi.mocked(fetchStudentProfile).mockResolvedValue({ is_profile_complete: true } as StudentProfile)
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: false } as Response),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  setupCommonMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("invoiceDraftKey", () => {
  it("namespaces the key by order id", () => {
    expect(invoiceDraftKey("42")).toBe("invoice_draft_42")
    expect(invoiceDraftKey("7")).toBe("invoice_draft_7")
  })
})

describe("translateInvoiceErrorMessage", () => {
  // Mirrors the exact ru copy in messages/ru.json's Orders.Detail
  // namespace — a plain lookup is enough here since this test is about
  // translateInvoiceErrorMessage's own substring-matching logic, not
  // about verifying translation content (the JSON files' own validity
  // is checked separately).
  const t = (key: string) => ({
    invoiceErrorLiveEngagement:
      "У этого студента уже есть активное сопровождение по этой услуге — заверши или отмени его, потом можно отправить новую заявку.",
    invoiceErrorNoConversation:
      "Нет открытого чата с этим студентом — заявку можно отправить только внутри существующей переписки.",
    invoiceErrorServiceUnavailable: "Эта услуга недоступна для отправки заявки.",
  })[key] ?? key

  it("translates an existing live engagement error", () => {
    expect(translateInvoiceErrorMessage("There is already a live engagement for this student", t))
      .toBe(
        "У этого студента уже есть активное сопровождение по этой услуге — заверши или отмени его, потом можно отправить новую заявку.",
      )
  })

  it("translates a no-open-conversation error", () => {
    expect(translateInvoiceErrorMessage("No open conversation with this student", t))
      .toBe("Нет открытого чата с этим студентом — заявку можно отправить только внутри существующей переписки.")
  })

  it("translates a service-does-not-belong-to-mentor error", () => {
    expect(translateInvoiceErrorMessage("This service does not belong to this mentor", t))
      .toBe("Эта услуга недоступна для отправки заявки.")
  })

  it("translates a not-a-support-category-service error", () => {
    expect(translateInvoiceErrorMessage("Service is not a support-category service", t))
      .toBe("Эта услуга недоступна для отправки заявки.")
  })

  it("matches case-insensitively", () => {
    expect(translateInvoiceErrorMessage("THERE IS ALREADY A LIVE ENGAGEMENT here", t))
      .toBe(
        "У этого студента уже есть активное сопровождение по этой услуге — заверши или отмени его, потом можно отправить новую заявку.",
      )
  })

  it("falls back to the raw message for unrecognized input", () => {
    expect(translateInvoiceErrorMessage("Some completely different backend error", t))
      .toBe("Some completely different backend error")
  })
})

describe("OrderPage — auth gate", () => {
  it("redirects to /auth/login when there is no access token", async () => {
    const push = vi.fn()
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push, replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    await renderOrderPage("42")

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"))
    expect(fetchOrder).not.toHaveBeenCalled()
  })
})

describe("OrderPage — student view", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "student")
    // BookingCalendar (rendered inside the reschedule modal) always
    // calls these on mount/date-select — give every test a safe
    // default so an unrelated test opening the modal doesn't crash on
    // `undefined.then(...)` from the auto-mocked module.
    vi.mocked(fetchMentorAvailabilityOverview).mockResolvedValue({
      timezone: "Asia/Almaty", duration_minutes: 60, dates: {},
    })
    vi.mocked(fetchMentorAvailability).mockResolvedValue({
      date: "2026-08-15", timezone: "Asia/Almaty", duration_minutes: 60, slots: [],
    })
  })

  it("renders order status, price and mentor info", async () => {
    vi.mocked(fetchOrder).mockResolvedValue(makeOrder())
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())

    await renderOrderPage("42")

    expect(await screen.findByText("Первичная консультация")).toBeInTheDocument()
    expect(screen.getAllByText("Ожидает оплаты").length).toBeGreaterThan(0)
    expect(screen.getByText("10 000 ₸")).toBeInTheDocument()
    expect(screen.getByText("Данияр Сериков")).toBeInTheDocument()
  })

  it("redirects a student with an incomplete profile to the onboarding wizard (useStudentOnboardingGate)", async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })
    vi.mocked(fetchStudentProfile).mockResolvedValue({ is_profile_complete: false } as StudentProfile)
    vi.mocked(fetchOrder).mockResolvedValue(makeOrder())
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())

    await renderOrderPage("42")

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/student"))
  })

  it("cancels a pending order after confirming", async () => {
    const order = makeOrder()
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())
    vi.mocked(cancelOrder).mockResolvedValue({ ...order, order_status: "cancelled" })
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)

    await renderOrderPage("42")

    const button = await screen.findByRole("button", { name: "Отменить заказ" })
    fireEvent.click(button)

    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith(42))
    expect(await screen.findByText("Отменён")).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it("shows a reschedule button for a pending order with a scheduled time", async () => {
    vi.mocked(fetchOrder).mockResolvedValue(
      makeOrder({ scheduled_at: "2026-08-15T10:00:00+05:00" }),
    )
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())

    await renderOrderPage("42")

    expect(await screen.findByRole("button", { name: "Перенести" })).toBeInTheDocument()
  })

  it("hides the reschedule button when the order has no scheduled time", async () => {
    vi.mocked(fetchOrder).mockResolvedValue(makeOrder({ scheduled_at: null }))
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())

    await renderOrderPage("42")

    await screen.findByText("Первичная консультация")
    expect(screen.queryByRole("button", { name: "Перенести" })).not.toBeInTheDocument()
  })

  it("hides the reschedule button once the order is completed", async () => {
    vi.mocked(fetchOrder).mockResolvedValue(
      makeOrder({
        order_status: "completed", payout_category: "delivery",
        scheduled_at: "2026-08-15T10:00:00+05:00", completed_at: "2026-08-15T11:00:00+05:00",
      }),
    )
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())

    await renderOrderPage("42")

    await screen.findByText("Первичная консультация")
    expect(screen.queryByRole("button", { name: "Перенести" })).not.toBeInTheDocument()
  })

  it("opens the reschedule modal on click", async () => {
    vi.mocked(fetchOrder).mockResolvedValue(
      makeOrder({ scheduled_at: "2026-08-15T10:00:00+05:00" }),
    )
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())

    await renderOrderPage("42")

    const button = await screen.findByRole("button", { name: "Перенести" })
    fireEvent.click(button)

    expect(await screen.findByText("Выбери новое время")).toBeInTheDocument()
  })

  describe("completing a reschedule via the calendar", () => {
    const TODAY = new Date("2026-08-10T12:00:00")

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.setSystemTime(TODAY)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("calls rescheduleOrder and closes the modal on success", async () => {
      // Drives the real BookingCalendar UI the same way
      // BookingCalendar.test.tsx does — this test's job is to verify
      // OrderPage wires it up correctly (mentorId, the ISO string it
      // builds, the order-state update), not to re-prove the
      // calendar's own date/slot-picking logic.
      const order = makeOrder({ scheduled_at: "2026-08-15T10:00:00+05:00" })
      vi.mocked(fetchOrder).mockResolvedValue(order)
      vi.mocked(fetchMentor).mockResolvedValue(makeMentor())
      vi.mocked(rescheduleOrder).mockResolvedValue({
        ...order, scheduled_at: "2026-08-16T11:00:00+05:00",
      })
      vi.mocked(fetchMentorAvailability).mockResolvedValue({
        date: "2026-08-16", timezone: "Asia/Almaty", duration_minutes: 60, slots: ["11:00"],
      })

      await renderOrderPage("42")

      fireEvent.click(await screen.findByRole("button", { name: "Перенести" }))
      await screen.findByText("Выбери новое время")

      const dayButton = screen
        .getAllByText("16")
        .map((el) => el.closest("button"))
        .find((btn): btn is HTMLButtonElement => btn !== null && !btn.hasAttribute("disabled"))
      if (!dayButton) throw new Error("No enabled day-16 button found")
      fireEvent.click(dayButton)

      const slotButton = await screen.findByText("11:00")
      fireEvent.click(slotButton)

      const confirmText = await screen.findByText("Записаться на 11:00")
      const confirmButton = confirmText.closest("button")
      if (!confirmButton) throw new Error("Confirm button not found")
      fireEvent.click(confirmButton)

      await waitFor(() =>
        expect(rescheduleOrder).toHaveBeenCalledWith(42, expect.stringContaining("11:00:00+05:00")),
      )
      await waitFor(() =>
        expect(screen.queryByText("Выбери новое время")).not.toBeInTheDocument(),
      )
    })
  })

  it("opens a dispute on a completed non-consultation order", async () => {
    const order = makeOrder({
      order_status: "completed",
      payout_category: "delivery",
      completed_at: new Date().toISOString(),
    })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())
    vi.mocked(createDispute).mockResolvedValue({
      id: 1, order: 42, reason: "Проблема с услугой, ментор не вышел на связь", opened_at: new Date().toISOString(), resolution: null,
    })
    // dispute window: 48h, well within range
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dispute_window_hours: 48 }) } as Response),
    )

    await renderOrderPage("42")

    const openButton = await screen.findByRole("button", { name: "Открыть спор" })
    fireEvent.click(openButton)

    const textarea = await screen.findByPlaceholderText("Опиши проблему подробно — минимум 20 символов")
    fireEvent.change(textarea, { target: { value: "Проблема с услугой, ментор не вышел на связь" } })
    fireEvent.click(screen.getByRole("button", { name: "Подать спор" }))

    await waitFor(() => expect(createDispute).toHaveBeenCalledWith(
      42, "Проблема с услугой, ментор не вышел на связь",
    ))
  })
})

describe("OrderPage — mentor: complete order", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([])
  })

  it("calls completeOrder after confirming, and reflects the updated status", async () => {
    const order = makeOrder({ order_status: "in_progress", payout_category: "delivery" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(completeOrder).mockResolvedValue({ ...order, order_status: "completed", completed_at: "2026-07-02T10:00:00Z" })
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)

    await renderOrderPage("42")

    const button = await screen.findByRole("button", { name: "✓ Услуга выполнена" })
    fireEvent.click(button)

    await waitFor(() => expect(completeOrder).toHaveBeenCalledWith(42))
    expect(await screen.findByText("Завершено")).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it("does not call completeOrder when the confirm dialog is dismissed", async () => {
    const order = makeOrder({ order_status: "in_progress", payout_category: "delivery" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)

    await renderOrderPage("42")

    const button = await screen.findByRole("button", { name: "✓ Услуга выполнена" })
    fireEvent.click(button)

    await waitFor(() => expect(confirmSpy).toHaveBeenCalled())
    expect(completeOrder).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})

describe("OrderPage — mentor: intro-call confirmation", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([])
  })

  it("shows the confirm/decline panel for a pending intro-call request", async () => {
    const order = makeOrder({
      order_status: "draft", payout_category: "support", support_engagement: null,
    })
    vi.mocked(fetchOrder).mockResolvedValue(order)

    await renderOrderPage("42")

    expect(await screen.findByText("Заявка на интро-звонок")).toBeInTheDocument()
  })

  it("does not show the panel for a regular draft order", async () => {
    const order = makeOrder({
      order_status: "draft", payout_category: "primary_consultation", support_engagement: null,
    })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())

    await renderOrderPage("42")

    await screen.findByText("Первичная консультация")
    expect(screen.queryByText("Заявка на интро-звонок")).not.toBeInTheDocument()
  })

  it("does not show the panel once support_engagement is set (a real engagement session, not an intro call)", async () => {
    const order = makeOrder({
      order_status: "draft", payout_category: "support", support_engagement: 5,
    })
    vi.mocked(fetchOrder).mockResolvedValue(order)

    await renderOrderPage("42")

    expect(screen.queryByText("Заявка на интро-звонок")).not.toBeInTheDocument()
  })

  it("confirms the intro call", async () => {
    const order = makeOrder({
      order_status: "draft", payout_category: "support", support_engagement: null,
    })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(confirmIntroCall).mockResolvedValue({ ...order, order_status: "in_progress" })

    await renderOrderPage("42")

    fireEvent.click(await screen.findByText("Подтвердить"))

    await waitFor(() => expect(confirmIntroCall).toHaveBeenCalledWith(42))
    expect(await screen.findByText("В работе")).toBeInTheDocument()
  })

  it("declines the intro call", async () => {
    const order = makeOrder({
      order_status: "draft", payout_category: "support", support_engagement: null,
    })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(declineIntroCall).mockResolvedValue({ ...order, order_status: "cancelled" })

    await renderOrderPage("42")

    fireEvent.click(await screen.findByText("Отклонить"))

    await waitFor(() => expect(declineIntroCall).toHaveBeenCalledWith(42))
    expect(await screen.findByText("Отменён")).toBeInTheDocument()
  })

  it("shows an error message when confirming fails", async () => {
    const order = makeOrder({
      order_status: "draft", payout_category: "support", support_engagement: null,
    })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(confirmIntroCall).mockRejectedValue(new Error("Не удалось подтвердить интро-звонок"))

    await renderOrderPage("42")

    fireEvent.click(await screen.findByText("Подтвердить"))

    expect(await screen.findByText("Не удалось подтвердить интро-звонок")).toBeInTheDocument()
  })
})

describe("OrderPage — document review", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([])
  })

  function makeDoc(overrides: Partial<import("@/types").OrderDocument> = {}): import("@/types").OrderDocument {
    return {
      id: 1,
      kind: "general",
      status: "pending",
      original_filename: "diploma.pdf",
      content_type: "application/pdf",
      size_bytes: 2048,
      description: "",
      download_url: "https://example.com/diploma.pdf",
      uploaded_by: 7,
      uploaded_by_email: "student@test.com",
      uploaded_at: "2026-07-01T10:00:00Z",
      ...overrides,
    }
  }

  it("shows the status badge and lets the non-uploader verify a document", async () => {
    const order = makeOrder({ order_status: "in_progress" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchOrderDocuments).mockResolvedValue([makeDoc()])
    vi.mocked(setDocumentStatus).mockResolvedValue(makeDoc({ status: "verified" }))

    await renderOrderPage("42")

    expect(await screen.findByText("На проверке")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Подтвердить"))

    await waitFor(() => expect(setDocumentStatus).toHaveBeenCalledWith(42, 1, "verified"))
    expect(await screen.findByText("Проверен")).toBeInTheDocument()
  })

  it("does not show review buttons to the document's own uploader", async () => {
    const order = makeOrder({ order_status: "in_progress" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    // authFetch (setupCommonMocks) resolves currentUserId=1 — mark that user as the uploader.
    vi.mocked(fetchOrderDocuments).mockResolvedValue([makeDoc({ uploaded_by: 1, uploaded_by_email: "mentor@test.com" })])

    await renderOrderPage("42")

    expect(await screen.findByText("diploma.pdf")).toBeInTheDocument()
    expect(screen.queryByText("Подтвердить")).not.toBeInTheDocument()
  })

  it("hides the status badge and review buttons for a payment receipt", async () => {
    const order = makeOrder({ order_status: "in_progress" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchOrderDocuments).mockResolvedValue([
      makeDoc({ kind: "payment_receipt", original_filename: "receipt.pdf" }),
    ])

    await renderOrderPage("42")

    expect(await screen.findByText("receipt.pdf")).toBeInTheDocument()
    expect(screen.queryByText("На проверке")).not.toBeInTheDocument()
    expect(screen.queryByText("Подтвердить")).not.toBeInTheDocument()
  })

  it("loads and posts comments on a document", async () => {
    const order = makeOrder({ order_status: "in_progress" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchOrderDocuments).mockResolvedValue([makeDoc()])
    vi.mocked(fetchDocumentComments).mockResolvedValue([
      { id: 1, document: 1, author: 7, author_email: "student@test.com", text: "Проверьте, пожалуйста", created_at: "2026-07-01T10:00:00Z" },
    ])
    vi.mocked(postDocumentComment).mockResolvedValue({
      id: 2, document: 1, author: 1, author_email: "mentor@test.com", text: "Всё хорошо", created_at: "2026-07-01T11:00:00Z",
    })

    await renderOrderPage("42")

    fireEvent.click(await screen.findByText("Комментарии"))
    expect(await screen.findByText("Проверьте, пожалуйста")).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText("Написать комментарий..."), { target: { value: "Всё хорошо" } })
    fireEvent.click(screen.getByText("Отправить"))

    await waitFor(() => expect(postDocumentComment).toHaveBeenCalledWith(42, 1, "Всё хорошо"))
    expect(await screen.findByText("Всё хорошо")).toBeInTheDocument()
  })

  it("shows an inline error when verifying a document fails", async () => {
    // Regression: the verify/needs-revision buttons had empty catches —
    // a failed status change just silently re-enabled the button.
    const order = makeOrder({ order_status: "in_progress" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchOrderDocuments).mockResolvedValue([makeDoc()])
    vi.mocked(setDocumentStatus).mockRejectedValue(new Error("Не удалось выполнить действие с документом"))

    await renderOrderPage("42")

    fireEvent.click(await screen.findByText("Подтвердить"))

    await waitFor(() => {
      expect(screen.getByText("Не удалось выполнить действие с документом")).toBeInTheDocument()
    })
  })

  it("shows an inline error when deleting a document fails", async () => {
    // Regression: the delete-document (×) button had an empty catch.
    const order = makeOrder({ order_status: "in_progress" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    // authFetch (setupCommonMocks) resolves currentUserId=1 — mark that user as the uploader
    // so the delete button (only shown to the uploader) renders.
    vi.mocked(fetchOrderDocuments).mockResolvedValue([makeDoc({ uploaded_by: 1, uploaded_by_email: "mentor@test.com" })])
    vi.mocked(deleteOrderDocument).mockRejectedValue(new Error("Не удалось выполнить действие с документом"))

    await renderOrderPage("42")

    const docRow = (await screen.findByText("diploma.pdf")).closest(".group") as HTMLElement
    // Row order: filename/download button, delete (×) button, comments-toggle button.
    const buttons = docRow.querySelectorAll("button")
    const deleteButton = buttons[1] as HTMLElement
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText("Не удалось выполнить действие с документом")).toBeInTheDocument()
    })
    expect(screen.getByText("diploma.pdf")).toBeInTheDocument()
  })

  it("shows a distinct error when loading documents fails (not the shared docs/tasks message)", async () => {
    // Regression: docsLoadError and tasksLoadError used to share one
    // "couldn't load documents and tasks" string — misleading when only
    // one of the two independent fetches actually failed.
    const order = makeOrder({ order_status: "in_progress" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchOrderDocuments).mockRejectedValue(new Error("network"))

    await renderOrderPage("42")

    await waitFor(() => {
      expect(screen.getByText("Не удалось загрузить документы")).toBeInTheDocument()
    })
    expect(screen.queryByText("Не удалось загрузить задачи")).not.toBeInTheDocument()
  })
})

describe("OrderPage — support tasks", () => {
  function makeTask(overrides: Partial<import("@/types").SupportTask> = {}): import("@/types").SupportTask {
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
      ...overrides,
    }
  }

  it("is absent without a support engagement", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "student")
    const order = makeOrder({ support_engagement: null, payout_category: "delivery" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())

    await renderOrderPage("42")

    await screen.findByText("Первичная консультация")
    expect(screen.queryByText("Задачи")).not.toBeInTheDocument()
  })

  it("shows an empty state and the add-task form for the mentor", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([])
    const order = makeOrder({ support_engagement: 5, engagement_status: "active", payout_category: "support" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchSupportTasks).mockResolvedValue([])

    await renderOrderPage("42")

    expect(await screen.findByText("Задачи")).toBeInTheDocument()
    expect(screen.getByText("Пока нет задач")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Новая задача")).toBeInTheDocument()
  })

  it("lets the mentor add a task", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([])
    const order = makeOrder({ support_engagement: 5, engagement_status: "active", payout_category: "support" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchSupportTasks).mockResolvedValue([])
    vi.mocked(createSupportTask).mockResolvedValue(makeTask())

    await renderOrderPage("42")

    fireEvent.change(await screen.findByPlaceholderText("Новая задача"), {
      target: { value: "Загрузи эссе на проверку" },
    })
    fireEvent.click(screen.getByText("Добавить"))

    await waitFor(() =>
      expect(createSupportTask).toHaveBeenCalledWith(5, { title: "Загрузи эссе на проверку", deadline: null }),
    )
    expect(await screen.findByText("Загрузи эссе на проверку")).toBeInTheDocument()
  })

  it("lets the mentor mark a task done", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([])
    const order = makeOrder({ support_engagement: 5, engagement_status: "active", payout_category: "support" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchSupportTasks).mockResolvedValue([makeTask()])
    vi.mocked(updateSupportTask).mockResolvedValue(makeTask({ is_done: true, completed_at: "2026-07-02T00:00:00Z" }))

    await renderOrderPage("42")

    fireEvent.click(await screen.findByLabelText("Загрузи эссе на проверку"))

    await waitFor(() => expect(updateSupportTask).toHaveBeenCalledWith(5, 1, { is_done: true }))
  })

  it("lets the mentor delete a task", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([])
    const order = makeOrder({ support_engagement: 5, engagement_status: "active", payout_category: "support" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchSupportTasks).mockResolvedValue([makeTask()])
    vi.mocked(deleteSupportTask).mockResolvedValue(undefined)

    await renderOrderPage("42")

    const taskRow = (await screen.findByText("Загрузи эссе на проверку")).closest(".group") as HTMLElement
    const deleteButton = taskRow.querySelector("button:last-child") as HTMLElement
    fireEvent.click(deleteButton)

    await waitFor(() => expect(deleteSupportTask).toHaveBeenCalledWith(5, 1))
    await waitFor(() => expect(screen.queryByText("Загрузи эссе на проверку")).not.toBeInTheDocument())
  })

  it("shows an inline error when marking a task done fails", async () => {
    // Regression: handleToggleTaskDone had an empty catch — a failed
    // toggle just silently reverted with zero feedback.
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([])
    const order = makeOrder({ support_engagement: 5, engagement_status: "active", payout_category: "support" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchSupportTasks).mockResolvedValue([makeTask()])
    vi.mocked(updateSupportTask).mockRejectedValue(new Error("Не удалось обновить задачу"))

    await renderOrderPage("42")

    fireEvent.click(await screen.findByLabelText("Загрузи эссе на проверку"))

    await waitFor(() => {
      expect(screen.getByText("Не удалось обновить задачу")).toBeInTheDocument()
    })
  })

  it("shows an inline error when deleting a task fails", async () => {
    // Regression: handleDeleteTask had an empty catch — a failed delete
    // just silently kept the task in the list with zero feedback.
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([])
    const order = makeOrder({ support_engagement: 5, engagement_status: "active", payout_category: "support" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchSupportTasks).mockResolvedValue([makeTask()])
    vi.mocked(deleteSupportTask).mockRejectedValue(new Error("Не удалось удалить задачу"))

    await renderOrderPage("42")

    const taskRow = (await screen.findByText("Загрузи эссе на проверку")).closest(".group") as HTMLElement
    const deleteButton = taskRow.querySelector("button:last-child") as HTMLElement
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.getByText("Не удалось удалить задачу")).toBeInTheDocument()
    })
    expect(screen.getByText("Загрузи эссе на проверку")).toBeInTheDocument()
  })

  it("shows an inline error instead of an empty list when loading tasks fails", async () => {
    // Regression: fetchSupportTasks().catch(() => {}) rendered the same
    // "no tasks yet" empty state as a genuinely empty list.
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([])
    const order = makeOrder({ support_engagement: 5, engagement_status: "active", payout_category: "support" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchSupportTasks).mockRejectedValue(new Error("network"))

    await renderOrderPage("42")

    await waitFor(() => {
      expect(screen.getByText("Не удалось загрузить задачи")).toBeInTheDocument()
    })
    expect(screen.queryByText("Пока нет задач")).not.toBeInTheDocument()
  })

  it("shows the student a read-only list with no add form", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "student")
    const order = makeOrder({ support_engagement: 5, engagement_status: "active", payout_category: "support" })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())
    vi.mocked(fetchSupportTasks).mockResolvedValue([makeTask()])

    await renderOrderPage("42")

    expect(await screen.findByText("Загрузи эссе на проверку")).toBeInTheDocument()
    expect(screen.queryByPlaceholderText("Новая задача")).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText("Загрузи эссе на проверку"))
    expect(updateSupportTask).not.toHaveBeenCalled()
  })
})

// ─── Regression #1: session-expiry invoice draft round trip ────────────────

describe("OrderPage — invoice draft survives a forced session-expiry redirect", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    const order = makeOrder({
      order_status: "in_progress",
      conversation_id: 55,
      support_engagement: null,
      payout_category: "delivery",
    })
    vi.mocked(fetchOrder).mockResolvedValue(order)
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([makeService()])
  })

  it("saves the in-progress invoice form to sessionStorage on SESSION_EXPIRED_EVENT, then restores and clears it on next mount", async () => {
    const { unmount } = await renderOrderPage("42")

    // Open the invoice form and fill it in.
    const openButton = await screen.findByRole("button", { name: "Отправить заявку" })
    fireEvent.click(openButton)

    const select = await screen.findByRole("combobox")
    fireEvent.change(select, { target: { value: "10" } })
    const priceInput = screen.getByPlaceholderText("Цена, ₸")
    fireEvent.change(priceInput, { target: { value: "50000" } })
    const monthsInput = screen.getByPlaceholderText("Срок, мес")
    fireEvent.change(monthsInput, { target: { value: "6" } })

    expect(sessionStorage.getItem(invoiceDraftKey("42"))).toBeNull()

    act(() => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    })

    await waitFor(() => {
      expect(sessionStorage.getItem(invoiceDraftKey("42"))).not.toBeNull()
    })
    const saved = JSON.parse(sessionStorage.getItem(invoiceDraftKey("42"))!)
    expect(saved).toEqual({
      invoiceServiceId: 10,
      invoicePrice: "50000",
      invoiceMonths: "6",
    })

    unmount()

    // Remount — the draft-restore effect should reopen the form pre-filled
    // and consume (clear) the sessionStorage key.
    await renderOrderPage("42")

    const restoredSelect = await screen.findByRole("combobox") as HTMLSelectElement
    await waitFor(() => expect(restoredSelect.value).toBe("10"))
    expect(screen.getByPlaceholderText("Цена, ₸")).toHaveValue(50000)
    expect(screen.getByPlaceholderText("Срок, мес")).toHaveValue(6)
    expect(sessionStorage.getItem(invoiceDraftKey("42"))).toBeNull()
  })

  it("does not save a draft to sessionStorage if the invoice form was never opened", async () => {
    await renderOrderPage("42")

    await screen.findByRole("button", { name: "Отправить заявку" })

    act(() => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    })

    expect(sessionStorage.getItem(invoiceDraftKey("42"))).toBeNull()
  })

  it("shows the translated error message when createSupportInvoice fails", async () => {
    vi.mocked(createSupportInvoice).mockRejectedValue(
      new Error("There is already a live engagement for this service"),
    )

    await renderOrderPage("42")

    const openButton = await screen.findByRole("button", { name: "Отправить заявку" })
    fireEvent.click(openButton)

    const select = await screen.findByRole("combobox")
    fireEvent.change(select, { target: { value: "10" } })
    fireEvent.change(screen.getByPlaceholderText("Цена, ₸"), { target: { value: "50000" } })
    fireEvent.change(screen.getByPlaceholderText("Срок, мес"), { target: { value: "6" } })

    fireEvent.click(screen.getByRole("button", { name: "Отправить" }))

    expect(await screen.findByText(
      "У этого студента уже есть активное сопровождение по этой услуге — заверши или отмени его, потом можно отправить новую заявку.",
    )).toBeInTheDocument()
  })
})

// ─── Regression #2: chat WebSocket wiring ───────────────────────────────────

describe("OrderPage — chat websocket wiring", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "student")
    vi.mocked(fetchOrder).mockResolvedValue(
      makeOrder({ order_status: "in_progress", conversation_id: 77 }),
    )
    vi.mocked(fetchMentor).mockResolvedValue(makeMentor())
  })

  it("appends incoming messages, de-dupes by id, and toggles the connected indicator on open/close", async () => {
    let handlers: Parameters<typeof connectChat>[1] | undefined
    vi.mocked(connectChat).mockImplementation((_id, h) => {
      handlers = h
      return { send: vi.fn(() => true), close: vi.fn() }
    })

    await renderOrderPage("42")

    await screen.findByText("Сообщения")
    await waitFor(() => expect(handlers).toBeDefined())

    act(() => handlers!.onOpen?.())
    expect(await screen.findByText("В сети")).toBeInTheDocument()

    const msg: ChatMessage = {
      id: 1,
      sender: 7,
      sender_email: "student@test.com",
      text: "Привет!",
      created_at: "2026-07-01T12:00:00Z",
    }
    act(() => handlers!.onMessage(msg))
    expect(await screen.findAllByText("Привет!")).toHaveLength(1)

    // De-dupe: same id delivered again must not duplicate the bubble.
    act(() => handlers!.onMessage({ ...msg }))
    expect(await screen.findAllByText("Привет!")).toHaveLength(1)

    act(() => handlers!.onClose?.(1000))
    expect(await screen.findByText("Подключение...")).toBeInTheDocument()
  })

  it("sets chatClosed when onServerError reports the chat is closed", async () => {
    let handlers: Parameters<typeof connectChat>[1] | undefined
    vi.mocked(connectChat).mockImplementation((_id, h) => {
      handlers = h
      return { send: vi.fn(() => true), close: vi.fn() }
    })

    await renderOrderPage("42")

    await waitFor(() => expect(handlers).toBeDefined())

    act(() => handlers!.onServerError?.("This conversation is closed"))

    expect(await screen.findByText(
      "Ментор закрыл чат. Чтобы продолжить общение и заказать услуги, закажи новую консультацию на странице ментора.",
    )).toBeInTheDocument()
  })

  it("does not set chatClosed for unrelated server errors", async () => {
    let handlers: Parameters<typeof connectChat>[1] | undefined
    vi.mocked(connectChat).mockImplementation((_id, h) => {
      handlers = h
      return { send: vi.fn(() => true), close: vi.fn() }
    })

    await renderOrderPage("42")

    await waitFor(() => expect(handlers).toBeDefined())

    act(() => handlers!.onServerError?.("Message too long"))

    expect(screen.queryByText(
      "Ментор закрыл чат. Чтобы продолжить общение и заказать услуги, закажи новую консультацию на странице ментора.",
    )).not.toBeInTheDocument()
  })
})

describe("OrderPage — mentor: close chat", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([])
    vi.mocked(fetchOrder).mockResolvedValue(
      makeOrder({ order_status: "in_progress", conversation_id: 88 }),
    )
  })

  it("closes the chat after confirming", async () => {
    vi.mocked(closeConversation).mockResolvedValue({ closed_at: "2026-07-02T10:00:00Z" })
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)

    await renderOrderPage("42")

    const button = await screen.findByRole("button", { name: "Закрыть чат с абитуриентом" })
    fireEvent.click(button)

    await waitFor(() => expect(closeConversation).toHaveBeenCalledWith(88))
    expect((await screen.findAllByText("Чат закрыт")).length).toBeGreaterThan(0)
    confirmSpy.mockRestore()
  })
})

describe("OrderPage — mentor: end a support engagement", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchOrders).mockResolvedValue([])
    vi.mocked(fetchMentorServices).mockResolvedValue([])
  })

  it("shows the end-engagement button for an active engagement order", async () => {
    vi.mocked(fetchOrder).mockResolvedValue(
      makeOrder({
        order_status: "in_progress", payout_category: "support",
        support_engagement: 5, engagement_status: "active",
      }),
    )

    await renderOrderPage("42")

    expect(await screen.findByRole("button", { name: "Завершить сопровождение" })).toBeInTheDocument()
  })

  it("does not show the button when there's no engagement", async () => {
    vi.mocked(fetchOrder).mockResolvedValue(
      makeOrder({ order_status: "in_progress", payout_category: "delivery" }),
    )

    await renderOrderPage("42")

    await screen.findByText("Первичная консультация")
    expect(screen.queryByRole("button", { name: "Завершить сопровождение" })).not.toBeInTheDocument()
  })

  it("requires a reason before submitting", async () => {
    vi.mocked(fetchOrder).mockResolvedValue(
      makeOrder({
        order_status: "in_progress", payout_category: "support",
        support_engagement: 5, engagement_status: "active",
      }),
    )

    await renderOrderPage("42")

    fireEvent.click(await screen.findByRole("button", { name: "Завершить сопровождение" }))
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }))

    expect(await screen.findByText("Укажи причину — она будет отправлена студенту.")).toBeInTheDocument()
    expect(endSupportEngagement).not.toHaveBeenCalled()
  })

  it("calls endSupportEngagement with the engagement id and reason, then refetches the order", async () => {
    const order = makeOrder({
      order_status: "in_progress", payout_category: "support",
      support_engagement: 5, engagement_status: "active",
    })
    vi.mocked(fetchOrder)
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce({ ...order, engagement_status: "cancelled" })
    vi.mocked(endSupportEngagement).mockResolvedValue({
      id: 5, mentor: 3, mentor_name: "Данияр Сериков", student: 7, student_name: "Аружан Есенова",
      mentor_service: 10, service_title: "Сопровождение", total_price: "500000.00", duration_months: 6,
      status: "cancelled", next_installment_due_at: null, paused_at: null,
      created_at: "2026-07-01T10:00:00Z",
    })

    await renderOrderPage("42")

    fireEvent.click(await screen.findByRole("button", { name: "Завершить сопровождение" }))
    fireEvent.change(screen.getByPlaceholderText("Причина — студент её увидит"), {
      target: { value: "Закончили раньше срока." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }))

    await waitFor(() => expect(endSupportEngagement).toHaveBeenCalledWith(5, "Закончили раньше срока."))
    await waitFor(() => expect(fetchOrder).toHaveBeenCalledTimes(2))
  })
})
