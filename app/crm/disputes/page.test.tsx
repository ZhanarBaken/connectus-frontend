import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  fetchAdminDisputes,
  resolveDispute,
  adminCancelSupportEngagement,
  adminPauseSupportEngagement,
  adminResumeSupportEngagement,
} from "@/lib/api"
import { AdminDispute, SupportEngagement } from "@/types"
import CRMDisputesPage from "./page"

vi.mock("@/lib/api")

function makeDispute(overrides: Partial<AdminDispute> = {}): AdminDispute {
  return {
    id: 1,
    order: 42,
    opened_by: 7,
    opened_by_email: "student@example.com",
    reason: "Ментор не вышел на связь",
    opened_at: "2026-01-01T00:00:00Z",
    resolution: null,
    resolved_by: null,
    resolved_by_email: null,
    resolved_at: null,
    refund_amount: null,
    support_engagement: null,
    ...overrides,
  }
}

function makeEngagement(overrides: Partial<SupportEngagement> = {}): SupportEngagement {
  return {
    id: 5,
    mentor: 3,
    mentor_name: "Данияр Сериков",
    student: 7,
    student_name: "Аружан Есенова",
    mentor_service: 10,
    service_title: "Сопровождение",
    total_price: "500000.00",
    duration_months: 6,
    status: "active",
    next_installment_due_at: null,
    paused_at: null,
    application_deadline: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("CRMDisputesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows the empty state when there are no disputes", async () => {
    vi.mocked(fetchAdminDisputes).mockResolvedValue([])
    render(<CRMDisputesPage />)

    expect(await screen.findByText("Нет споров")).toBeInTheDocument()
  })

  it("shows an error banner when the fetch fails", async () => {
    vi.mocked(fetchAdminDisputes).mockRejectedValue(new Error("boom"))
    render(<CRMDisputesPage />)

    expect(await screen.findByText("Не удалось загрузить споры")).toBeInTheDocument()
  })

  it("separates open and resolved disputes into their own sections", async () => {
    vi.mocked(fetchAdminDisputes).mockResolvedValue([
      makeDispute({ id: 1, order: 1, resolution: null }),
      makeDispute({ id: 2, order: 2, resolution: "full_refund", resolved_by_email: "admin@example.com", resolved_at: "2026-01-02T00:00:00Z" }),
    ])
    render(<CRMDisputesPage />)

    expect(await screen.findByText("Спор по заказу #1")).toBeInTheDocument()
    expect(screen.getByText("Открытые")).toBeInTheDocument()
    expect(screen.getByText("Разрешённые")).toBeInTheDocument()
    expect(screen.getByText("Спор по заказу #2")).toBeInTheDocument()
    expect(screen.getByText("Возврат")).toBeInTheDocument()
    // header badge shows only open count
    expect(screen.getByText("1 открытых")).toBeInTheDocument()
  })

  it("resolves an open dispute with full_refund and updates its state to resolved", async () => {
    const user = userEvent.setup()
    const openDispute = makeDispute({ id: 1, order: 1, resolution: null })
    const resolved = { ...openDispute, resolution: "full_refund" as const, resolved_by_email: "admin@example.com", resolved_at: "2026-01-02T00:00:00Z" }

    vi.mocked(fetchAdminDisputes).mockResolvedValue([openDispute])
    vi.mocked(resolveDispute).mockResolvedValue(resolved)

    render(<CRMDisputesPage />)
    await screen.findByText("Спор по заказу #1")

    await user.click(screen.getByRole("button", { name: "Возврат студенту" }))

    expect(resolveDispute).toHaveBeenCalledWith(1, "full_refund")
    expect(await screen.findByText("Возврат")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Возврат студенту" })).not.toBeInTheDocument()
  })

  it("resolves an open dispute with payout_mentor", async () => {
    const user = userEvent.setup()
    const openDispute = makeDispute({ id: 2, order: 9, resolution: null })
    const resolved = { ...openDispute, resolution: "payout_mentor" as const, resolved_by_email: "admin@example.com", resolved_at: "2026-01-02T00:00:00Z" }

    vi.mocked(fetchAdminDisputes).mockResolvedValue([openDispute])
    vi.mocked(resolveDispute).mockResolvedValue(resolved)

    render(<CRMDisputesPage />)
    await screen.findByText("Спор по заказу #9")

    await user.click(screen.getByRole("button", { name: "Выплатить ментору" }))

    expect(resolveDispute).toHaveBeenCalledWith(2, "payout_mentor")
    expect(await screen.findByText("Выплата ментору")).toBeInTheDocument()
  })

  it("shows an error message when resolving fails, without changing the dispute state", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminDisputes).mockResolvedValue([makeDispute({ id: 1, order: 1, resolution: null })])
    vi.mocked(resolveDispute).mockRejectedValue(new Error("Не удалось разрешить спор"))

    render(<CRMDisputesPage />)
    await screen.findByText("Спор по заказу #1")

    await user.click(screen.getByRole("button", { name: "Возврат студенту" }))

    expect(await screen.findByText("Не удалось разрешить спор")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Возврат студенту" })).toBeInTheDocument()
  })

  it("shows no engagement panel when the dispute isn't tied to one", async () => {
    vi.mocked(fetchAdminDisputes).mockResolvedValue([makeDispute({ support_engagement: null })])
    render(<CRMDisputesPage />)

    await screen.findByText("Спор по заказу #42")
    expect(screen.queryByText("Приостановить")).not.toBeInTheDocument()
    expect(screen.queryByText("Прекратить")).not.toBeInTheDocument()
  })

  it("shows engagement info and pause/cancel actions for an active engagement", async () => {
    vi.mocked(fetchAdminDisputes).mockResolvedValue([
      makeDispute({ support_engagement: makeEngagement({ status: "active" }) }),
    ])
    render(<CRMDisputesPage />)

    expect(await screen.findByText(/Сопровождение «Сопровождение»/)).toBeInTheDocument()
    expect(screen.getByText("активно")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Приостановить" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Прекратить" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Возобновить" })).not.toBeInTheDocument()
  })

  it("shows a resume action for a paused engagement instead of pause", async () => {
    vi.mocked(fetchAdminDisputes).mockResolvedValue([
      makeDispute({ support_engagement: makeEngagement({ status: "paused" }) }),
    ])
    render(<CRMDisputesPage />)

    await screen.findByText("на паузе")
    expect(screen.getByRole("button", { name: "Возобновить" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Приостановить" })).not.toBeInTheDocument()
  })

  it("cancels the engagement after entering a reason", async () => {
    const user = userEvent.setup()
    const engagement = makeEngagement({ status: "active" })
    vi.mocked(fetchAdminDisputes).mockResolvedValue([makeDispute({ id: 1, support_engagement: engagement })])
    vi.mocked(adminCancelSupportEngagement).mockResolvedValue({ ...engagement, status: "cancelled" })

    render(<CRMDisputesPage />)
    await user.click(await screen.findByRole("button", { name: "Прекратить" }))
    await user.type(screen.getByPlaceholderText("Причина — студент её увидит"), "Диспут решён в пользу студента")
    await user.click(screen.getByRole("button", { name: "Подтвердить" }))

    expect(adminCancelSupportEngagement).toHaveBeenCalledWith(5, "Диспут решён в пользу студента")
    expect(await screen.findByText("отменено")).toBeInTheDocument()
  })

  it("pauses the engagement after entering a reason", async () => {
    const user = userEvent.setup()
    const engagement = makeEngagement({ status: "active" })
    vi.mocked(fetchAdminDisputes).mockResolvedValue([makeDispute({ id: 1, support_engagement: engagement })])
    vi.mocked(adminPauseSupportEngagement).mockResolvedValue({ ...engagement, status: "paused" })

    render(<CRMDisputesPage />)
    await user.click(await screen.findByRole("button", { name: "Приостановить" }))
    await user.type(screen.getByPlaceholderText("Причина — студент её увидит"), "Разбираем спор")
    await user.click(screen.getByRole("button", { name: "Подтвердить" }))

    expect(adminPauseSupportEngagement).toHaveBeenCalledWith(5, "Разбираем спор")
    expect(await screen.findByText("на паузе")).toBeInTheDocument()
  })

  it("resumes a paused engagement without requiring a reason", async () => {
    const user = userEvent.setup()
    const engagement = makeEngagement({ status: "paused" })
    vi.mocked(fetchAdminDisputes).mockResolvedValue([makeDispute({ id: 1, support_engagement: engagement })])
    vi.mocked(adminResumeSupportEngagement).mockResolvedValue({ ...engagement, status: "active" })

    render(<CRMDisputesPage />)
    await user.click(await screen.findByRole("button", { name: "Возобновить" }))

    expect(adminResumeSupportEngagement).toHaveBeenCalledWith(5)
    expect(await screen.findByText("активно")).toBeInTheDocument()
  })

  it("the confirm button stays disabled until a reason is entered", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminDisputes).mockResolvedValue([
      makeDispute({ support_engagement: makeEngagement({ status: "active" }) }),
    ])
    render(<CRMDisputesPage />)

    await user.click(await screen.findByRole("button", { name: "Прекратить" }))

    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeDisabled()
  })
})
