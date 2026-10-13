import { useState } from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  startCall as startCallApi,
  endCall as endCallApi,
  getFreshAccessToken,
  cancelCallPreparation,
} from "@/lib/api"
import CallProvider, { useCall } from "@/components/CallProvider"
import type { CallStartResponse } from "@/types"

// vitest.setup.tsx globally stubs this module out for the ~90 page
// tests that don't care about call behavior — this file exercises the
// real implementation instead.
vi.unmock("@/components/CallProvider")
vi.mock("@/lib/api")

// The Jitsi script-load lifecycle is covered by VideoCallOverlay.test.tsx
// on its own — here it's a thin stub so "a call became active" is
// observable without driving a fake <script> load.
vi.mock("@/components/VideoCallOverlay", () => ({
  __esModule: true,
  default: ({ displayName, onEnd }: { displayName: string; onEnd: () => void }) => (
    <div data-testid="video-overlay">
      <span>{displayName}</span>
      <button onClick={onEnd}>End call</button>
    </div>
  ),
}))

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  closed = false

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  close() {
    this.closed = true
  }

  emit(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) })
  }
}

function makeCallResponse(overrides: Partial<CallStartResponse> = {}): CallStartResponse {
  return {
    call_session_id: 100,
    room_name: "call-100",
    jitsi_domain: "meet.test.local",
    jwt: "jwt-token",
    ...overrides,
  }
}

async function currentSocket(): Promise<MockWebSocket> {
  await waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThan(0))
  return MockWebSocket.instances[MockWebSocket.instances.length - 1]
}

// A raw context consumer, for the one test that exercises useCall()
// directly rather than through StartCallButton (covered separately in
// StartCallButton.test.tsx against a mocked context).
function DirectCaller({ conversationId, name }: { conversationId: number; name: string }) {
  const { startCall } = useCall()
  return <button onClick={() => void startCall(conversationId, name)}>Direct call</button>
}

