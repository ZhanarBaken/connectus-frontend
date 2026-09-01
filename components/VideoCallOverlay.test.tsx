import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import VideoCallOverlay from "@/components/VideoCallOverlay"

// jsdom never actually executes an injected <script src="..."> tag, so
// these tests drive the load lifecycle manually: grab the script node
// the component injects, stub window.JitsiMeetExternalAPI, then fire
// its onload handler ourselves — same idea as ChatPanel.test.tsx
// driving connectChat's handlers directly instead of a real socket.
// window.JitsiMeetExternalAPI is deliberately left unset until each
// test explicitly "loads" it, matching the component's real branch
// (script not yet loaded → inject it → wait for onload) rather than
// the "already loaded" shortcut, which skips script injection
// entirely and would make these tests inconsistent with each other.
class MockJitsiApi {
  static lastInstance: MockJitsiApi | null = null
  static lastArgs: unknown[] = []
  listeners: Record<string, (() => void)[]> = {}
  dispose = vi.fn()

  constructor(...args: unknown[]) {
    MockJitsiApi.lastInstance = this
    MockJitsiApi.lastArgs = args
  }

  addListener(event: string, handler: () => void) {
    ;(this.listeners[event] ??= []).push(handler)
  }

  fire(event: string) {
    this.listeners[event]?.forEach((h) => h())
  }
}

function getInjectedScript(): HTMLScriptElement {
  const script = document.getElementById("jitsi-external-api-script")
  if (!script) throw new Error("script not injected")
  return script as HTMLScriptElement
}

// Simulates the script finishing its (real-world async) load: makes
// the API global available, then fires the onload handler the
// component attached. Callers still need `waitFor` afterward since
// this triggers a React state update outside RTL's own event helpers.
function finishScriptLoad() {
  ;(window as unknown as { JitsiMeetExternalAPI: unknown }).JitsiMeetExternalAPI = MockJitsiApi
  getInjectedScript().onload?.(new Event("load"))
}

describe("VideoCallOverlay", () => {
  beforeEach(() => {
    document.getElementById("jitsi-external-api-script")?.remove()
    delete (window as unknown as { JitsiMeetExternalAPI?: unknown }).JitsiMeetExternalAPI
    MockJitsiApi.lastInstance = null
    MockJitsiApi.lastArgs = []
  })

  afterEach(() => {
    document.getElementById("jitsi-external-api-script")?.remove()
    delete (window as unknown as { JitsiMeetExternalAPI?: unknown }).JitsiMeetExternalAPI
  })

  it("injects the external_api.js script from the given Jitsi domain", () => {
    render(
      <VideoCallOverlay
        jitsiDomain="meet.test.local"
        roomName="call-1"
        jwt="token"
        displayName="Ирина"
        onEnd={vi.fn()}
      />,
    )
    const script = getInjectedScript()
    expect(script.src).toBe("https://meet.test.local/external_api.js")
  })

  it("shows a connecting spinner until the Jitsi API initializes", () => {
    render(
      <VideoCallOverlay
        jitsiDomain="meet.test.local"
        roomName="call-1"
        jwt="token"
        displayName="Ирина"
        onEnd={vi.fn()}
      />,
    )
    expect(screen.getByText("Подключение...")).toBeInTheDocument()
  })

  it("initializes JitsiMeetExternalAPI with the room/jwt/displayName once the script loads", async () => {
    render(
      <VideoCallOverlay
        jitsiDomain="meet.test.local"
        roomName="call-42"
        jwt="jwt-value"
        displayName="Ирина"
        onEnd={vi.fn()}
      />,
    )
    finishScriptLoad()

    await waitFor(() => expect(MockJitsiApi.lastInstance).not.toBeNull())
    expect(MockJitsiApi.lastArgs[0]).toBe("meet.test.local")
    expect(MockJitsiApi.lastArgs[1]).toMatchObject({
      roomName: "call-42",
      jwt: "jwt-value",
      userInfo: { displayName: "Ирина" },
    })
    await waitFor(() => {
      expect(screen.queryByText("Подключение...")).not.toBeInTheDocument()
    })
  })

  it("calls onEnd when Jitsi reports the local participant left", async () => {
    const onEnd = vi.fn()
    render(
      <VideoCallOverlay
        jitsiDomain="meet.test.local"
        roomName="call-1"
        jwt="token"
        displayName="Ирина"
        onEnd={onEnd}
      />,
    )
    finishScriptLoad()
    await waitFor(() => expect(MockJitsiApi.lastInstance).not.toBeNull())

    MockJitsiApi.lastInstance!.fire("videoConferenceLeft")
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it("calls onEnd when the close button is clicked", () => {
    const onEnd = vi.fn()
    render(
      <VideoCallOverlay
        jitsiDomain="meet.test.local"
        roomName="call-1"
        jwt="token"
        displayName="Ирина"
        onEnd={onEnd}
      />,
    )
    screen.getByLabelText("Закрыть").click()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it("shows a connect error if the script fails to load", async () => {
    render(
      <VideoCallOverlay
        jitsiDomain="meet.test.local"
        roomName="call-1"
        jwt="token"
        displayName="Ирина"
        onEnd={vi.fn()}
      />,
    )
    getInjectedScript().onerror?.(new Event("error"))
    await waitFor(() => {
      expect(screen.getByText("Не удалось подключиться к звонку")).toBeInTheDocument()
    })
  })

  it("disposes the Jitsi API instance on unmount", async () => {
    const { unmount } = render(
      <VideoCallOverlay
        jitsiDomain="meet.test.local"
        roomName="call-1"
        jwt="token"
        displayName="Ирина"
        onEnd={vi.fn()}
      />,
    )
    finishScriptLoad()
    await waitFor(() => expect(MockJitsiApi.lastInstance).not.toBeNull())

    const instance = MockJitsiApi.lastInstance!
    unmount()
    expect(instance.dispose).toHaveBeenCalledTimes(1)
  })

  it("reuses an already-injected script tag for a second overlay instead of injecting a duplicate", () => {
    const { unmount } = render(
      <VideoCallOverlay
        jitsiDomain="meet.test.local"
        roomName="call-1"
        jwt="token"
        displayName="Ирина"
        onEnd={vi.fn()}
      />,
    )
    // Unmount before the (never-actually-loading, in jsdom) script fires
    // onload — the tag itself stays in the document either way, since
    // nothing in the component removes it on unmount.
    unmount()

    render(
      <VideoCallOverlay
        jitsiDomain="meet.test.local"
        roomName="call-2"
        jwt="token-2"
        displayName="Ирина"
        onEnd={vi.fn()}
      />,
    )
    expect(document.querySelectorAll("#jitsi-external-api-script").length).toBe(1)
  })
})
