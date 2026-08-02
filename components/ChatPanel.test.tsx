import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, render, screen, waitFor } from "@testing-library/react"
import ChatPanel from "./ChatPanel"
import { markChatRead } from "@/lib/api"
import { fetchChatMessages, connectChat } from "@/lib/chat"
import type { ChatMessage } from "@/types"

vi.mock("@/lib/api")
vi.mock("@/lib/chat")

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(markChatRead).mockResolvedValue(undefined)
  vi.mocked(fetchChatMessages).mockResolvedValue([])
})

describe("ChatPanel — onConnectedChange", () => {
  it("mirrors the websocket connected state out via the callback", async () => {
    let handlers: Parameters<typeof connectChat>[1] | undefined
    vi.mocked(connectChat).mockImplementation((_id, h) => {
      handlers = h
      return { send: vi.fn(() => true), close: vi.fn() }
    })
    const onConnectedChange = vi.fn()

    render(<ChatPanel conversationId={1} currentUserId={1} onConnectedChange={onConnectedChange} />)

    await waitFor(() => expect(handlers).toBeDefined())
    expect(onConnectedChange).toHaveBeenLastCalledWith(false)

    act(() => handlers!.onOpen?.())
    await waitFor(() => expect(onConnectedChange).toHaveBeenLastCalledWith(true))

    act(() => handlers!.onClose?.(1000))
    await waitFor(() => expect(onConnectedChange).toHaveBeenLastCalledWith(false))
  })
})

describe("ChatPanel — onPreviewChange", () => {
  it("reports null when there is no message history", async () => {
    vi.mocked(connectChat).mockImplementation(() => ({ send: vi.fn(() => true), close: vi.fn() }))
    const onPreviewChange = vi.fn()

    render(<ChatPanel conversationId={1} currentUserId={1} onPreviewChange={onPreviewChange} />)

    await waitFor(() => expect(onPreviewChange).toHaveBeenCalledWith(null))
  })

  it("reports the last message's text once history loads", async () => {
    vi.mocked(fetchChatMessages).mockResolvedValue([
      { id: 1, sender: 1, sender_email: "a@b.com", text: "Привет!", created_at: "2026-07-01T10:00:00Z" },
    ])
    vi.mocked(connectChat).mockImplementation(() => ({ send: vi.fn(() => true), close: vi.fn() }))
    const onPreviewChange = vi.fn()

    render(<ChatPanel conversationId={1} currentUserId={1} onPreviewChange={onPreviewChange} />)

    await waitFor(() => expect(onPreviewChange).toHaveBeenLastCalledWith("Привет!"))
  })

  it("falls back to an attachment label when the last message has no text", async () => {
    const msg: ChatMessage = {
      id: 1, sender: 1, sender_email: "a@b.com", text: "", created_at: "2026-07-01T10:00:00Z",
      attachments: [{ id: 1, original_filename: "doc.pdf", content_type: "application/pdf", size_bytes: 100, download_url: "/x" }],
    }
    vi.mocked(fetchChatMessages).mockResolvedValue([msg])
    vi.mocked(connectChat).mockImplementation(() => ({ send: vi.fn(() => true), close: vi.fn() }))
    const onPreviewChange = vi.fn()

    render(<ChatPanel conversationId={1} currentUserId={1} onPreviewChange={onPreviewChange} />)

    await waitFor(() => expect(onPreviewChange).toHaveBeenLastCalledWith("📎 Вложение"))
  })
})

describe("ChatPanel — refetchTrigger", () => {
  it("does not refetch on mount, but does when the trigger changes", async () => {
    vi.mocked(connectChat).mockImplementation(() => ({ send: vi.fn(() => true), close: vi.fn() }))

    const { rerender } = render(<ChatPanel conversationId={1} currentUserId={1} refetchTrigger={0} />)
    await waitFor(() => expect(fetchChatMessages).toHaveBeenCalledTimes(1))

    rerender(<ChatPanel conversationId={1} currentUserId={1} refetchTrigger={1} />)
    await waitFor(() => expect(fetchChatMessages).toHaveBeenCalledTimes(2))
  })
})

describe("ChatPanel — header overrides", () => {
  it("renders titleOverride instead of the default title, and leadingHeaderAction before it", async () => {
    vi.mocked(connectChat).mockImplementation(() => ({ send: vi.fn(() => true), close: vi.fn() }))

    render(
      <ChatPanel
        conversationId={1}
        currentUserId={1}
        leadingHeaderAction={<button>back</button>}
        titleOverride={<h1>Данияр Сериков</h1>}
      />,
    )

    expect(await screen.findByRole("heading", { name: "Данияр Сериков" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "back" })).toBeInTheDocument()
    expect(screen.queryByText("Сообщения")).not.toBeInTheDocument()
  })

  it("renders the default title when no override is given", async () => {
    vi.mocked(connectChat).mockImplementation(() => ({ send: vi.fn(() => true), close: vi.fn() }))

    render(<ChatPanel conversationId={1} currentUserId={1} />)

    expect(await screen.findByText("Сообщения")).toBeInTheDocument()
  })
})
