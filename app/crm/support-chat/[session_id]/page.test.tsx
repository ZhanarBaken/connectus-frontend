import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useParams, useRouter } from "next/navigation"
import { fetchAdminSupportChatMessages, sendAdminSupportChatReply } from "@/lib/api"
import { SupportChatMessage } from "@/lib/supportChat"
import CRMSupportChatDetailPage from "./page"

vi.mock("@/lib/api")

function makeMessage(overrides: Partial<SupportChatMessage> = {}): SupportChatMessage {
  return {
    id: 1,
    sender: "visitor",
    text: "Здравствуйте!",
    created_at: "2026-01-01T10:00:00Z",
    ...overrides,
  }
}

const back = vi.fn()

describe("CRMSupportChatDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ session_id: "11111111-1111-1111-1111-111111111111" })
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      back,
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    Element.prototype.scrollIntoView = vi.fn()
  })

  it("shows the empty state when there are no messages", async () => {
    vi.mocked(fetchAdminSupportChatMessages).mockResolvedValue([])
    render(<CRMSupportChatDetailPage />)

    expect(await screen.findByText("Нет сообщений")).toBeInTheDocument()
    expect(fetchAdminSupportChatMessages).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111")
  })

  it("shows an error banner when the fetch fails", async () => {
    vi.mocked(fetchAdminSupportChatMessages).mockRejectedValue(new Error("boom"))
    render(<CRMSupportChatDetailPage />)

    expect(await screen.findByText("Не удалось загрузить чат")).toBeInTheDocument()
  })

  it("renders visitor and staff bubbles distinctly", async () => {
    vi.mocked(fetchAdminSupportChatMessages).mockResolvedValue([
      makeMessage({ id: 1, sender: "visitor", text: "У меня вопрос" }),
      makeMessage({ id: 2, sender: "staff", text: "Слушаю вас" }),
    ])
    render(<CRMSupportChatDetailPage />)

    expect(await screen.findByText("У меня вопрос")).toBeInTheDocument()
    expect(screen.getByText("Слушаю вас")).toBeInTheDocument()
    expect(screen.getByText("Посетитель")).toBeInTheDocument()
    expect(screen.getByText("Поддержка")).toBeInTheDocument()
  })

  it("sends a reply and appends it to the thread", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminSupportChatMessages).mockResolvedValue([])
    vi.mocked(sendAdminSupportChatReply).mockResolvedValue(
      makeMessage({ id: 3, sender: "staff", text: "Здравствуйте, чем помочь?" }),
    )
    render(<CRMSupportChatDetailPage />)
    await screen.findByText("Нет сообщений")

    await user.type(screen.getByPlaceholderText("Ответить посетителю..."), "Здравствуйте, чем помочь?")
    await user.click(screen.getByRole("button", { name: "Отправить" }))

    expect(sendAdminSupportChatReply).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      "Здравствуйте, чем помочь?",
    )
    expect(await screen.findByText("Здравствуйте, чем помочь?")).toBeInTheDocument()
  })

  it("shows an error and keeps the draft when sending fails", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminSupportChatMessages).mockResolvedValue([])
    vi.mocked(sendAdminSupportChatReply).mockRejectedValue(new Error("Не удалось отправить ответ"))
    render(<CRMSupportChatDetailPage />)
    await screen.findByText("Нет сообщений")

    await user.type(screen.getByPlaceholderText("Ответить посетителю..."), "Привет")
    await user.click(screen.getByRole("button", { name: "Отправить" }))

    expect(await screen.findByText("Не удалось отправить ответ")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Ответить посетителю...")).toHaveValue("Привет")
  })

  it("navigates back when clicking the back button", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminSupportChatMessages).mockResolvedValue([])
    render(<CRMSupportChatDetailPage />)
    await screen.findByText("Нет сообщений")

    await user.click(screen.getByRole("button", { name: /Назад/ }))
    expect(back).toHaveBeenCalled()
  })
})
