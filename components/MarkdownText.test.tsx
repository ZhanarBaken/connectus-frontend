import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import MarkdownText from "@/components/MarkdownText"

describe("MarkdownText", () => {
  it("renders plain paragraphs", () => {
    render(<MarkdownText text="Hello world" />)
    expect(screen.getByText("Hello world")).toBeInTheDocument()
  })

  it("renders bold text with **...**", () => {
    const { container } = render(<MarkdownText text="This is **bold** text" />)
    const strong = container.querySelector("strong")
    expect(strong).toHaveTextContent("bold")
  })

  it("renders headings at each level", () => {
    render(<MarkdownText text={"# H1\n\n## H2\n\n### H3"} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("H1")
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("H2")
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("H3")
  })

  it("renders a horizontal rule for --- and ***", () => {
    const { container } = render(<MarkdownText text={"above\n\n---\n\nbelow"} />)
    expect(container.querySelector("hr")).toBeInTheDocument()
  })

  it("renders an unordered list from -, *, and em-dash bullets", () => {
    const { container } = render(<MarkdownText text={"- one\n- two\n- three"} />)
    const items = container.querySelectorAll("ul li")
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent("one")
  })

  it("renders an ordered list from numbered lines", () => {
    const { container } = render(<MarkdownText text={"1. first\n2. second"} />)
    const items = container.querySelectorAll("ol li")
    expect(items).toHaveLength(2)
    expect(items[1]).toHaveTextContent("second")
  })

  it("renders a blockquote from lines starting with >", () => {
    const { container } = render(<MarkdownText text="> quoted text" />)
    const quote = container.querySelector("blockquote")
    expect(quote).toHaveTextContent("quoted text")
  })

  it("renders a GitHub-style table with header and body rows", () => {
    const text = "| A | B |\n|---|---|\n| 1 | 2 |"
    const { container } = render(<MarkdownText text={text} />)
    const table = container.querySelector("table")
    expect(table).toBeInTheDocument()
    expect(container.querySelectorAll("th")).toHaveLength(2)
    expect(container.querySelectorAll("td")).toHaveLength(2)
    expect(container.querySelector("th")).toHaveTextContent("A")
    expect(container.querySelector("td")).toHaveTextContent("1")
  })

  it("renders a safe [text](url) link with the href intact", () => {
    render(<MarkdownText text="[click here](https://example.com)" />)
    const link = screen.getByRole("link", { name: "click here" })
    expect(link).toHaveAttribute("href", "https://example.com")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("allows relative, hash, mailto, and tel links", () => {
    const text =
      "[rel](/terms) [hash](#section) [mail](mailto:a@b.com) [phone](tel:+123)"
    render(<MarkdownText text={text} />)
    expect(screen.getByRole("link", { name: "rel" })).toHaveAttribute("href", "/terms")
    expect(screen.getByRole("link", { name: "hash" })).toHaveAttribute("href", "#section")
    expect(screen.getByRole("link", { name: "mail" })).toHaveAttribute("href", "mailto:a@b.com")
    expect(screen.getByRole("link", { name: "phone" })).toHaveAttribute("href", "tel:+123")
  })

  // Security-relevant: an unsafe href scheme (javascript:, data:, etc.)
  // must not be rendered as a clickable link — this is the component's
  // defence-in-depth against an admin-editable text field being used as
  // an XSS vector.
  it("drops unsafe href schemes like javascript: and renders plain text instead", () => {
    const { container } = render(
      <MarkdownText text="[click me](javascript:alert(1))" />,
    )
    expect(container.querySelector("a")).not.toBeInTheDocument()
    expect(screen.getByText("click me", { exact: false })).toBeInTheDocument()
  })

  it("drops data: URIs as well", () => {
    const { container } = render(
      <MarkdownText text="[img](data:text/html,<script>alert(1)</script>)" />,
    )
    expect(container.querySelector("a")).not.toBeInTheDocument()
    expect(container.querySelector("script")).not.toBeInTheDocument()
  })

  it("never uses dangerouslySetInnerHTML — raw HTML-looking text stays inert", () => {
    const { container } = render(<MarkdownText text="<img src=x onerror=alert(1)>" />)
    expect(container.querySelector("img")).not.toBeInTheDocument()
    expect(container.textContent).toContain("<img src=x onerror=alert(1)>")
  })

  it("applies the className prop to the outer wrapper", () => {
    const { container } = render(<MarkdownText text="hi" className="prose" />)
    expect(container.firstElementChild).toHaveClass("prose")
  })

  it("separates paragraphs on blank lines and joins soft-wrapped lines with <br>", () => {
    const { container } = render(<MarkdownText text={"line one\nline two\n\nnew paragraph"} />)
    const paragraphs = container.querySelectorAll("p")
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]).toHaveTextContent("line oneline two")
    expect(paragraphs[0].querySelector("br")).toBeInTheDocument()
    expect(paragraphs[1]).toHaveTextContent("new paragraph")
  })
})
