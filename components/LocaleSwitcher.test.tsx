import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter, usePathname } from "@/i18n/navigation"
import LocaleSwitcher from "@/components/LocaleSwitcher"

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(usePathname).mockReturnValue("/mentors")
  })

  it("renders a button for every supported locale", () => {
    render(<LocaleSwitcher />)
    expect(screen.getByText("RU")).toBeInTheDocument()
    expect(screen.getByText("EN")).toBeInTheDocument()
    expect(screen.getByText("KZ")).toBeInTheDocument()
  })

  it("marks the current locale (ru, per the mocked useLocale) as active", () => {
    render(<LocaleSwitcher />)
    expect(screen.getByText("RU")).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("EN")).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText("KZ")).toHaveAttribute("aria-pressed", "false")
  })

  it("switches locale via the locale-aware router, staying on the current page", async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    const user = userEvent.setup()
    render(<LocaleSwitcher />)

    await user.click(screen.getByText("KZ"))

    expect(replace).toHaveBeenCalledWith("/mentors", { locale: "kk" })
  })

  it("applies a custom className to the wrapper", () => {
    const { container } = render(<LocaleSwitcher className="custom-class" />)
    expect(container.firstElementChild).toHaveClass("custom-class")
  })
})
