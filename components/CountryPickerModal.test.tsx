import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CountryPickerModal from "./CountryPickerModal"

describe("CountryPickerModal", () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it("renders nothing when closed", () => {
    const { container } = render(
      <CountryPickerModal
        open={false}
        selected={[]}
        hiddenCodes={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders the dialog with a search input when open", () => {
    render(
      <CountryPickerModal
        open
        selected={[]}
        hiddenCodes={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Поиск...")).toBeInTheDocument()
  })

  it("excludes countries listed in hiddenCodes", () => {
    render(
      <CountryPickerModal
        open
        selected={[]}
        hiddenCodes={["US"]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByText("США")).not.toBeInTheDocument()
  })

  it("shows a country that is not hidden", () => {
    render(
      <CountryPickerModal
        open
        selected={[]}
        hiddenCodes={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText("США")).toBeInTheDocument()
  })

  it("filters the list by typed search text (label match)", async () => {
    const user = userEvent.setup()
    render(
      <CountryPickerModal
        open
        selected={[]}
        hiddenCodes={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    await user.type(screen.getByPlaceholderText("Поиск..."), "США")
    expect(screen.getByText("США")).toBeInTheDocument()
    expect(screen.queryByText("Германия")).not.toBeInTheDocument()
  })

  it("filters the list by ISO code", async () => {
    const user = userEvent.setup()
    render(
      <CountryPickerModal
        open
        selected={[]}
        hiddenCodes={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    await user.type(screen.getByPlaceholderText("Поиск..."), "kz")
    expect(screen.getByText(/казахстан/i)).toBeInTheDocument()
  })

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup()
    render(
      <CountryPickerModal
        open
        selected={[]}
        hiddenCodes={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    await user.type(screen.getByPlaceholderText("Поиск..."), "zzzzzz")
    expect(screen.getByText("Ничего не нашлось")).toBeInTheDocument()
  })

  it("marks already-selected countries", () => {
    render(
      <CountryPickerModal
        open
        selected={["us"]}
        hiddenCodes={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const row = screen.getByText("США").closest("button") as HTMLElement
    expect(row).toHaveTextContent("Выбрано")
  })

  it("calls onSelect and onClose when a country is chosen", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <CountryPickerModal
        open
        selected={[]}
        hiddenCodes={[]}
        onSelect={onSelect}
        onClose={onClose}
      />,
    )
    await user.click(screen.getByText("США"))
    expect(onSelect).toHaveBeenCalledWith("US")
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn()
    render(
      <CountryPickerModal
        open
        selected={[]}
        hiddenCodes={[]}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    )
    fireEvent.keyDown(window, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when clicking the backdrop", () => {
    const onClose = vi.fn()
    render(
      <CountryPickerModal
        open
        selected={[]}
        hiddenCodes={[]}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not call onClose when clicking inside the dialog", () => {
    const onClose = vi.fn()
    render(
      <CountryPickerModal
        open
        selected={[]}
        hiddenCodes={[]}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByRole("dialog"))
    expect(onClose).not.toHaveBeenCalled()
  })

  it("calls onClose via the header close button", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <CountryPickerModal
        open
        selected={[]}
        hiddenCodes={[]}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    )
    await user.click(screen.getByLabelText("Закрыть"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("focuses the search input shortly after opening", async () => {
    render(
      <CountryPickerModal
        open
        selected={[]}
        hiddenCodes={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    await waitFor(() => expect(screen.getByPlaceholderText("Поиск...")).toHaveFocus(), {
      timeout: 500,
    })
  })
})
