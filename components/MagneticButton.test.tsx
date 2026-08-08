import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import MagneticButton from "@/components/MagneticButton"

describe("MagneticButton", () => {
  it("renders children", () => {
    render(<MagneticButton>Click me</MagneticButton>)
    expect(screen.getByText("Click me")).toBeInTheDocument()
  })

  it("renders as a div by default", () => {
    const { container } = render(<MagneticButton>Content</MagneticButton>)
    expect(container.querySelector("div")).toBeInTheDocument()
  })

  it("renders as an anchor with href when as='a'", () => {
    render(
      <MagneticButton as="a" href="/somewhere">
        Link
      </MagneticButton>,
    )
    const link = screen.getByText("Link")
    expect(link.tagName).toBe("A")
    expect(link).toHaveAttribute("href", "/somewhere")
  })

  it("calls onClick when clicked", () => {
    const onClick = vi.fn()
    render(<MagneticButton onClick={onClick}>Press</MagneticButton>)
    fireEvent.click(screen.getByText("Press"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("updates transform style on mouse move and resets on mouse leave", () => {
    render(<MagneticButton>Drag</MagneticButton>)
    const el = screen.getByText("Drag")

    fireEvent.mouseMove(el, { clientX: 100, clientY: 100 })
    expect(el.style.transform).toContain("translate3d")

    fireEvent.mouseLeave(el)
    expect(el.style.transform).toBe("translate3d(0, 0, 0)")
  })
})
