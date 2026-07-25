import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import FaqList from "./FaqList"

const items = [
  { q: "Question one?", a: "Answer one." },
  { q: "Question two?", a: "Answer two." },
  { q: "Question three?", a: "Answer three." },
]

describe("FaqList", () => {
  it("renders every question", () => {
    render(<FaqList items={items} />)
    for (const item of items) {
      expect(screen.getByText(item.q)).toBeInTheDocument()
    }
  })

  it("starts with every item collapsed", () => {
    render(<FaqList items={items} />)
    const buttons = screen.getAllByRole("button")
    for (const button of buttons) {
      expect(button).toHaveAttribute("aria-expanded", "false")
    }
  })

  it("expands an item when its question is clicked", async () => {
    const user = userEvent.setup()
    render(<FaqList items={items} />)
    await user.click(screen.getByText(items[0].q))
    expect(screen.getByRole("button", { name: items[0].q })).toHaveAttribute("aria-expanded", "true")
  })

  it("collapses an expanded item when clicked again", async () => {
    const user = userEvent.setup()
    render(<FaqList items={items} />)
    const button = screen.getByRole("button", { name: items[0].q })
    await user.click(button)
    expect(button).toHaveAttribute("aria-expanded", "true")
    await user.click(button)
    expect(button).toHaveAttribute("aria-expanded", "false")
  })

  it("behaves as an accordion — opening one item closes the previously open one", async () => {
    const user = userEvent.setup()
    render(<FaqList items={items} />)
    const first = screen.getByRole("button", { name: items[0].q })
    const second = screen.getByRole("button", { name: items[1].q })

    await user.click(first)
    expect(first).toHaveAttribute("aria-expanded", "true")

    await user.click(second)
    expect(first).toHaveAttribute("aria-expanded", "false")
    expect(second).toHaveAttribute("aria-expanded", "true")
  })

  it("renders an empty list without crashing", () => {
    const { container } = render(<FaqList items={[]} />)
    expect(container.querySelectorAll("button")).toHaveLength(0)
  })
})
