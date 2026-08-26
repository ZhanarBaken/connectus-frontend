import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchAdminSupportChatSessions } from "@/lib/api"
import { AdminSupportChatSession } from "@/types"
import CRMSupportChatPage from "./page"

vi.mock("@/lib/api")

function makeSession(overrides: Partial<AdminSupportChatSession> = {}): AdminSupportChatSession {
  return {
    session_id: "11111111-1111-1111-1111-111111111111",
    visitor_name: "Аружан",
    user: null,
    user_email: null,
    user_role: null,
    created_at: "2026-01-01T00:00:00Z",
    last_message_at: "2026-01-01T00:05:00Z",
    last_message_text: "Здравствуйте, у меня вопрос",
    ...overrides,
  }
}

describe("CRMSupportChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows the empty state when there are no sessions", async () => {
    vi.mocked(fetchAdminSupportChatSessions).mockResolvedValue([])
    render(<CRMSupportChatPage />)

    expect(await screen.findByText("Нет обращений")).toBeInTheDocument()
  })

  it("shows an error banner when the fetch fails", async () => {
    vi.mocked(fetchAdminSupportChatSessions).mockRejectedValue(new Error("boom"))
    render(<CRMSupportChatPage />)

    expect(await screen.findByText("Не удалось загрузить чаты поддержки")).toBeInTheDocument()
  })

  it("renders an anonymous visitor session with a link to the detail page", async () => {
    vi.mocked(fetchAdminSupportChatSessions).mockResolvedValue([makeSession()])
    render(<CRMSupportChatPage />)

    const link = await screen.findByRole("link", { name: /Аружан/ })
    expect(link).toHaveAttribute("href", "/crm/support-chat/11111111-1111-1111-1111-111111111111")
    expect(screen.getByText("Здравствуйте, у меня вопрос")).toBeInTheDocument()
  })

  it("prefers the account email and shows a role badge for a logged-in visitor", async () => {
    vi.mocked(fetchAdminSupportChatSessions).mockResolvedValue([
      makeSession({ user: 5, user_email: "student@example.com", user_role: "student", visitor_name: "" }),
    ])
    render(<CRMSupportChatPage />)

    expect(await screen.findByText("student@example.com")).toBeInTheDocument()
    expect(screen.getByText("student")).toBeInTheDocument()
  })

  it("filters sessions by visitor name or account email", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminSupportChatSessions).mockResolvedValue([
      makeSession({ session_id: "a", visitor_name: "Аружан" }),
      makeSession({ session_id: "b", visitor_name: "Бекзат" }),
    ])
    render(<CRMSupportChatPage />)
    await screen.findByText("Аружан")

    await user.type(screen.getByPlaceholderText("Поиск по имени или email..."), "Бекзат")

    expect(screen.getByText("Бекзат")).toBeInTheDocument()
    expect(screen.queryByText("Аружан")).not.toBeInTheDocument()
  })
})
