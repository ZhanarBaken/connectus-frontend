import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useTelegramWebApp } from "./useTelegramWebApp"

function makeWebApp(overrides: Partial<TelegramWebApp> = {}): TelegramWebApp {
  return {
    initData: "query_id=abc&user=%7B%7D",
    initDataUnsafe: {},
    version: "7.0",
    platform: "ios",
    colorScheme: "light",
    themeParams: {},
    isExpanded: true,
    viewportHeight: 600,
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    ...overrides,
  }
}

describe("useTelegramWebApp", () => {
  afterEach(() => {
    delete (window as unknown as { Telegram?: unknown }).Telegram
    vi.useRealTimers()
  })

  it("returns isInTelegram=false and empty initData when the SDK never appears", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTelegramWebApp())

    expect(result.current.isInTelegram).toBe(false)
    expect(result.current.webApp).toBeNull()
    expect(result.current.initData).toBe("")

    // Advance past the 1500ms polling window — should still be null, and
    // the interval should have stopped (no crash / dangling timer).
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.isInTelegram).toBe(false)
  })

  it("attaches synchronously when window.Telegram.WebApp is already ready on mount", () => {
    const webApp = makeWebApp()
    ;(window as unknown as { Telegram: { WebApp: TelegramWebApp } }).Telegram = { WebApp: webApp }

    const { result } = renderHook(() => useTelegramWebApp())

    expect(result.current.isInTelegram).toBe(true)
    expect(result.current.webApp).toBe(webApp)
    expect(result.current.initData).toBe(webApp.initData)
  })

  it("does not treat a global with empty initData as being inside Telegram", () => {
    const webApp = makeWebApp({ initData: "" })
    ;(window as unknown as { Telegram: { WebApp: TelegramWebApp } }).Telegram = { WebApp: webApp }
    vi.useFakeTimers()

    const { result } = renderHook(() => useTelegramWebApp())
    expect(result.current.isInTelegram).toBe(false)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.isInTelegram).toBe(false)
  })

  it("attaches via polling once the SDK appears after mount, and calls ready()", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTelegramWebApp())
    expect(result.current.isInTelegram).toBe(false)

    const webApp = makeWebApp()
    act(() => {
      ;(window as unknown as { Telegram: { WebApp: TelegramWebApp } }).Telegram = { WebApp: webApp }
      vi.advanceTimersByTime(300)
    })

    expect(result.current.isInTelegram).toBe(true)
    expect(result.current.webApp).toBe(webApp)
    expect(webApp.ready).toHaveBeenCalled()
  })

  it("stops polling once attached (interval cleared, no further state churn)", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTelegramWebApp())

    const webApp = makeWebApp()
    act(() => {
      ;(window as unknown as { Telegram: { WebApp: TelegramWebApp } }).Telegram = { WebApp: webApp }
      vi.advanceTimersByTime(300)
    })
    expect(result.current.isInTelegram).toBe(true)

    const readyCallsAfterAttach = (webApp.ready as ReturnType<typeof vi.fn>).mock.calls.length
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    // ready() should not be called again by further polling ticks.
    expect((webApp.ready as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      readyCallsAfterAttach
    )
  })

  it("clears the interval on unmount", () => {
    vi.useFakeTimers()
    const clearIntervalSpy = vi.spyOn(window, "clearInterval")
    const { unmount } = renderHook(() => useTelegramWebApp())
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })
})
