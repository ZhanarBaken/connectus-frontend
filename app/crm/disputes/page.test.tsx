import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchAdminDisputes, resolveDispute } from "@/lib/api"
import { AdminDispute } from "@/types"
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
})
