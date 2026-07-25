import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import ScrollReveal, { ScrollRevealGroup } from "@/components/ScrollReveal"

describe("ScrollReveal", () => {
  beforeEach(() => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it("renders children without crashing", () => {
    render(
      <ScrollReveal>
        <p>Reveal me</p>
      </ScrollReveal>,
    )
    expect(screen.getByText("Reveal me")).toBeInTheDocument()
  })

  it("starts hidden (opacity 0) since IntersectionObserver never fires in tests", () => {
    const { container } = render(
      <ScrollReveal>
        <p>Reveal me</p>
      </ScrollReveal>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.opacity).toBe("0")
  })

  it("renders immediately visible when prefers-reduced-motion is set", () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    const { container } = render(
      <ScrollReveal>
        <p>Reveal me</p>
      </ScrollReveal>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.opacity).toBe("1")
  })

  it("renders as a custom element tag", () => {
    render(
      <ScrollReveal as="section">
        <p>Reveal me</p>
      </ScrollReveal>,
    )
    expect(screen.getByText("Reveal me").parentElement?.tagName).toBe("SECTION")
  })
})

describe("ScrollRevealGroup", () => {
  it("renders every child", () => {
    render(
      <ScrollRevealGroup>
        {[<p key="a">First</p>, <p key="b">Second</p>]}
      </ScrollRevealGroup>,
    )
    expect(screen.getByText("First")).toBeInTheDocument()
    expect(screen.getByText("Second")).toBeInTheDocument()
  })
})
