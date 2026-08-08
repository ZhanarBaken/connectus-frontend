import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import Logo from "@/components/Logo"

describe("Logo", () => {
  it("renders an svg with the accessible label", () => {
    render(<Logo />)
    expect(screen.getByLabelText("Connectus")).toBeInTheDocument()
  })

  it("defaults to size 32", () => {
    render(<Logo />)
    const svg = screen.getByLabelText("Connectus")
    expect(svg).toHaveAttribute("width", "32")
    expect(svg).toHaveAttribute("height", "32")
  })

  it("applies a custom size", () => {
    render(<Logo size={64} />)
    const svg = screen.getByLabelText("Connectus")
    expect(svg).toHaveAttribute("width", "64")
    expect(svg).toHaveAttribute("height", "64")
  })

  it("applies a custom className", () => {
    render(<Logo className="my-logo" />)
    expect(screen.getByLabelText("Connectus")).toHaveClass("my-logo")
  })
})
