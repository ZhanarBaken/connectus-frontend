import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { useRouter } from "@/i18n/navigation"
import MessagesPage from "./page"
import { clearAuth, fetchStudentProfile } from "@/lib/api"
import { fetchMyConversations, type ConversationListItem } from "@/lib/chat"
import type { StudentProfile } from "@/types"

vi.mock("@/lib/api")
vi.mock("@/lib/chat")

function makeConversation(overrides: Partial<ConversationListItem> = {}): ConversationListItem {
  return {
    id: 55,
    other_party_name: "Данияр Сериков",
    other_party_photo: null,
    last_message_text: "Здравствуйте!",
    last_message_at: "2026-07-01T10:00:00Z",
    unread_count: 0,
    order_id: 1,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  // useStudentOnboardingGate's own fetch — default to "complete" so it
  // doesn't fire an unrelated redirect in tests that don't care about it.
  vi.mocked(fetchStudentProfile).mockResolvedValue({ is_profile_complete: true } as StudentProfile)
})

describe("MessagesPage — auth gate", () => {
  it("redirects to login with a `next` param when there is no access token", async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    render(<MessagesPage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login?next=/messages"))
    expect(fetchMyConversations).not.toHaveBeenCalled()
  })
})

describe("MessagesPage — student view", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "student")
  })

  it("redirects a student with an incomplete profile to the onboarding wizard (useStudentOnboardingGate)", async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })
    vi.mocked(fetchStudentProfile).mockResolvedValue({ is_profile_complete: false } as StudentProfile)
    vi.mocked(fetchMyConversations).mockResolvedValue([])

    render(<MessagesPage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/student"))
  })

  it("shows an empty state with a link to find a mentor", async () => {
    vi.mocked(fetchMyConversations).mockResolvedValue([])

    render(<MessagesPage />)

    expect(await screen.findByText("Пока нет чатов")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Найти ментора" })).toHaveAttribute("href", "/mentors")
  })

  it("lists conversations with the other party's name, last message, and unread badge", async () => {
    vi.mocked(fetchMyConversations).mockResolvedValue([
      makeConversation({ unread_count: 3 }),
    ])

    render(<MessagesPage />)

    expect(await screen.findByText("Данияр Сериков")).toBeInTheDocument()
    expect(screen.getByText("Здравствуйте!")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("links to the order page when order_id is present", async () => {
    vi.mocked(fetchMyConversations).mockResolvedValue([makeConversation({ order_id: 42 })])

    render(<MessagesPage />)

    expect(await screen.findByRole("link", { name: /Данияр Сериков/ })).toHaveAttribute("href", "/orders/42")
  })

  it("links to the standalone chat page when there is no order", async () => {
    vi.mocked(fetchMyConversations).mockResolvedValue([makeConversation({ order_id: null })])

    render(<MessagesPage />)

    expect(await screen.findByRole("link", { name: /Данияр Сериков/ })).toHaveAttribute("href", "/messages/55")
  })

  it("shows a fallback when there is no last message yet", async () => {
    vi.mocked(fetchMyConversations).mockResolvedValue([
      makeConversation({ last_message_text: "", last_message_at: null }),
    ])

    render(<MessagesPage />)

    expect(await screen.findByText("Нет сообщений")).toBeInTheDocument()
  })

  it("clears auth and redirects to login when fetchMyConversations fails", async () => {
    vi.mocked(fetchMyConversations).mockRejectedValue(new Error("401"))
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    render(<MessagesPage />)

    await waitFor(() => expect(clearAuth).toHaveBeenCalled())
    expect(replace).toHaveBeenCalledWith("/auth/login")
  })
})

describe("MessagesPage — mentor view", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
  })

  it("shows an empty state without the 'find a mentor' link", async () => {
    vi.mocked(fetchMyConversations).mockResolvedValue([])

    render(<MessagesPage />)

    expect(await screen.findByText("Пока нет чатов")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Найти ментора" })).not.toBeInTheDocument()
  })

  it("lists conversations by the student's name", async () => {
    vi.mocked(fetchMyConversations).mockResolvedValue([
      makeConversation({ other_party_name: "Аружан Есенова" }),
    ])

    render(<MessagesPage />)

    expect(await screen.findByText("Аружан Есенова")).toBeInTheDocument()
  })

  it("falls back to the applicant default name when other_party_name is empty", async () => {
    vi.mocked(fetchMyConversations).mockResolvedValue([
      makeConversation({ other_party_name: "" }),
    ])

    render(<MessagesPage />)

    expect(await screen.findByText("Абитуриент")).toBeInTheDocument()
  })
})
