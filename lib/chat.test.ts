import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatMessage } from "@/types"

// `connectChat` calls `getFreshAccessToken` (from ./api) before opening the
// socket. Keep everything else from the real module (authFetch etc. are
// exercised for real against a mocked global `fetch`).
const getFreshAccessTokenMock = vi.fn<() => Promise<string | null>>()

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>()
  return {
    ...actual,
    getFreshAccessToken: (...args: unknown[]) =>
      (getFreshAccessTokenMock as unknown as (...a: unknown[]) => unknown)(...args),
  }
})

import { connectChat, fetchChatMessages, fetchMyConversations, sendChatMessage, startConversation } from "./chat"

// Mirrors the non-exported `WS_RECONNECT_MAX_ATTEMPTS` constant in
// lib/chat.ts (verified against source — kept in sync manually since
// it isn't exported).
const WS_RECONNECT_MAX_ATTEMPTS = 8

// ─── Test helpers ────────────────────────────────────────────────────────────

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  })
}

function makeMessage(id: number): ChatMessage {
  return {
    id,
    sender: 1,
    sender_email: "a@b.com",
    text: `msg-${id}`,
    created_at: new Date(id).toISOString(),
  }
}

// Minimal fake of the browser WebSocket, installed as the global
// constructor so `connectChat` can be exercised without a real socket.
// Tests drive the connection by manually invoking on* handlers.
class FakeWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.CONNECTING
  url: string
  sent: string[] = []
  closeCalls = 0

  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.closeCalls += 1
    this.readyState = FakeWebSocket.CLOSED
  }
}

// Flush the microtask queue enough times for `connect()`'s single
// `await getFreshAccessToken()` to resolve and the socket to be created.
async function flushMicrotasks() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve()
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal("fetch", vi.fn())
  FakeWebSocket.instances = []
  vi.stubGlobal("WebSocket", FakeWebSocket)
  getFreshAccessTokenMock.mockReset()
  getFreshAccessTokenMock.mockResolvedValue("fresh_token")
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// ─── fetchChatMessages ───────────────────────────────────────────────────────

describe("fetchChatMessages", () => {
  it("reverses the backend's newest-first DRF list to oldest-first", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ next: null, previous: null, results: [makeMessage(3), makeMessage(2), makeMessage(1)] }),
    )
    const messages = await fetchChatMessages(1)
    expect(messages.map((m) => m.id)).toEqual([1, 2, 3])
  })

  it("reverses a plain array response the same way", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([makeMessage(2), makeMessage(1)]))
    const messages = await fetchChatMessages(1)
    expect(messages.map((m) => m.id)).toEqual([1, 2])
  })

  it("returns an empty array on a 404 instead of throwing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 404 }))
    await expect(fetchChatMessages(1)).resolves.toEqual([])
  })

  it("throws on other non-ok statuses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 500 }))
    await expect(fetchChatMessages(1)).rejects.toThrow("Failed to fetch chat history")
  })
})

// ─── sendChatMessage ─────────────────────────────────────────────────────────

describe("sendChatMessage", () => {
  it("returns the parsed message on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeMessage(9), { status: 201 }))
    const msg = await sendChatMessage(1, "hi")
    expect(msg.id).toBe(9)
  })

  it("uses err.detail when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ detail: "Chat is closed" }, { status: 400 }))
    await expect(sendChatMessage(1, "hi")).rejects.toThrow("Chat is closed")
  })

  it("falls back to a default message when there is no detail or field error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 400 }))
    await expect(sendChatMessage(1, "hi")).rejects.toThrow("Failed to send the message")
  })

  it("digs into a field-keyed error (e.g. attachment validation) when there is no detail", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ files: ["File type 'text/plain' is not allowed. Allowed: application/pdf."] }, { status: 400 }),
    )
    await expect(sendChatMessage(1, "hi")).rejects.toThrow(
      "File type 'text/plain' is not allowed. Allowed: application/pdf.",
    )
  })
})

