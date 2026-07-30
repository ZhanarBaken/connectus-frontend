import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CountrySelect from "./CountrySelect"

describe("CountrySelect", () => {
  it("renders a chip for every popular CIS country", () => {
    render(<CountrySelect value="KZ" onChange={vi.fn()} />)
    expect(screen.getByText(/Казахстан/)).toBeInTheDocument()
    expect(screen.getByText(/Россия/)).toBeInTheDocument()
    expect(screen.getByText(/Узбекистан/)).toBeInTheDocument()
  })

  it("marks the current value's chip as selected", () => {
    render(<CountrySelect value="UZ" onChange={vi.fn()} />)
    const button = screen.getByText(/Узбекистан/).closest("button") as HTMLElement
    expect(button).toHaveTextContent("✓")
  })

  it("calls onChange with the code when a chip is clicked", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CountrySelect value="KZ" onChange={onChange} />)
    await user.click(screen.getByText(/Узбекистан/))
    expect(onChange).toHaveBeenCalledWith("UZ")
  })

  it("shows the generic label when the value is outside the popular list", () => {
    render(<CountrySelect value="MN" onChange={vi.fn()} />)
    expect(screen.queryByText("Другая страна")).not.toBeInTheDocument()
    expect(screen.getByText(/Монголия/)).toBeInTheDocument()
  })

  it("opens the search modal and selecting a country calls onChange", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CountrySelect value="KZ" onChange={onChange} />)
    await user.click(screen.getByText("Другая страна"))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText("Поиск..."), "монгол")
    await user.click(screen.getByText(/Монголия/))
    expect(onChange).toHaveBeenCalledWith("MN")
  })

  it("does not show CIS countries again inside the search modal", async () => {
    const user = userEvent.setup()
    render(<CountrySelect value="KZ" onChange={vi.fn()} />)
    await user.click(screen.getByText("Другая страна"))
    await user.type(screen.getByPlaceholderText("Поиск..."), "узбек")
    expect(screen.getByText("Ничего не нашлось")).toBeInTheDocument()
  })
})
