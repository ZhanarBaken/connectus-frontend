import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LocaleProvider } from "@/lib/i18n/LocaleProvider"
import LocaleSwitcher from "@/components/LocaleSwitcher"

function renderSwitcher(props?: { className?: string }) {
  return render(
    <LocaleProvider>
      <LocaleSwitcher {...props} />
    </LocaleProvider>,
  )
}

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("renders a button for every supported locale", () => {
    renderSwitcher()
    expect(screen.getByText("RU")).toBeInTheDocument()
    expect(screen.getByText("KZ")).toBeInTheDocument()
  })

  it("marks the default locale (ru) as active", () => {
    renderSwitcher()
    expect(screen.getByText("RU")).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("KZ")).toHaveAttribute("aria-pressed", "false")
  })

  it("switches the active locale on click and persists it to localStorage", async () => {
    const user = userEvent.setup()
    renderSwitcher()

    await user.click(screen.getByText("KZ"))

    expect(screen.getByText("KZ")).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("RU")).toHaveAttribute("aria-pressed", "false")
    expect(localStorage.getItem("locale")).toBe("kk")
  })

  it("applies a custom className to the wrapper", () => {
    const { container } = renderSwitcher({ className: "custom-class" })
    expect(container.firstElementChild).toHaveClass("custom-class")
  })
})
