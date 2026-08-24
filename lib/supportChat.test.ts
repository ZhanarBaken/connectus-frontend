import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  connectSupportChat,
  fetchMySupportChatSession,
  fetchSupportChatHistory,
  getStoredSupportChatSessionId,
  sendSupportChatMessage,
  SupportChatMessage,
} from "./supportChat"

function jsonResponse(
  body: unknown,
  init: { status?: number } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  })
}

function makeMessage(overrides: Partial<SupportChatMessage> = {}): SupportChatMessage {
  return { id: 1, sender: "staff", text: "hi", created_at: "2026-01-01T00:00:00Z", ...overrides }
}

// Minimal fake of the browser WebSocket — mirrors lib/chat.test.ts's
// FakeWebSocket. Tests drive the connection by manually invoking on*
// handlers instead of a real socket.
class FakeWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.CONNECTING
  url: string
  closeCalls = 0

  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  close() {
    this.closeCalls += 1
    this.readyState = FakeWebSocket.CLOSED
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal("fetch", vi.fn())
  FakeWebSocket.instances = []
  vi.stubGlobal("WebSocket", FakeWebSocket)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("fetchSupportChatHistory", () => {
  it("returns the parsed message list", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([makeMessage({ id: 1 }), makeMessage({ id: 2 })]))
    const messages = await fetchSupportChatHistory("s1")
    expect(messages.map((m) => m.id)).toEqual([1, 2])
  })

  it("returns an empty array on a 404 instead of throwing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 404 }))
    await expect(fetchSupportChatHistory("s1")).resolves.toEqual([])
  })

  it("throws on other non-ok statuses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 500 }))
    await expect(fetchSupportChatHistory("s1")).rejects.toThrow("Failed to fetch support chat history")
  })
})

describe("sendSupportChatMessage", () => {
  it("stores the returned session_id for a first message (no session yet)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ session_id: "new-session", message: makeMessage({ sender: "visitor" }) }, { status: 201 }),
    )
    const result = await sendSupportChatMessage("hi", null)
    expect(result.session_id).toBe("new-session")
    expect(getStoredSupportChatSessionId()).toBe("new-session")

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init!.body as string)).toEqual({ text: "hi" })
  })

  it("includes session_id in the body when one is already known", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ session_id: "existing", message: makeMessage() }, { status: 201 }),
    )
    await sendSupportChatMessage("hi again", "existing")

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init!.body as string)).toEqual({ session_id: "existing", text: "hi again" })
  })

  it("throws on a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 429 }))
    await expect(sendSupportChatMessage("hi", null)).rejects.toThrow("Failed to send message")
  })

  it("includes visitor_name when given (a brand new anonymous session)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ session_id: "new-session", message: makeMessage() }, { status: 201 }),
    )
    await sendSupportChatMessage("hi", null, "Айгерим")

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init!.body as string)).toEqual({ visitor_name: "Айгерим", text: "hi" })
  })

  it("omits visitor_name when not given", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ session_id: "existing", message: makeMessage() }, { status: 201 }),
    )
    await sendSupportChatMessage("hi", "existing")

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init!.body as string)).not.toHaveProperty("visitor_name")
  })

  it("attaches the access_token as a Bearer header when the visitor is logged in", async () => {
    localStorage.setItem("access_token", "tok123")
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ session_id: "acct-session", message: makeMessage() }, { status: 201 }),
    )
    await sendSupportChatMessage("hi", null)

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const headers = new Headers(init!.headers)
    expect(headers.get("Authorization")).toBe("Bearer tok123")
  })

  it("does NOT persist the account-bound session_id to localStorage when logged in", async () => {
    // The account's session_id is resumed via fetchMySupportChatSession
    // (auth header), never via this key — writing it here too would
    // let it leak into the anonymous flow after logout (localStorage
    // access_token/refresh_token/role get cleared, this key wouldn't)
    // and let the next visitor on a shared computer silently resume
    // this account's support thread. See lib/api.ts's clearAuth.
    localStorage.setItem("access_token", "tok123")
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ session_id: "acct-session", message: makeMessage() }, { status: 201 }),
    )
    await sendSupportChatMessage("hi", null)

    expect(getStoredSupportChatSessionId()).toBeNull()
  })

  it("does persist the session_id to localStorage when logged out", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ session_id: "anon-session", message: makeMessage() }, { status: 201 }),
    )
    await sendSupportChatMessage("hi", null)

    expect(getStoredSupportChatSessionId()).toBe("anon-session")
  })

  it("sends no Authorization header when logged out", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ session_id: "s1", message: makeMessage() }, { status: 201 }),
    )
    await sendSupportChatMessage("hi", null)

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const headers = new Headers(init!.headers)
    expect(headers.has("Authorization")).toBe(false)
  })
})

