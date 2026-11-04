import { beforeEach, describe, expect, it, vi } from "vitest"
import { Component, type PropsWithChildren } from "react"
import { renderToString } from "react-dom/server"
import { act, screen, renderHook, waitFor } from "@testing-library/react"
import { fetchMe } from "./api"
import { useScheduleTimeZone } from "./useScheduleTimeZone"
import type { User } from "@/types"

vi.mock("./api", () => ({ fetchMe: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem("access_token", "test-token")
})

describe("schedule display timezone", () => {
  it("uses the explicit saved zone regardless of country or locale", async () => {
    vi.mocked(fetchMe).mockResolvedValue({ time_zone: "America/New_York", country: "KZ", locale: "kk" } as User)
    const { result } = renderHook(() => useScheduleTimeZone())
    await waitFor(() => expect(result.current.timeZone).toBe("America/New_York"))
  })
  it("uses the browser zone for blank legacy preferences", async () => {
    vi.mocked(fetchMe).mockResolvedValue({ time_zone: "", country: "US", locale: "ru" } as User)
    const { result } = renderHook(() => useScheduleTimeZone())
    await waitFor(() => expect(fetchMe).toHaveBeenCalled())
    expect(result.current.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })
  it("keeps the browser fallback when account loading fails", async () => {
    vi.mocked(fetchMe).mockRejectedValue(new TypeError("Failed to fetch"))
    const { result } = renderHook(() => useScheduleTimeZone())
    await waitFor(() => expect(result.current.preferenceLoadError).toBe(true))
    expect(result.current.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    vi.mocked(fetchMe).mockResolvedValue({ time_zone: "Asia/Tokyo" } as User)
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.timeZone).toBe("Asia/Tokyo"))
    expect(result.current.preferenceLoadError).toBe(false)
  })

  it("surfaces HTTP account lookup failures instead of silently assuming a preference", async () => {
    vi.mocked(fetchMe).mockRejectedValue(new Error("Failed to fetch user"))
    const { result } = renderHook(() => useScheduleTimeZone())
    await waitFor(() => expect(result.current.preferenceLoadError).toBe(true))
  })

  it("uses the anonymous browser fallback without an account error", () => {
    localStorage.removeItem("access_token")
    const { result } = renderHook(() => useScheduleTimeZone())
    expect(result.current.preferenceLoadError).toBe(false)
    expect(fetchMe).not.toHaveBeenCalled()
  })
})


it("uses UTC for the server snapshot before hydration", () => {
  function Zone() { return <span>{useScheduleTimeZone().timeZone}</span> }
  expect(renderToString(<Zone />)).toBe("<span>UTC</span>")
})

it("propagates unexpected preference errors to the render boundary", async () => {
  class Boundary extends Component<PropsWithChildren, { error: Error | null }> {
    state = { error: null as Error | null }
    static getDerivedStateFromError(error: Error) { return { error } }
    render() { return this.state.error ? <span>{this.state.error.message}</span> : this.props.children }
  }
  vi.mocked(fetchMe).mockRejectedValue(new Error("unexpected account bug"))
  renderHook(() => useScheduleTimeZone(), { wrapper: Boundary })
  expect(await screen.findByText("unexpected account bug")).toBeInTheDocument()
})
