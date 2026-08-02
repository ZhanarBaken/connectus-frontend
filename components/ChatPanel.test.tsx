import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react"
import ChatPanel from "./ChatPanel"
import { markChatRead } from "@/lib/api"
import { fetchChatMessages, connectChat, sendChatMessage } from "@/lib/chat"
import type { ChatMessage } from "@/types"

vi.mock("@/lib/api")
vi.mock("@/lib/chat")

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(markChatRead).mockResolvedValue(undefined)
  vi.mocked(fetchChatMessages).mockResolvedValue([])
})

describe("ChatPanel — onOtherPartyOnlineChange", () => {
  it("mirrors the OTHER participant's presence, not our own connection state", async () => {
    let handlers: Parameters<typeof connectChat>[1] | undefined
    vi.mocked(connectChat).mockImplementation((_id, h) => {
      handlers = h
      return { send: vi.fn(() => true), close: vi.fn() }
    })
    const onOtherPartyOnlineChange = vi.fn()

    render(<ChatPanel conversationId={1} currentUserId={1} onOtherPartyOnlineChange={onOtherPartyOnlineChange} />)

    await waitFor(() => expect(handlers).toBeDefined())
    expect(onOtherPartyOnlineChange).toHaveBeenLastCalledWith(false)

    // Our OWN socket opening must NOT flip this — only a presence message about the other side does.
    act(() => handlers!.onOpen?.())
    expect(onOtherPartyOnlineChange).toHaveBeenLastCalledWith(false)

    act(() => handlers!.onPresenceChange?.(true))
    await waitFor(() => expect(onOtherPartyOnlineChange).toHaveBeenLastCalledWith(true))

    act(() => handlers!.onPresenceChange?.(false))
    await waitFor(() => expect(onOtherPartyOnlineChange).toHaveBeenLastCalledWith(false))
  })

  it("resets to offline when the conversationId prop changes on an already-mounted instance", async () => {
    const connections: { close: ReturnType<typeof vi.fn> }[] = []
    let handlers: Parameters<typeof connectChat>[1] | undefined
    vi.mocked(connectChat).mockImplementation((_id, h) => {
      handlers = h
      const conn = { send: vi.fn(() => true), close: vi.fn() }
      connections.push(conn)
      return conn
    })
    const onOtherPartyOnlineChange = vi.fn()

    const { rerender } = render(
      <ChatPanel conversationId={1} currentUserId={1} onOtherPartyOnlineChange={onOtherPartyOnlineChange} />,
    )
    await waitFor(() => expect(handlers).toBeDefined())

    act(() => handlers!.onPresenceChange?.(true))
    await waitFor(() => expect(onOtherPartyOnlineChange).toHaveBeenLastCalledWith(true))

    rerender(
      <ChatPanel conversationId={2} currentUserId={1} onOtherPartyOnlineChange={onOtherPartyOnlineChange} />,
    )

    // Switching conversations must not carry the old conversation's
    // presence over — the old socket is torn down and we don't know
    // the new conversation's other-party state yet.
    await waitFor(() => expect(onOtherPartyOnlineChange).toHaveBeenLastCalledWith(false))
    expect(connections[0].close).toHaveBeenCalled()
    expect(connectChat).toHaveBeenCalledWith(2, expect.anything())
  })

  it("resets to offline when our own socket disconnects, since presence is no longer known", async () => {
    let handlers: Parameters<typeof connectChat>[1] | undefined
    vi.mocked(connectChat).mockImplementation((_id, h) => {
      handlers = h
      return { send: vi.fn(() => true), close: vi.fn() }
    })
    const onOtherPartyOnlineChange = vi.fn()

    render(<ChatPanel conversationId={1} currentUserId={1} onOtherPartyOnlineChange={onOtherPartyOnlineChange} />)
    await waitFor(() => expect(handlers).toBeDefined())

    act(() => handlers!.onPresenceChange?.(true))
    await waitFor(() => expect(onOtherPartyOnlineChange).toHaveBeenLastCalledWith(true))

    act(() => handlers!.onClose?.(1000))
    await waitFor(() => expect(onOtherPartyOnlineChange).toHaveBeenLastCalledWith(false))
  })
})

