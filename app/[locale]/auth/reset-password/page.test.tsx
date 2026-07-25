import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter, useSearchParams } from "next/navigation"
import * as api from "@/lib/api"
import ResetPasswordPage from "./page"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    confirmPasswordReset: vi.fn(),
  }
})

describe("ResetPasswordPage", () => {
  const replace = vi.fn()

  beforeEach(() => {
    vi.useRealTimers()
    replace.mockClear()
    vi.mocked(api.confirmPasswordReset).mockReset()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>)
  })

  it("shows the broken-link screen when there is no token in the URL", () => {
    render(<ResetPasswordPage />)
    expect(screen.getByText("Ссылка повреждена")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Запросить новую ссылку" })).toHaveAttribute(
      "href",
      "/auth/forgot-password",
    )
  })

  it("renders the new-password form when a token is present", () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc123") as ReturnType<typeof useSearchParams>,
    )
    render(<ResetPasswordPage />)
    expect(screen.getByPlaceholderText("Минимум 12 символов")).toBeInTheDocument()
  })

  it("disables submit until the password reaches 12 characters", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc123") as ReturnType<typeof useSearchParams>,
    )
    const user = userEvent.setup()
    render(<ResetPasswordPage />)
    const input = screen.getByPlaceholderText("Минимум 12 символов")
    const submit = screen.getByRole("button", { name: "Установить пароль" })
    expect(submit).toBeDisabled()

    await user.type(input, "short")
    expect(submit).toBeDisabled()

    await user.type(input, "1234567890123")
    expect(submit).not.toBeDisabled()
  })

  it("submits the new password and shows the success screen", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc123") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.confirmPasswordReset).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<ResetPasswordPage />)

    await user.type(screen.getByPlaceholderText("Минимум 12 символов"), "supersecretpw123")
    await user.click(screen.getByRole("button", { name: "Установить пароль" }))

    expect(await screen.findByText("Пароль обновлён")).toBeInTheDocument()
    expect(api.confirmPasswordReset).toHaveBeenCalledWith("abc123", "supersecretpw123")
  })

  it("shows an error message when the reset fails", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc123") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.confirmPasswordReset).mockRejectedValue(new Error("Токен просрочен"))
    const user = userEvent.setup()
    render(<ResetPasswordPage />)

    await user.type(screen.getByPlaceholderText("Минимум 12 символов"), "supersecretpw123")
    await user.click(screen.getByRole("button", { name: "Установить пароль" }))

    expect(await screen.findByText("Токен просрочен")).toBeInTheDocument()
  })

  it("toggles password visibility", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc123") as ReturnType<typeof useSearchParams>,
    )
    const user = userEvent.setup()
    render(<ResetPasswordPage />)
    const input = screen.getByPlaceholderText("Минимум 12 символов")
    expect(input).toHaveAttribute("type", "password")

    const toggle = input.parentElement?.querySelector("button")
    expect(toggle).toBeTruthy()
    await user.click(toggle as HTMLButtonElement)
    expect(input).toHaveAttribute("type", "text")
  })
})
