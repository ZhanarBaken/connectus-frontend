import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import Icon from "./Icon"

describe("Icon", () => {
  it("renders the icon name as its text content", () => {
    render(<Icon name="school" />)
    expect(screen.getByText("school")).toBeInTheDocument()
  })

  it("applies the material-symbols-outlined class plus any extra className", () => {
    render(<Icon name="lock" className="text-indigo-600" />)
    const el = screen.getByText("lock")
    expect(el).toHaveClass("material-symbols-outlined", "text-indigo-600")
  })

  it("is aria-hidden by default (decorative)", () => {
    render(<Icon name="lock" />)
    expect(screen.getByText("lock")).toHaveAttribute("aria-hidden", "true")
  })

  it("uses ariaLabel and drops aria-hidden when provided", () => {
    render(<Icon name="lock" ariaLabel="Locked" />)
    const el = screen.getByLabelText("Locked")
    expect(el).not.toHaveAttribute("aria-hidden")
  })

  it("sets font-size from the size prop", () => {
    render(<Icon name="lock" size={32} />)
    expect(screen.getByText("lock")).toHaveStyle({ fontSize: "32px" })
  })

  it("defaults to a fill of 0 when not filled", () => {
    render(<Icon name="star" />)
    const el = screen.getByText("star")
    expect(el.style.fontVariationSettings).toContain("'FILL' 0")
  })

  it("sets fill to 1 when filled is true", () => {
    render(<Icon name="star" filled />)
    const el = screen.getByText("star")
    expect(el.style.fontVariationSettings).toContain("'FILL' 1")
  })

  it("reflects a custom weight in the variation settings", () => {
    render(<Icon name="star" weight={700} />)
    const el = screen.getByText("star")
    expect(el.style.fontVariationSettings).toContain("'wght' 700")
  })
})
