import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, render, screen, waitFor } from "@testing-library/react"
import { useRouter } from "@/i18n/navigation"
import ConversationPage from "./page"
import { authFetch, markChatRead } from "@/lib/api"
import { fetchConversation, fetchChatMessages, connectChat, type Conversation, type ChatConnection } from "@/lib/chat"

vi.mock("@/lib/api")
vi.mock("@/lib/chat")

function okJson(body: unknown): Response {
  return { ok: true, json: async () => body } as Response
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 88,
    mentor: 3,
    student: 7,
    created_at: "2026-07-01T10:00:00Z",
    closed_at: null,
    is_active: true,
    other_party_name: "Данияр Сериков",
    other_party_photo: null,
    ...overrides,
  }
}

// React 19's `use()` suspends until the passed promise settles — see
// app/orders/[id]/page.test.tsx for the same pattern with more detail.
async function renderConversationPage(conversationId: string) {
  const paramsPromise = Promise.resolve({ conversationId })
  let utils!: ReturnType<typeof render>
  await act(async () => {
    utils = render(<ConversationPage params={paramsPromise} />)
  })
  await act(async () => {
    await paramsPromise
  })
  return utils
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem("access_token", "fake-token")
  vi.mocked(authFetch).mockResolvedValue(okJson({ id: 1, email: "student@test.com" }))
  vi.mocked(markChatRead).mockResolvedValue(undefined)
  vi.mocked(fetchChatMessages).mockResolvedValue([])
  vi.mocked(connectChat).mockImplementation(
    () => ({ send: vi.fn(() => true), close: vi.fn() }) as ChatConnection,
  )
})

describe("ConversationPage — auth gate", () => {
  it("redirects to login with a `next` param when there is no access token", async () => {
    localStorage.clear()
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    await renderConversationPage("88")

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login?next=/messages/88"))
    expect(fetchConversation).not.toHaveBeenCalled()
  })
})

describe("ConversationPage — loading the conversation", () => {
  it("redirects to /messages when the conversation can't be loaded (e.g. not a participant)", async () => {
    vi.mocked(fetchConversation).mockRejectedValue(new Error("403"))
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    await renderConversationPage("88")

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/messages"))
  })

  it("renders the other party's name in the header once loaded", async () => {
    vi.mocked(fetchConversation).mockResolvedValue(makeConversation())

    await renderConversationPage("88")

    expect(await screen.findByRole("heading", { name: "Данияр Сериков" })).toBeInTheDocument()
  })

  it("falls back to the mentor default name when other_party_name is empty", async () => {
    vi.mocked(fetchConversation).mockResolvedValue(makeConversation({ other_party_name: "" }))

    await renderConversationPage("88")

    expect(await screen.findByRole("heading", { name: "Ментор" })).toBeInTheDocument()
  })

  it("passes the conversation id through to the chat panel", async () => {
    vi.mocked(fetchConversation).mockResolvedValue(makeConversation({ id: 88 }))

    await renderConversationPage("88")

    await waitFor(() => expect(fetchChatMessages).toHaveBeenCalledWith(88))
    await waitFor(() => expect(connectChat).toHaveBeenCalledWith(88, expect.anything()))
  })
})
