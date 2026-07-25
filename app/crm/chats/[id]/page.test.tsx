import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useParams, useRouter } from "next/navigation"
import { fetchChatMessages, fetchAdminConversations } from "@/lib/api"
import { AdminConversation, ChatMessage } from "@/types"
import CRMChatDetailPage from "./page"

vi.mock("@/lib/api")

function makeConversation(overrides: Partial<AdminConversation> = {}): AdminConversation {
  return {
    id: 5,
    mentor: 10,
    mentor_name: "Айгерим Ержанова",
    mentor_email: "mentor@example.com",
    student: 20,
    student_name: "Данияр Ахметов",
    student_email: "student@example.com",
    created_at: "2026-01-01T00:00:00Z",
    closed_at: null,
    last_message_at: null,
    ...overrides,
  }
}

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 1,
    sender: 10,
    sender_email: "mentor@example.com",
    is_system: false,
    text: "Здравствуйте!",
    created_at: "2026-01-01T10:00:00Z",
    ...overrides,
  }
}

const back = vi.fn()

describe("CRMChatDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ id: "5" })
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      back,
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    // jsdom doesn't implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
  })

  it("shows the empty state when there are no messages", async () => {
    vi.mocked(fetchChatMessages).mockResolvedValue([])
    vi.mocked(fetchAdminConversations).mockResolvedValue([makeConversation()])
    render(<CRMChatDetailPage />)

    expect(await screen.findByText("Нет сообщений")).toBeInTheDocument()
    expect(fetchChatMessages).toHaveBeenCalledWith(5)
  })

  it("shows an error banner when the fetch fails", async () => {
    vi.mocked(fetchChatMessages).mockRejectedValue(new Error("boom"))
    vi.mocked(fetchAdminConversations).mockResolvedValue([])
    render(<CRMChatDetailPage />)

    expect(await screen.findByText("Не удалось загрузить чат")).toBeInTheDocument()
  })

  it("renders messages in chronological order (reversed from API) with sender labels", async () => {
    vi.mocked(fetchChatMessages).mockResolvedValue([
      makeMessage({ id: 2, text: "Второе сообщение", sender_email: "student@example.com", created_at: "2026-01-01T11:00:00Z" }),
      makeMessage({ id: 1, text: "Первое сообщение", sender_email: "mentor@example.com", created_at: "2026-01-01T10:00:00Z" }),
    ])
    vi.mocked(fetchAdminConversations).mockResolvedValue([makeConversation()])
    render(<CRMChatDetailPage />)

    expect(await screen.findByText("Первое сообщение")).toBeInTheDocument()
    expect(screen.getByText("Второе сообщение")).toBeInTheDocument()
    expect(screen.getByText("Айгерим Ержанова (ментор)")).toBeInTheDocument()
    expect(screen.getByText("Данияр Ахметов (студент)")).toBeInTheDocument()
  })

  it("renders system messages distinctly", async () => {
    vi.mocked(fetchChatMessages).mockResolvedValue([
      makeMessage({ id: 1, is_system: true, text: "Заказ оплачен", sender_email: null }),
    ])
    vi.mocked(fetchAdminConversations).mockResolvedValue([makeConversation()])
    render(<CRMChatDetailPage />)

    expect(await screen.findByText("Заказ оплачен")).toBeInTheDocument()
  })

  it("shows a closed badge and header names once the conversation is found", async () => {
    vi.mocked(fetchChatMessages).mockResolvedValue([])
    vi.mocked(fetchAdminConversations).mockResolvedValue([
      makeConversation({ closed_at: "2026-01-02T00:00:00Z" }),
    ])
    render(<CRMChatDetailPage />)

    await screen.findByText("Нет сообщений")
    expect(screen.getByText("закрыт")).toBeInTheDocument()
  })

  it("is read-only — no message input is rendered", async () => {
    vi.mocked(fetchChatMessages).mockResolvedValue([])
    vi.mocked(fetchAdminConversations).mockResolvedValue([makeConversation()])
    render(<CRMChatDetailPage />)

    await screen.findByText("Нет сообщений")
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(screen.getByText("Режим просмотра — отправка сообщений недоступна")).toBeInTheDocument()
  })

  it("navigates back when clicking the back button", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchChatMessages).mockResolvedValue([])
    vi.mocked(fetchAdminConversations).mockResolvedValue([makeConversation()])
    render(<CRMChatDetailPage />)
    await screen.findByText("Нет сообщений")

    await user.click(screen.getByRole("button", { name: /Назад/ }))
    expect(back).toHaveBeenCalled()
  })
})
