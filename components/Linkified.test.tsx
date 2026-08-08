import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Linkified } from "@/components/Linkified"

describe("Linkified", () => {
  it("renders null for empty text", () => {
    const { container } = render(<Linkified text="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders plain text unchanged when there is no URL", () => {
    render(<Linkified text="just plain text" />)
    expect(screen.getByText("just plain text")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("wraps a bare URL in an anchor tag", () => {
    render(<Linkified text="https://example.com" />)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "https://example.com")
    expect(link).toHaveTextContent("https://example.com")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("linkifies a URL embedded in surrounding text", () => {
    render(<Linkified text="see https://example.com for details" />)
    expect(screen.getByText("see", { exact: false })).toBeInTheDocument()
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "https://example.com")
    expect(screen.getByText(/for details/)).toBeInTheDocument()
  })

  it("strips trailing sentence punctuation from the link but keeps it in the text", () => {
    const { container } = render(<Linkified text="see https://example.com." />)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "https://example.com")
    expect(link).toHaveTextContent("https://example.com")
    // the trailing period is preserved as plain text after the link
    expect(container.textContent).toBe("see https://example.com.")
  })

  it("keeps a balanced trailing paren intact on a Wikipedia-style URL", () => {
    render(<Linkified text="https://en.wikipedia.org/wiki/Foo_(bar)" />)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Foo_(bar)")
  })

  it("strips a trailing paren that is not part of a balanced pair", () => {
    render(<Linkified text="(see https://example.com)" />)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "https://example.com")
  })

  it("strips only the sentence period after a balanced trailing paren", () => {
    const { container } = render(<Linkified text="see https://example.com/(a)." />)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "https://example.com/(a)")
    expect(container.textContent).toBe("see https://example.com/(a).")
  })

  it("links multiple URLs in the same text", () => {
    render(<Linkified text="https://a.com and https://b.com" />)
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute("href", "https://a.com")
    expect(links[1]).toHaveAttribute("href", "https://b.com")
  })

  it("does not escape or execute a script-like string, keeps it inert text", () => {
    render(<Linkified text="<script>alert(1)</script>" />)
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument()
    expect(document.querySelector("script")).not.toBeInTheDocument()
  })
})
