import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"
import BackButton from "./BackButton"

function setHistoryLength(length: number) {
  Object.defineProperty(window.history, "length", {
    value: length,
    configurable: true,
  })
}

describe("BackButton", () => {
  const push = vi.fn()
  const back = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    push.mockClear()
    back.mockClear()
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      back,
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    setHistoryLength(2)
  })

  it("renders the default label", () => {
    render(<BackButton />)
    expect(screen.getByRole("button", { name: /Назад/ })).toBeInTheDocument()
  })

  it("renders a custom label", () => {
    render(<BackButton label="Отмена" />)
    expect(screen.getByRole("button", { name: /Отмена/ })).toBeInTheDocument()
  })

  it("calls router.back() when history has entries", async () => {
    const user = userEvent.setup()
    setHistoryLength(2)
    render(<BackButton />)
    await user.click(screen.getByRole("button"))
    expect(back).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it("falls back to fallbackHref when there is no history", async () => {
    const user = userEvent.setup()
    setHistoryLength(1)
    render(<BackButton fallbackHref="/somewhere" />)
    await user.click(screen.getByRole("button"))
    expect(back).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith("/somewhere")
  })

  it("falls back to the mentor dashboard when role is mentor and there is no fallbackHref", async () => {
    const user = userEvent.setup()
    setHistoryLength(1)
    localStorage.setItem("role", "mentor")
    render(<BackButton />)
    await user.click(screen.getByRole("button"))
    expect(push).toHaveBeenCalledWith("/mentor/dashboard")
  })

  it("falls back to the student dashboard when role is student and there is no fallbackHref", async () => {
    const user = userEvent.setup()
    setHistoryLength(1)
    localStorage.setItem("role", "student")
    render(<BackButton />)
    await user.click(screen.getByRole("button"))
    expect(push).toHaveBeenCalledWith("/student/dashboard")
  })

  it("falls back to home when there is no role and no fallbackHref", async () => {
    const user = userEvent.setup()
    setHistoryLength(1)
    render(<BackButton />)
    await user.click(screen.getByRole("button"))
    expect(push).toHaveBeenCalledWith("/")
  })

  it("applies a custom className when given", () => {
    render(<BackButton className="custom-class" />)
    expect(screen.getByRole("button")).toHaveClass("custom-class")
  })
})
