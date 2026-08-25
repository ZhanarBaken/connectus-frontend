import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchOrderDocuments } from "@/lib/api"
import { AdminOrder, OrderDocument } from "@/types"
import { PaymentConfirmModal } from "./PaymentConfirmModal"

vi.mock("@/lib/api")

function makeOrder(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 1,
    student: 1,
    student_info: { id: 1, full_name: "Данияр Ахметов", current_school_or_university: "", profile_photo: null },
    mentor: 2,
    mentor_service: 3,
    service_title: "Проверка эссе",
    payout_category: "primary_consultation",
    subtotal: "15000",
    total_price: "15000",
    platform_fee: "1500",
    mentor_payout_amount: "13500",
    payment_status: "unpaid",
    order_status: "pending_payment",
    payment_instructions: { account_details: "Kaspi 4400 **** **** 1234", whatsapp_link: "", tg_sent_to_user: false },
    conversation_id: null,
    support_engagement: null,
    installment_number: null,
    engagement_duration_months: null,
    engagement_status: null,
    scheduled_at: null,
    due_at: null,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    mentor_info: { id: 2, full_name: "Айгерим Ержанова", profile_photo: null },
    student_email: "student@example.com",
    mentor_email: "mentor@example.com",
    dispute_id: null,
    ...overrides,
  } as AdminOrder
}

function makeReceipt(overrides: Partial<OrderDocument> = {}): OrderDocument {
  return {
    id: 9,
    kind: "payment_receipt",
    status: "pending",
    original_filename: "receipt.pdf",
    content_type: "application/pdf",
    size_bytes: 1234,
    description: "",
    download_url: "https://files.example.com/receipt.pdf",
    uploaded_by: 1,
    uploaded_by_email: "student@example.com",
    uploaded_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("PaymentConfirmModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows a link to the student's uploaded receipt when one exists", async () => {
    vi.mocked(fetchOrderDocuments).mockResolvedValue([makeReceipt()])
    render(<PaymentConfirmModal order={makeOrder()} onClose={vi.fn()} onConfirmed={vi.fn()} onRejected={vi.fn()} />)

    const link = await screen.findByRole("link", { name: /receipt.pdf/ })
    expect(link).toHaveAttribute("href", "https://files.example.com/receipt.pdf")
  })

  it("shows a warning instead of a link when no receipt was uploaded yet", async () => {
    vi.mocked(fetchOrderDocuments).mockResolvedValue([])
    render(<PaymentConfirmModal order={makeOrder()} onClose={vi.fn()} onConfirmed={vi.fn()} onRejected={vi.fn()} />)

    expect(await screen.findByText("Студент ещё не загрузил квитанцию.")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("ignores non-receipt documents on the same order", async () => {
    vi.mocked(fetchOrderDocuments).mockResolvedValue([makeReceipt({ id: 1, kind: "general", original_filename: "notes.pdf" })])
    render(<PaymentConfirmModal order={makeOrder()} onClose={vi.fn()} onConfirmed={vi.fn()} onRejected={vi.fn()} />)

    expect(await screen.findByText("Студент ещё не загрузил квитанцию.")).toBeInTheDocument()
  })

  it("shows the payment account details", async () => {
    vi.mocked(fetchOrderDocuments).mockResolvedValue([])
    render(<PaymentConfirmModal order={makeOrder()} onClose={vi.fn()} onConfirmed={vi.fn()} onRejected={vi.fn()} />)

    expect(await screen.findByText(/Kaspi 4400/)).toBeInTheDocument()
  })
})