// ─── startConversation ───────────────────────────────────────────────────────

describe("startConversation", () => {
  it("returns the parsed conversation on success", async () => {
    const conversation = {
      id: 1, mentor: 3, student: 7, created_at: "2026-01-01T00:00:00Z",
      closed_at: null, is_active: true, other_party_name: "Mentor Name", other_party_photo: null,
    }
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(conversation, { status: 201 }))
    await expect(startConversation(3)).resolves.toEqual(conversation)
  })

  it("uses err.detail when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ detail: "Mentor not found" }, { status: 400 }))
    await expect(startConversation(3)).rejects.toThrow("Mentor not found")
  })

  it("digs into a field-keyed error when there is no detail", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ mentor: ["Invalid pk \"3\" - object does not exist."] }, { status: 400 }),
    )
    await expect(startConversation(3)).rejects.toThrow("Invalid pk \"3\" - object does not exist.")
  })

  it("falls back to a default message when there is no detail or field error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 400 }))
    await expect(startConversation(3)).rejects.toThrow("Failed to start conversation")
  })
})

// ─── fetchMyConversations ────────────────────────────────────────────────────

describe("fetchMyConversations", () => {
  it("returns the parsed conversation list on success", async () => {
    const list = [
      { id: 1, other_party_name: "A", other_party_photo: null, last_message_text: "hi", last_message_at: "2026-01-01T00:00:00Z", unread_count: 2, order_id: 42 },
    ]
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(list))
    await expect(fetchMyConversations()).resolves.toEqual(list)
  })

  it("throws on a non-ok status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 500 }))
    await expect(fetchMyConversations()).rejects.toThrow("Не удалось загрузить список чатов")
  })
})

// ─── connectChat ─────────────────────────────────────────────────────────────