describe("ChatPanel — status pill", () => {
  it("shows 'connecting' while our own socket is still opening", async () => {
    vi.mocked(connectChat).mockImplementation(() => ({ send: vi.fn(() => true), close: vi.fn() }))

    render(<ChatPanel conversationId={1} currentUserId={1} />)

    expect(await screen.findByText("Подключение...")).toBeInTheDocument()
  })

  it("shows 'offline' once connected if the other participant isn't there", async () => {
    let handlers: Parameters<typeof connectChat>[1] | undefined
    vi.mocked(connectChat).mockImplementation((_id, h) => {
      handlers = h
      return { send: vi.fn(() => true), close: vi.fn() }
    })

    render(<ChatPanel conversationId={1} currentUserId={1} />)
    await waitFor(() => expect(handlers).toBeDefined())
    act(() => handlers!.onOpen?.())
    act(() => handlers!.onPresenceChange?.(false))

    expect(await screen.findByText("Не в сети")).toBeInTheDocument()
    expect(screen.queryByText("В сети")).not.toBeInTheDocument()
  })

  it("shows 'online' once connected and the other participant is present", async () => {
    let handlers: Parameters<typeof connectChat>[1] | undefined
    vi.mocked(connectChat).mockImplementation((_id, h) => {
      handlers = h
      return { send: vi.fn(() => true), close: vi.fn() }
    })

    render(<ChatPanel conversationId={1} currentUserId={1} />)
    await waitFor(() => expect(handlers).toBeDefined())
    act(() => handlers!.onOpen?.())
    act(() => handlers!.onPresenceChange?.(true))

    expect(await screen.findByText("В сети")).toBeInTheDocument()
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

describe("ChatPanel — onAttachmentSent", () => {
  it("fires after a file attachment is successfully sent", async () => {
    let handlers: Parameters<typeof connectChat>[1] | undefined
    vi.mocked(connectChat).mockImplementation((_id, h) => {
      handlers = h
      return { send: vi.fn(() => true), close: vi.fn() }
    })
    vi.mocked(sendChatMessage).mockResolvedValue({
      id: 1, sender: 1, sender_email: "a@b.com", text: "", created_at: "2026-07-01T10:00:00Z",
    })
    const onAttachmentSent = vi.fn()

    const { container } = render(
      <ChatPanel conversationId={1} currentUserId={1} onAttachmentSent={onAttachmentSent} />,
    )
    await waitFor(() => expect(handlers).toBeDefined())
    act(() => handlers!.onOpen?.())

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" })
    fireEvent.change(fileInput, { target: { files: [file] } })

    const form = container.querySelector("form") as HTMLFormElement
    fireEvent.submit(form)

    await waitFor(() => expect(sendChatMessage).toHaveBeenCalled())
    await waitFor(() => expect(onAttachmentSent).toHaveBeenCalled())
  })

  it("does not fire when sending the attachment fails", async () => {
    let handlers: Parameters<typeof connectChat>[1] | undefined
    vi.mocked(connectChat).mockImplementation((_id, h) => {
      handlers = h
      return { send: vi.fn(() => true), close: vi.fn() }
    })
    vi.mocked(sendChatMessage).mockRejectedValue(new Error("boom"))
    const onAttachmentSent = vi.fn()

    const { container } = render(
      <ChatPanel conversationId={1} currentUserId={1} onAttachmentSent={onAttachmentSent} />,
    )
    await waitFor(() => expect(handlers).toBeDefined())
    act(() => handlers!.onOpen?.())

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" })
    fireEvent.change(fileInput, { target: { files: [file] } })

    const form = container.querySelector("form") as HTMLFormElement
    fireEvent.submit(form)

    await waitFor(() => expect(sendChatMessage).toHaveBeenCalled())
    expect(onAttachmentSent).not.toHaveBeenCalled()
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
