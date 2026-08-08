import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Avatar } from "./Avatar"

describe("Avatar", () => {
  it("renders the photo when src is present", () => {
    render(<Avatar src="https://example.com/photo.jpg" name="Aigerim" />)
    const img = screen.getByRole("img") as HTMLImageElement
    expect(img.src).toBe("https://example.com/photo.jpg")
    expect(img.alt).toBe("Aigerim")
  })

  it("falls back to the first letter of the name when there is no src", () => {
    render(<Avatar name="Aigerim" />)
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByText("A")).toBeInTheDocument()
  })

  it("uppercases the initial letter", () => {
    render(<Avatar name="aigerim" />)
    expect(screen.getByText("A")).toBeInTheDocument()
  })

  it("falls back to '?' when name is missing", () => {
    render(<Avatar />)
    expect(screen.getByText("?")).toBeInTheDocument()
  })

  it("falls back to '?' when name is blank", () => {
    render(<Avatar name="   " />)
    expect(screen.getByText("?")).toBeInTheDocument()
  })

  it("falls back to '?' when src is null and name is null", () => {
    render(<Avatar src={null} name={null} />)
    expect(screen.getByText("?")).toBeInTheDocument()
  })

  it("applies the given className to the wrapper", () => {
    const { container } = render(<Avatar name="Bob" className="w-10 h-10" />)
    expect(container.firstChild).toHaveClass("w-10", "h-10")
  })

  it("applies the given letterClassName to the initial span", () => {
    render(<Avatar name="Bob" letterClassName="text-2xl" />)
    expect(screen.getByText("B")).toHaveClass("text-2xl")
  })
})