describe("fetchMySupportChatSession", () => {
  it("returns null without calling fetch when logged out", async () => {
    const result = await fetchMySupportChatSession()
    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("returns the session and messages when logged in with an existing thread", async () => {
    localStorage.setItem("access_token", "tok123")
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ session_id: "acct-session", messages: [makeMessage({ id: 3 })] }),
    )
    const result = await fetchMySupportChatSession()

    expect(result).toEqual({ session_id: "acct-session", messages: [makeMessage({ id: 3 })] })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    const headers = new Headers(init!.headers)
    expect(headers.get("Authorization")).toBe("Bearer tok123")
  })

  it("returns null on a 404 (no session yet) instead of throwing", async () => {
    localStorage.setItem("access_token", "tok123")
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 404 }))
    await expect(fetchMySupportChatSession()).resolves.toBeNull()
  })

  it("returns null on a network error instead of throwing", async () => {
    localStorage.setItem("access_token", "tok123")
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"))
    await expect(fetchMySupportChatSession()).resolves.toBeNull()
  })
})

describe("connectSupportChat", () => {
  it("opens a socket immediately (no token round-trip) and delivers messages", () => {
    const onMessage = vi.fn()
    const onOpen = vi.fn()
    connectSupportChat("s1", { onMessage, onOpen })

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(FakeWebSocket.instances[0].url).toContain("/ws/support-chat/s1/")
    const ws = FakeWebSocket.instances[0]
    ws.readyState = FakeWebSocket.OPEN
    ws.onopen?.()
    expect(onOpen).toHaveBeenCalledTimes(1)

    ws.onmessage?.({ data: JSON.stringify(makeMessage({ id: 7, text: "ответ" })) })
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 7, text: "ответ" }))
  })

  it("ignores a malformed payload instead of throwing", () => {
    const onMessage = vi.fn()
    connectSupportChat("s1", { onMessage })
    const ws = FakeWebSocket.instances[0]
    expect(() => ws.onmessage?.({ data: "not json" })).not.toThrow()
    expect(onMessage).not.toHaveBeenCalled()
  })

  it("does NOT reconnect on the permanent close code 4004 (unknown session)", async () => {
    vi.useFakeTimers()
    connectSupportChat("s1", { onMessage: vi.fn() })
    expect(FakeWebSocket.instances).toHaveLength(1)

    FakeWebSocket.instances[0].onclose?.({ code: 4004 })
    await vi.advanceTimersByTimeAsync(20000)

    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it("reconnects (opens a new socket) after a non-permanent close code", async () => {
    vi.useFakeTimers()
    connectSupportChat("s1", { onMessage: vi.fn() })
    expect(FakeWebSocket.instances).toHaveLength(1)

    FakeWebSocket.instances[0].onclose?.({ code: 1006 })
    await vi.advanceTimersByTimeAsync(2000)

    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it("stops reconnecting once close() has been called, even if a close event fires late", async () => {
    vi.useFakeTimers()
    const connection = connectSupportChat("s1", { onMessage: vi.fn() })
    const ws = FakeWebSocket.instances[0]
    const lateCloseHandler = ws.onclose

    connection.close()
    expect(ws.closeCalls).toBe(1)
    expect(ws.onclose).toBeNull()

    lateCloseHandler?.({ code: 1006 })
    await vi.advanceTimersByTimeAsync(20000)

    expect(FakeWebSocket.instances).toHaveLength(1)
  })
})
