import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchAdminConversations } from "@/lib/api"
import { AdminConversation } from "@/types"
import CRMChatsPage from "./page"

vi.mock("@/lib/api")

function makeConversation(overrides: Partial<AdminConversation> = {}): AdminConversation {
  return {
    id: 1,
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

describe("CRMChatsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows the empty state when there are no conversations", async () => {
    vi.mocked(fetchAdminConversations).mockResolvedValue([])
    render(<CRMChatsPage />)

    expect(await screen.findByText("Нет чатов")).toBeInTheDocument()
  })

  it("shows an error banner when the fetch fails", async () => {
    vi.mocked(fetchAdminConversations).mockRejectedValue(new Error("boom"))
    render(<CRMChatsPage />)

    expect(await screen.findByText("Не удалось загрузить чаты")).toBeInTheDocument()
  })

  it("renders conversations with a link to the detail page and a closed badge", async () => {
    vi.mocked(fetchAdminConversations).mockResolvedValue([
      makeConversation({ id: 5, closed_at: "2026-01-03T00:00:00Z" }),
    ])
    render(<CRMChatsPage />)

    const link = await screen.findByRole("link", { name: /Айгерим Ержанова.*Данияр Ахметов/ })
    expect(link).toHaveAttribute("href", "/crm/chats/5")
    expect(screen.getByText("закрыт")).toBeInTheDocument()
    expect(screen.getByText("1 всего")).toBeInTheDocument()
  })

  it("filters conversations by mentor/student name or email", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminConversations).mockResolvedValue([
      makeConversation({ id: 1, mentor_name: "Айгерим Ержанова", student_name: "Данияр Ахметов" }),
      makeConversation({ id: 2, mentor_name: "Бекзат Смагулов", student_name: "Асем Нурланова", mentor_email: "bekzat@example.com", student_email: "asem@example.com" }),
    ])
    render(<CRMChatsPage />)
    await screen.findByText("2 всего")

    await user.type(screen.getByPlaceholderText("Поиск по ментору или студенту..."), "Бекзат")

    expect(screen.getByText("Бекзат Смагулов")).toBeInTheDocument()
    expect(screen.queryByText("Айгерим Ержанова")).not.toBeInTheDocument()
  })
})
