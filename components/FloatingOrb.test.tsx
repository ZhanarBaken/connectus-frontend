import { describe, it, expect, vi, afterEach } from "vitest"
import { render } from "@testing-library/react"
import FloatingOrb from "./FloatingOrb"

describe("FloatingOrb", () => {
  afterEach(() => {
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

  it("renders a decorative div sized by the size prop", () => {
    const { container } = render(<FloatingOrb size={200} />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveStyle({ width: "200px", height: "200px" })
  })

  it("is purely decorative (pointer-events disabled)", () => {
    const { container } = render(<FloatingOrb />)
    expect(container.firstChild).toHaveClass("pointer-events-none")
  })

  it("applies the given color into the background gradient", () => {
    const { container } = render(<FloatingOrb color="rgba(1, 2, 3, 0.5)" />)
    const el = container.firstChild as HTMLElement
    expect(el.style.background).toContain("rgba(1, 2, 3, 0.5)")
  })

  it("merges a custom className", () => {
    const { container } = render(<FloatingOrb className="hidden lg:block" />)
    expect(container.firstChild).toHaveClass("hidden", "lg:block", "pointer-events-none")
  })

  it("does not attach a scroll listener when prefers-reduced-motion is set", () => {
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
    const addSpy = vi.spyOn(window, "addEventListener")
    render(<FloatingOrb />)
    expect(addSpy).not.toHaveBeenCalledWith("scroll", expect.any(Function), expect.anything())
    addSpy.mockRestore()
  })
})
