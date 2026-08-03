import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import SupportChatActions from "./SupportChatActions"

vi.mock("@/lib/api")

import {
  createSupportInvoice, createSupportTask, fetchEngagementDocuments, fetchMentorServices,
} from "@/lib/api"
import type { OrderDocument } from "@/types"

function makeDocument(overrides: Partial<OrderDocument> = {}): OrderDocument {
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
    ...overrides,
  }
}

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
    document: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchMentorServices).mockResolvedValue([])
  vi.mocked(fetchEngagementDocuments).mockResolvedValue([])
})

describe("SupportChatActions — task attachment", () => {
  it("shows the attach-file toggle, then the existing/new options once clicked", async () => {
    vi.mocked(fetchEngagementDocuments).mockResolvedValue([makeDocument()])

    render(<SupportChatActions studentId={7} engagementId={5} />)

    fireEvent.click(await screen.findByText("Добавить задачу"))
    expect(screen.queryByText("Выбрать загруженный файл")).not.toBeInTheDocument()

    fireEvent.click(screen.getByText("Прикрепить файл"))

    await waitFor(() => expect(screen.getByText("essay.pdf")).toBeInTheDocument())
    expect(screen.getByText("Загрузить новый файл")).toBeInTheDocument()
  })

  it("does not offer the existing-file dropdown when there are no documents yet", async () => {
    render(<SupportChatActions studentId={7} engagementId={5} />)

    fireEvent.click(await screen.findByText("Добавить задачу"))
    fireEvent.click(screen.getByText("Прикрепить файл"))

    expect(screen.queryByText("Выбрать загруженный файл")).not.toBeInTheDocument()
    expect(screen.getByText("Загрузить новый файл")).toBeInTheDocument()
  })

  it("picking an existing document shows it as a chip and submits with documentId", async () => {
    const doc = makeDocument({ id: 42, original_filename: "transcript.pdf" })
    vi.mocked(fetchEngagementDocuments).mockResolvedValue([doc])
    vi.mocked(createSupportTask).mockResolvedValue(makeTask({ document: doc }))

    render(<SupportChatActions studentId={7} engagementId={5} />)

    fireEvent.click(await screen.findByText("Добавить задачу"))
    fireEvent.change(screen.getByPlaceholderText("Новая задача"), { target: { value: "Проверь транскрипт" } })
    fireEvent.click(screen.getByText("Прикрепить файл"))
    await waitFor(() => expect(screen.getByText("transcript.pdf")).toBeInTheDocument())

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "42" } })

    // Picking closes the picker and shows a single chip (the select
    // itself disappears once a document is chosen).
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(screen.getByText("transcript.pdf")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Добавить" }))

    await waitFor(() =>
      expect(createSupportTask).toHaveBeenCalledWith(5, {
        title: "Проверь транскрипт", deadline: null, documentId: 42, file: undefined,
      }),
    )
  })

  it("uploading a new file shows it as a chip and submits with file", async () => {
    vi.mocked(createSupportTask).mockResolvedValue(makeTask({
      document: makeDocument({ id: 99, original_filename: "notes.pdf" }),
    }))

    const { container } = render(<SupportChatActions studentId={7} engagementId={5} />)

    fireEvent.click(await screen.findByText("Добавить задачу"))
    fireEvent.change(screen.getByPlaceholderText("Новая задача"), { target: { value: "Новая задача" } })
    fireEvent.click(screen.getByText("Прикрепить файл"))

    const file = new File(["x"], "notes.pdf", { type: "application/pdf" })
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(await screen.findByText("notes.pdf")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Добавить" }))

    await waitFor(() =>
      expect(createSupportTask).toHaveBeenCalledWith(5, {
        title: "Новая задача", deadline: null, documentId: undefined, file,
      }),
    )
  })

  it("removing the attachment clears it and re-shows the attach toggle", async () => {
    vi.mocked(fetchEngagementDocuments).mockResolvedValue([makeDocument({ id: 42, original_filename: "a.pdf" })])

    render(<SupportChatActions studentId={7} engagementId={5} />)

    fireEvent.click(await screen.findByText("Добавить задачу"))
    fireEvent.click(screen.getByText("Прикрепить файл"))
    await waitFor(() => expect(screen.getByText("a.pdf")).toBeInTheDocument())
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "42" } })
    expect(await screen.findAllByText("a.pdf")).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: "Убрать вложение" }))

    expect(screen.queryByText("a.pdf")).not.toBeInTheDocument()
    expect(screen.getByText("Прикрепить файл")).toBeInTheDocument()
  })

  it("shows an error in the picker when the existing-documents list fails to load", async () => {
    vi.mocked(fetchEngagementDocuments).mockRejectedValue(new Error("network"))

    render(<SupportChatActions studentId={7} engagementId={5} />)

    fireEvent.click(await screen.findByText("Добавить задачу"))
    fireEvent.click(screen.getByText("Прикрепить файл"))

    expect(await screen.findByText("Не удалось загрузить список файлов")).toBeInTheDocument()
    // Uploading a new file must still work even if the existing-list fetch failed.
    expect(screen.getByText("Загрузить новый файл")).toBeInTheDocument()
  })

  it("creating a task without ever touching the attachment submits with no document/file", async () => {
    vi.mocked(createSupportTask).mockResolvedValue(makeTask())

    render(<SupportChatActions studentId={7} engagementId={5} />)

    fireEvent.click(await screen.findByText("Добавить задачу"))
    fireEvent.change(screen.getByPlaceholderText("Новая задача"), { target: { value: "Просто задача" } })
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }))

    await waitFor(() =>
      expect(createSupportTask).toHaveBeenCalledWith(5, {
        title: "Просто задача", deadline: null, documentId: undefined, file: undefined,
      }),
    )
  })
})

describe("SupportChatActions — invoice (regression, unrelated to attachments)", () => {
  it("still sends an invoice normally", async () => {
    vi.mocked(fetchMentorServices).mockResolvedValue([{
      id: 10, title: "Сопровождение", description: "", price: "500000", currency: "KZT",
      duration_minutes: 60, payout_category: "support", grade_min: null, grade_max: null,
      meetings_min: 4, meetings_max: 8, duration_months_min: 6, duration_months_max: 12,
      is_price_negotiable: false, intro_call_enabled: true, is_active: true,
    }])
    vi.mocked(createSupportInvoice).mockResolvedValue({
      id: 1, student: 7, mentor: 3, mentor_service: 10, service_title: "Сопровождение",
      payout_category: "support", subtotal: "31250.00", total_price: "31250.00",
      platform_fee: "6250", mentor_payout_amount: "25000.00", payment_status: "unpaid",
      order_status: "pending_payment", payment_instructions: null, conversation_id: 55,
      support_engagement: 5, installment_number: 1, engagement_duration_months: 6,
      engagement_status: "awaiting_payment", scheduled_at: null, due_at: null, completed_at: null,
      created_at: "2026-07-01T10:00:00Z", updated_at: "2026-07-01T10:00:00Z",
    } as unknown as import("@/types").Order)

    render(<SupportChatActions studentId={7} engagementId={null} />)

    fireEvent.click(await screen.findByText("Отправить заявку"))
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "10" } })
    fireEvent.change(screen.getByPlaceholderText("Цена, ₸"), { target: { value: "25000" } })
    fireEvent.change(screen.getByPlaceholderText("Срок, мес"), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }))

    await waitFor(() => expect(createSupportInvoice).toHaveBeenCalledWith(10, 7, "25000", 1))
  })
})
