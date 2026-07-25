import { render, screen, waitFor, within } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchAdminMentors, fetchAdminDisputes, fetchOrders } from "@/lib/api"
import { AdminMentorProfile, AdminDispute, Order } from "@/types"
import CRMDashboard from "./page"

vi.mock("@/lib/api")

function makeMentor(overrides: Partial<AdminMentorProfile> = {}): AdminMentorProfile {
  return {
    id: 1,
    full_name: "Айгерим Ержанова",
    age: 25,
    countries: [],
    languages: [],
    school_or_university: "MIT",
    major: "CS",
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
    is_approved: false,
    is_submitted: true,
    is_public: true,
    is_accepting_bookings: true,
    is_universal: false,
    is_banned: false,
    ban_reason: "",
    has_documents: true,
    rating_avg: null,
    rating_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    user_email: "mentor@example.com",
    telegram_username: "",
    telegram_id: "",
    ...overrides,
  }
}

function makeDispute(overrides: Partial<AdminDispute> = {}): AdminDispute {
  return {
    id: 1,
    order: 10,
    opened_by: 5,
    opened_by_email: "student@example.com",
    reason: "Ментор не вышел на связь",
    opened_at: "2026-01-01T00:00:00Z",
    resolution: null,
    resolved_by: null,
    resolved_by_email: null,
    resolved_at: null,
    refund_amount: null,
    ...overrides,
  }
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    student: 1,
    student_info: { id: 1, full_name: "Студент", current_school_or_university: "", profile_photo: null },
    mentor: 1,
    mentor_service: 1,
    service_title: "Консультация",
    payout_category: "primary_consultation",
    subtotal: "10000",
    bonus_applied: "0",
    total_price: "10000",
    platform_fee: "1000",
    mentor_payout_amount: "9000",
    payment_status: "unpaid",
    order_status: "pending_payment",
    payment_instructions: null,
    conversation_id: null,
    installment_number: null,
    engagement_duration_months: null,
    engagement_status: null,
    due_at: null,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Order
}

describe("CRMDashboard", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("shows loading skeletons before the stats resolve", () => {
    vi.mocked(fetchAdminMentors).mockReturnValue(new Promise(() => {}))
    vi.mocked(fetchAdminDisputes).mockReturnValue(new Promise(() => {}))
    vi.mocked(fetchOrders).mockReturnValue(new Promise(() => {}))

    render(<CRMDashboard />)
    expect(screen.getByText("Дашборд")).toBeInTheDocument()
    expect(screen.queryByText("Ожидают апрува")).not.toBeInTheDocument()
  })

  it("computes and renders stats from the three admin endpoints", async () => {
    vi.mocked(fetchAdminMentors).mockResolvedValue([makeMentor(), makeMentor({ id: 2 })])
    vi.mocked(fetchAdminDisputes).mockResolvedValue([
      makeDispute({ id: 1, resolution: null }),
      makeDispute({ id: 2, resolution: "full_refund" }),
    ])
    vi.mocked(fetchOrders).mockResolvedValue([
      makeOrder({ id: 1, order_status: "pending_payment" }),
      makeOrder({ id: 2, order_status: "completed" }),
      makeOrder({ id: 3, order_status: "pending_payment" }),
    ])

    render(<CRMDashboard />)

    await waitFor(() => expect(screen.getByText("Ожидают апрува")).toBeInTheDocument())

    const mentorsCard = screen.getByText("Ожидают апрува").closest("a")!
    const paymentsCard = screen.getByText("Ожидают оплаты").closest("a")!
    const disputesCard = screen.getByText("Открытые споры").closest("a")!
    const ordersCard = screen.getByText("Всего заказов").closest("a")!

    expect(within(mentorsCard).getByText("2")).toBeInTheDocument()
    expect(within(paymentsCard).getByText("2")).toBeInTheDocument()
    expect(within(disputesCard).getByText("1")).toBeInTheDocument()
    expect(within(ordersCard).getByText("3")).toBeInTheDocument()
  })

  it("shows an error banner when any stats request fails", async () => {
    vi.mocked(fetchAdminMentors).mockRejectedValue(new Error("network error"))
    vi.mocked(fetchAdminDisputes).mockResolvedValue([])
    vi.mocked(fetchOrders).mockResolvedValue([])

    render(<CRMDashboard />)

    expect(await screen.findByText("Не удалось загрузить статистику")).toBeInTheDocument()
  })

  it("renders quick-action nav links", async () => {
    vi.mocked(fetchAdminMentors).mockResolvedValue([])
    vi.mocked(fetchAdminDisputes).mockResolvedValue([])
    vi.mocked(fetchOrders).mockResolvedValue([])

    render(<CRMDashboard />)

    await waitFor(() => expect(fetchAdminMentors).toHaveBeenCalledWith("submitted"))

    expect(screen.getByRole("link", { name: /Модерация менторов/ })).toHaveAttribute("href", "/crm/mentors")
    expect(screen.getByRole("link", { name: /Подтвердить оплату/ })).toHaveAttribute("href", "/crm/payments")
    expect(screen.getByRole("link", { name: /Анализ чатов/ })).toHaveAttribute("href", "/crm/chats")
    expect(screen.getByRole("link", { name: /Настройки сайта/ })).toHaveAttribute("href", "/crm/settings")
  })

  // NOTE: CRMDashboard itself has no role guard — the admin-only check lives
  // in app/crm/layout.tsx (localStorage "role" === "admin", redirect otherwise),
  // which is outside this test file's scope. Rendering the page directly with
  // no token/role set still renders normally, confirming the guard is
  // layout-level only and this page component does not duplicate it.
  it("renders normally even without an admin role in localStorage (guard lives in layout.tsx, not here)", async () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("role")
    vi.mocked(fetchAdminMentors).mockResolvedValue([])
    vi.mocked(fetchAdminDisputes).mockResolvedValue([])
    vi.mocked(fetchOrders).mockResolvedValue([])

    render(<CRMDashboard />)

    expect(await screen.findByText("Ожидают апрува")).toBeInTheDocument()
  })
})
