import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import TiltCard from "@/components/TiltCard"

describe("TiltCard", () => {
  it("renders children", () => {
    render(
      <TiltCard>
        <span>Inside</span>
      </TiltCard>,
    )
    expect(screen.getByText("Inside")).toBeInTheDocument()
  })

  it("renders a glare layer by default", () => {
    const { container } = render(
      <TiltCard>
        <span>Inside</span>
      </TiltCard>,
    )
    expect(container.querySelectorAll("div").length).toBeGreaterThanOrEqual(2)
  })

  it("does not render a glare layer when glare=false", () => {
    const { container } = render(
      <TiltCard glare={false}>
        <span>Inside</span>
      </TiltCard>,
    )
    // Only the outer wrapper div should be present.
    expect(container.querySelectorAll("div").length).toBe(1)
  })

  it("updates transform on mouse move and resets on mouse leave", () => {
    const { container } = render(
      <TiltCard>
        <span>Inside</span>
      </TiltCard>,
    )
    const wrapper = container.firstChild as HTMLElement
    fireEvent.mouseMove(wrapper, { clientX: 50, clientY: 50 })
    expect(wrapper.style.transform).toContain("rotateX")

    fireEvent.mouseLeave(wrapper)
    expect(wrapper.style.transform).toContain("rotateX(0deg) rotateY(0deg)")
  })
})