describe("CallProvider", () => {
  beforeEach(() => {
    vi.mocked(cancelCallPreparation).mockReset().mockResolvedValue(undefined)
    MockWebSocket.instances = []
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1")
    vi.stubGlobal("WebSocket", MockWebSocket)
    vi.mocked(getFreshAccessToken).mockResolvedValue("tok123")
    vi.mocked(startCallApi).mockReset().mockResolvedValue(makeCallResponse())
    vi.mocked(endCallApi).mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("opens a websocket to the notifications endpoint with a fresh token", async () => {
    render(<CallProvider><div /></CallProvider>)
    const socket = await currentSocket()
    expect(socket.url).toBe("ws://localhost:8000/ws/notifications/?token=tok123")
  })

  it("shows the incoming-call ring modal when a call.incoming event arrives", async () => {
    render(<CallProvider><div /></CallProvider>)
    const socket = await currentSocket()

    socket.emit({
      kind: "call.incoming",
      payload: { conversation_id: 1, call_session_id: 2, room_name: "call-2", caller_name: "Иван" },
    })

    await waitFor(() => {
      expect(screen.getByText("Входящий видеозвонок")).toBeInTheDocument()
    })
    expect(screen.getByText("Иван")).toBeInTheDocument()
  })

  it("ignores messages of other notification kinds", async () => {
    render(<CallProvider><div /></CallProvider>)
    const socket = await currentSocket()

    socket.emit({ kind: "order.created", payload: { conversation_id: 1 } })

    expect(screen.queryByText("Входящий видеозвонок")).not.toBeInTheDocument()
  })

  it("accepting the call starts it and opens the overlay", async () => {
    vi.mocked(startCallApi).mockResolvedValue(makeCallResponse({ call_session_id: 2 }))
    const user = userEvent.setup()
    render(<CallProvider><div /></CallProvider>)
    const socket = await currentSocket()

    socket.emit({
      kind: "call.incoming",
      payload: { conversation_id: 1, call_session_id: 2, room_name: "call-2", caller_name: "Иван" },
    })
    await waitFor(() => screen.getByText("Входящий видеозвонок"))

    await user.click(screen.getByText("Принять"))

    expect(startCallApi).toHaveBeenCalledWith(1, expect.objectContaining({ requestId: expect.any(String) }))
    await waitFor(() => {
      expect(screen.getByTestId("video-overlay")).toBeInTheDocument()
    })
    expect(screen.queryByText("Входящий видеозвонок")).not.toBeInTheDocument()
  })

  it("declining dismisses the ring without starting a call", async () => {
    const user = userEvent.setup()
    render(<CallProvider><div /></CallProvider>)
    const socket = await currentSocket()

    socket.emit({
      kind: "call.incoming",
      payload: { conversation_id: 1, call_session_id: 2, room_name: "call-2", caller_name: "Иван" },
    })
    await waitFor(() => screen.getByText("Входящий видеозвонок"))

    await user.click(screen.getByText("Отклонить"))

    expect(screen.queryByText("Входящий видеозвонок")).not.toBeInTheDocument()
    expect(startCallApi).not.toHaveBeenCalled()
  })

  it("shows an error and keeps the ring open if accepting fails", async () => {
    vi.mocked(startCallApi).mockRejectedValueOnce(new Error("network"))
    const user = userEvent.setup()
    render(<CallProvider><div /></CallProvider>)
    const socket = await currentSocket()

    socket.emit({
      kind: "call.incoming",
      payload: { conversation_id: 1, call_session_id: 2, room_name: "call-2", caller_name: "Иван" },
    })
    await waitFor(() => screen.getByText("Входящий видеозвонок"))

    await user.click(screen.getByText("Принять"))

    await waitFor(() => {
      expect(screen.getByText("Не удалось подключиться к звонку")).toBeInTheDocument()
    })
    // Still ringing — the user can retry or decline.
    expect(screen.getByText("Входящий видеозвонок")).toBeInTheDocument()
  })

  it("ignores a second incoming call while already on one", async () => {
    // Regression: a call.incoming arriving mid-call used to set
    // incomingCall regardless, which then popped up stale once the
    // active call ended (see the video call plan's pr-reviewer pass).
    vi.mocked(startCallApi).mockResolvedValue(makeCallResponse({ call_session_id: 2 }))
    const user = userEvent.setup()
    render(<CallProvider><div /></CallProvider>)
    const socket = await currentSocket()

    socket.emit({
      kind: "call.incoming",
      payload: { conversation_id: 1, call_session_id: 2, room_name: "call-2", caller_name: "Иван" },
    })
    await waitFor(() => screen.getByText("Входящий видеозвонок"))
    await user.click(screen.getByText("Принять"))
    await waitFor(() => screen.getByTestId("video-overlay"))

    socket.emit({
      kind: "call.incoming",
      payload: { conversation_id: 5, call_session_id: 9, room_name: "call-9", caller_name: "Дмитрий" },
    })

    expect(screen.queryByText("Входящий видеозвонок")).not.toBeInTheDocument()
    // The active call's overlay is untouched.
    expect(screen.getByTestId("video-overlay")).toBeInTheDocument()
  })

  it("clears a stale accept error when a new incoming call arrives", async () => {
    vi.mocked(startCallApi).mockRejectedValueOnce(new Error("network"))
    const user = userEvent.setup()
    render(<CallProvider><div /></CallProvider>)
    const socket = await currentSocket()

    socket.emit({
      kind: "call.incoming",
      payload: { conversation_id: 1, call_session_id: 2, room_name: "call-2", caller_name: "Иван" },
    })
    await waitFor(() => screen.getByText("Входящий видеозвонок"))
    await user.click(screen.getByText("Принять"))
    await waitFor(() => screen.getByText("Не удалось подключиться к звонку"))

    socket.emit({
      kind: "call.incoming",
      payload: { conversation_id: 5, call_session_id: 9, room_name: "call-9", caller_name: "Дмитрий" },
    })

    await waitFor(() => expect(screen.getByText("Дмитрий")).toBeInTheDocument())
    expect(screen.queryByText("Не удалось подключиться к звонку")).not.toBeInTheDocument()
  })

  it("posts the end-call request and closes the overlay when the call ends", async () => {
    vi.mocked(startCallApi).mockResolvedValue(makeCallResponse({ call_session_id: 77 }))
    const user = userEvent.setup()
    render(
      <CallProvider>
        <DirectCaller conversationId={3} name="Мария" />
      </CallProvider>,
    )
    await user.click(screen.getByText("Direct call"))
    await waitFor(() => screen.getByTestId("video-overlay"))

    await user.click(screen.getByText("End call"))

    expect(endCallApi).toHaveBeenCalledWith(77)
    expect(screen.queryByTestId("video-overlay")).not.toBeInTheDocument()
  })

  it("exposes startCall via context so a direct consumer can open a call", async () => {
    vi.mocked(startCallApi).mockResolvedValue(makeCallResponse())
    const user = userEvent.setup()
    render(
      <CallProvider>
        <DirectCaller conversationId={3} name="Мария" />
      </CallProvider>,
    )
    await user.click(screen.getByText("Direct call"))

    expect(startCallApi).toHaveBeenCalledWith(3, expect.objectContaining({ requestId: expect.any(String) }))
    await waitFor(() => {
      expect(screen.getByTestId("video-overlay")).toBeInTheDocument()
      expect(screen.getByText("Мария")).toBeInTheDocument()
    })
  })
})


function CallerWithError() {
  const { startCall } = useCall()
  const [failed, setFailed] = useState(false)
  return <><button onClick={() => void startCall(3, "Мария").catch(() => setFailed(true))}>Start with error handling</button>{failed && <span>Preparation failed</span>}</>
}

describe("on-demand video calls", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(getFreshAccessToken).mockResolvedValue(null)
    vi.mocked(cancelCallPreparation).mockReset().mockResolvedValue(undefined)
    vi.mocked(startCallApi).mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it("keeps one request ID while waiting and opens the room only after ready", async () => {
    vi.mocked(startCallApi).mockResolvedValueOnce({ status: "preparing", retry_after: 3 }).mockResolvedValueOnce(makeCallResponse())
    render(<CallProvider><DirectCaller conversationId={3} name="Мария" /></CallProvider>)
    await act(async () => { fireEvent.click(screen.getByText("Direct call")) })
    expect(screen.getByRole("status")).toHaveTextContent("Подождите")
    expect(screen.queryByTestId("video-overlay")).not.toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(screen.getByTestId("video-overlay")).toBeInTheDocument()
    expect(vi.mocked(startCallApi).mock.calls[1][1]?.requestId).toEqual(vi.mocked(startCallApi).mock.calls[0][1]?.requestId)
  })

  it("cancels polling and releases only this attempt", async () => {
    vi.mocked(startCallApi).mockResolvedValue({ status: "preparing", retry_after: 3 })
    render(<CallProvider><DirectCaller conversationId={3} name="Мария" /></CallProvider>)
    await act(async () => { fireEvent.click(screen.getByText("Direct call")) })
    const options = vi.mocked(startCallApi).mock.calls[0][1]!
    await act(async () => { fireEvent.click(screen.getByText("Отменить")) })
    expect(options.signal.aborted).toBe(true)
    expect(cancelCallPreparation).toHaveBeenCalledWith(3, options.requestId)
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    expect(startCallApi).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId("video-overlay")).not.toBeInTheDocument()
  })

  it("ignores a late ready response after cancellation", async () => {
    let resolve!: (value: CallStartResponse) => void
    vi.mocked(startCallApi).mockImplementation(() => new Promise((done) => { resolve = done }))
    render(<CallProvider><DirectCaller conversationId={3} name="Мария" /></CallProvider>)
    await act(async () => { fireEvent.click(screen.getByText("Direct call")) })
    await act(async () => { fireEvent.click(screen.getByText("Отменить")) })
    await act(async () => { resolve(makeCallResponse()) })
    expect(screen.queryByTestId("video-overlay")).not.toBeInTheDocument()
  })

  it("coalesces double clicks before the first response", async () => {
    vi.mocked(startCallApi).mockResolvedValue({ status: "preparing", retry_after: 3 })
    const { unmount } = render(<CallProvider><DirectCaller conversationId={3} name="Мария" /></CallProvider>)
    await act(async () => {
      fireEvent.click(screen.getByText("Direct call"))
      fireEvent.click(screen.getByText("Direct call"))
    })
    expect(startCallApi).toHaveBeenCalledTimes(1)
    unmount()
    expect(cancelCallPreparation).toHaveBeenCalledTimes(1)
  })
  it("aborts a hung request after five minutes and exposes an error", async () => {
    vi.mocked(startCallApi).mockImplementation((_id, options) => new Promise((_resolve, reject) => {
      options!.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
    }))
    render(<CallProvider><CallerWithError /></CallProvider>)
    await act(async () => { fireEvent.click(screen.getByText("Start with error handling")) })
    await act(async () => { await vi.advanceTimersByTimeAsync(300000) })
    expect(screen.getByText("Preparation failed")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(cancelCallPreparation).toHaveBeenCalledTimes(1)
  })

})
