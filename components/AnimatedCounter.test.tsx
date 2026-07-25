import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import AnimatedCounter from "./AnimatedCounter"

// The shared vitest.setup.ts IntersectionObserver mock never stores the
// callback it's constructed with (its `observe` is a pure no-op), so
// there is no way to manually fire an intersection through it. We
// install our own tiny observer here that keeps a handle to every
// instance + its callback, and a requestAnimationFrame stub that
// resolves the whole ease-out animation in a single synchronous tick
// (by handing `tick` a `now` far past `start + duration`) — enough to
// verify the counter reaches its target without asserting on the
// frame-by-frame easing curve.
class TestObserver {
  static instances: TestObserver[] = []
  callback: IntersectionObserverCallback
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
  root = null
  rootMargin = ""
  thresholds: number[] = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    TestObserver.instances.push(this)
  }
}

function fireIntersection(observer: TestObserver, isIntersecting: boolean) {
  act(() => {
    observer.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      observer as unknown as IntersectionObserver,
    )
  })
}

describe("AnimatedCounter", () => {
  beforeEach(() => {
    TestObserver.instances = []
    vi.stubGlobal("IntersectionObserver", TestObserver)
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(performance.now() + 100_000)
      return 0
    })
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders '0' before it has scrolled into view", () => {
    render(<AnimatedCounter value={250} />)
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("observes its own element", () => {
    render(<AnimatedCounter value={250} />)
    const observer = TestObserver.instances[0]
    expect(observer.observe).toHaveBeenCalledTimes(1)
  })

  it("animates up to the target value once it intersects", () => {
    render(<AnimatedCounter value={250} />)
    const observer = TestObserver.instances[0]
    fireIntersection(observer, true)
    expect(screen.getByText("250")).toBeInTheDocument()
  })

  it("stops observing once it has triggered", () => {
    render(<AnimatedCounter value={250} />)
    const observer = TestObserver.instances[0]
    fireIntersection(observer, true)
    expect(observer.unobserve).toHaveBeenCalledTimes(1)
  })

  it("does not re-trigger the animation on a second intersection", () => {
    render(<AnimatedCounter value={250} />)
    const observer = TestObserver.instances[0]
    fireIntersection(observer, true)
    fireIntersection(observer, true)
    expect(screen.getByText("250")).toBeInTheDocument()
  })

  it("ignores a non-intersecting entry", () => {
    render(<AnimatedCounter value={250} />)
    const observer = TestObserver.instances[0]
    fireIntersection(observer, false)
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("shows the final value immediately when prefers-reduced-motion is set", () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList)
    render(<AnimatedCounter value={250} />)
    expect(screen.getByText("250")).toBeInTheDocument()
  })

  it("wraps the value with prefix and suffix", () => {
    render(<AnimatedCounter value={250} prefix="~" suffix="+" />)
    const observer = TestObserver.instances[0]
    fireIntersection(observer, true)
    expect(screen.getByText("~250+")).toBeInTheDocument()
  })
})