describe("connectChat", () => {
  it("opens a socket and delivers messages via onMessage", async () => {
    const onMessage = vi.fn()
    const onOpen = vi.fn()
    connectChat(1, { onMessage, onOpen })
    await flushMicrotasks()

    expect(FakeWebSocket.instances).toHaveLength(1)
    const ws = FakeWebSocket.instances[0]
    ws.readyState = FakeWebSocket.OPEN
    ws.onopen?.()
    expect(onOpen).toHaveBeenCalledTimes(1)

    ws.onmessage?.({ data: JSON.stringify({ id: 1, sender_id: 2, sender_email: "x@y.com", text: "hi", created_at: "now" }) })
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, sender: 2, sender_email: "x@y.com", text: "hi" }),
    )
  })

  it("surfaces server error payloads via onServerError instead of onMessage", async () => {
    const onMessage = vi.fn()
    const onServerError = vi.fn()
    connectChat(1, { onMessage, onServerError })
    await flushMicrotasks()

    const ws = FakeWebSocket.instances[0]
    ws.onmessage?.({ data: JSON.stringify({ error: "chat closed" }) })

    expect(onServerError).toHaveBeenCalledWith("chat closed")
    expect(onMessage).not.toHaveBeenCalled()
  })

  it("routes presence payloads to onPresenceChange instead of onMessage", async () => {
    const onMessage = vi.fn()
    const onPresenceChange = vi.fn()
    connectChat(1, { onMessage, onPresenceChange })
    await flushMicrotasks()

    const ws = FakeWebSocket.instances[0]
    ws.onmessage?.({ data: JSON.stringify({ type: "presence", online: true }) })
    expect(onPresenceChange).toHaveBeenCalledWith(true)
    expect(onMessage).not.toHaveBeenCalled()

    ws.onmessage?.({ data: JSON.stringify({ type: "presence", online: false }) })
    expect(onPresenceChange).toHaveBeenCalledWith(false)
  })

  it("does NOT reconnect on the permanent close code 4003", async () => {
    vi.useFakeTimers()
    const onMessage = vi.fn()
    connectChat(1, { onMessage })
    await flushMicrotasks()

    expect(FakeWebSocket.instances).toHaveLength(1)
    FakeWebSocket.instances[0].onclose?.({ code: 4003 })

    await vi.advanceTimersByTimeAsync(20000)
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it("reconnects (opens a new socket) after a non-permanent close code", async () => {
    vi.useFakeTimers()
    const onMessage = vi.fn()
    connectChat(1, { onMessage })
    await flushMicrotasks()

    expect(FakeWebSocket.instances).toHaveLength(1)
    FakeWebSocket.instances[0].onclose?.({ code: 1006 })

    // First backoff delay is 1000ms; advance well past it.
    await vi.advanceTimersByTimeAsync(2000)

    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(getFreshAccessTokenMock).toHaveBeenCalledTimes(2)
  })

  it("stops reconnecting once close() has been called, even if a close event fires late", async () => {
    vi.useFakeTimers()
    const onMessage = vi.fn()
    const connection = connectChat(1, { onMessage })
    await flushMicrotasks()

    const ws = FakeWebSocket.instances[0]
    // Capture the handler before close() detaches it, to simulate a
    // close event that was already in flight when close() was called.
    const lateCloseHandler = ws.onclose

    connection.close()
    // Socket was still CONNECTING (never opened), so close() closes it too.
    expect(ws.closeCalls).toBe(1)
    expect(ws.onclose).toBeNull() // handlers detached

    // Simulate the late event using the handler captured beforehand —
    // proves the `closed` flag guards reconnection independently of
    // handler detachment.
    lateCloseHandler?.({ code: 1006 })

    await vi.advanceTimersByTimeAsync(20000)
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it("gives up and calls onError after WS_RECONNECT_MAX_ATTEMPTS failed attempts", async () => {
    vi.useFakeTimers()
    const onMessage = vi.fn()
    const onError = vi.fn()
    connectChat(1, { onMessage, onError })
    await flushMicrotasks()

    expect(FakeWebSocket.instances).toHaveLength(1)

    // Each iteration: close the latest socket (without ever opening it,
    // so reconnectAttempt never resets to 0) and let the backoff timer
    // fire, producing one more socket — until the attempt cap is hit.
    for (let attempt = 0; attempt < WS_RECONNECT_MAX_ATTEMPTS; attempt++) {
      const latest = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
      latest.onclose?.({ code: 1006 })
      await vi.advanceTimersByTimeAsync(20000)
    }

    // 1 initial + WS_RECONNECT_MAX_ATTEMPTS reconnects.
    expect(FakeWebSocket.instances).toHaveLength(1 + WS_RECONNECT_MAX_ATTEMPTS)
    expect(onError).not.toHaveBeenCalled()

    // One more failed close should now exceed the cap and give up.
    const last = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
    last.onclose?.({ code: 1006 })
    await vi.advanceTimersByTimeAsync(20000)

    expect(onError).toHaveBeenCalledTimes(1)
    // No additional socket was created for the attempt that exceeded the cap.
    expect(FakeWebSocket.instances).toHaveLength(1 + WS_RECONNECT_MAX_ATTEMPTS)
  })

  it("send() returns false before the socket is open and true once open", async () => {
    const connection = connectChat(1, { onMessage: vi.fn() })
    await flushMicrotasks()

    expect(connection.send("too early")).toBe(false)

    const ws = FakeWebSocket.instances[0]
    ws.readyState = FakeWebSocket.OPEN
    ws.onopen?.()

    expect(connection.send("hello")).toBe(true)
    expect(ws.sent).toEqual([JSON.stringify({ text: "hello" })])
  })

  it("calls onError without opening a socket when there is no access token", async () => {
    getFreshAccessTokenMock.mockResolvedValue(null)
    const onError = vi.fn()
    connectChat(1, { onMessage: vi.fn(), onError })
    await flushMicrotasks()

    expect(onError).toHaveBeenCalledTimes(1)
    expect(FakeWebSocket.instances).toHaveLength(0)
  })
})
