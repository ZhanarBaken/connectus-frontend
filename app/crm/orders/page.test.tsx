import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchAdminOrders } from "@/lib/api"
import CRMOrdersPage from "./page"

// The Kanban board itself (columns, drag-and-drop, modals) is covered
// in depth by components/crm/OrderKanbanBoard.test.tsx — this page is
// now just a thin wrapper around it.
vi.mock("@/lib/api")

describe("CRMOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the order Kanban board", async () => {
    vi.mocked(fetchAdminOrders).mockResolvedValue([])
    render(<CRMOrdersPage />)

    expect(await screen.findByText("Заказы")).toBeInTheDocument()
    expect(screen.getByTestId("kanban-column-pending_payment")).toBeInTheDocument()
  })
})
