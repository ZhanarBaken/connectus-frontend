import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "next/navigation"
import * as api from "@/lib/api"
import ForgotPasswordPage from "./page"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    requestPasswordReset: vi.fn(),
  }
})

describe("ForgotPasswordPage", () => {
  const replace = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    replace.mockClear()
    vi.mocked(api.requestPasswordReset).mockReset()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
  })

  it("redirects an already-authenticated student to their dashboard", () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "student")
    render(<ForgotPasswordPage />)
    expect(replace).toHaveBeenCalledWith("/student/dashboard")
  })

  it("redirects an already-authenticated mentor to their dashboard", () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "mentor")
    render(<ForgotPasswordPage />)
    expect(replace).toHaveBeenCalledWith("/mentor/dashboard")
  })

  it("does not redirect when there is no token", () => {
    render(<ForgotPasswordPage />)
    expect(replace).not.toHaveBeenCalled()
  })

  it("renders the email form", () => {
    render(<ForgotPasswordPage />)
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Отправить ссылку" })).toBeInTheDocument()
  })

  it("keeps the submit button disabled until an email is typed", () => {
    render(<ForgotPasswordPage />)
    expect(screen.getByRole("button", { name: "Отправить ссылку" })).toBeDisabled()
  })

  it("shows the generic success screen after a successful submit", async () => {
    const user = userEvent.setup()
    vi.mocked(api.requestPasswordReset).mockResolvedValue(undefined)
    render(<ForgotPasswordPage />)

    await user.type(screen.getByPlaceholderText("you@example.com"), "student@example.com")
    await user.click(screen.getByRole("button", { name: "Отправить ссылку" }))

    expect(await screen.findByText("Проверь почту")).toBeInTheDocument()
    expect(api.requestPasswordReset).toHaveBeenCalledWith("student@example.com")
  })

  it("shows an error message when the request fails", async () => {
    const user = userEvent.setup()
    vi.mocked(api.requestPasswordReset).mockRejectedValue(new Error("Не удалось отправить письмо"))
    render(<ForgotPasswordPage />)

    await user.type(screen.getByPlaceholderText("you@example.com"), "student@example.com")
    await user.click(screen.getByRole("button", { name: "Отправить ссылку" }))

    expect(await screen.findByText("Не удалось отправить письмо")).toBeInTheDocument()
  })

  it("shows a formatted cooldown message on CooldownError and disables the button", async () => {
    const user = userEvent.setup()
    vi.mocked(api.requestPasswordReset).mockRejectedValue(new api.CooldownError("Слишком много попыток", 90))
    render(<ForgotPasswordPage />)

    await user.type(screen.getByPlaceholderText("you@example.com"), "student@example.com")
    await user.click(screen.getByRole("button", { name: "Отправить ссылку" }))

    await waitFor(() => {
      expect(screen.getByText(/Слишком много попыток\. Подождите/)).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "Отправить ссылку" })).toBeDisabled()
  })
})
