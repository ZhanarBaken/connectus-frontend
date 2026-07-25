import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import * as api from "@/lib/api"
import TgCallbackPage from "./page"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    telegramFinalize: vi.fn(),
    fetchMe: vi.fn(),
    setUserRole: vi.fn(),
  }
})

describe("TgCallbackPage", () => {
  const push = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    push.mockClear()
    vi.mocked(api.telegramFinalize).mockReset()
    vi.mocked(api.fetchMe).mockReset()
    vi.mocked(api.setUserRole).mockReset()
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>)
  })

  it("shows an error when there is no token in the URL or storage", async () => {
    render(<TgCallbackPage />)
    expect(await screen.findByText("Ошибка авторизации")).toBeInTheDocument()
    expect(screen.getByText("Токен не найден. Попробуйте войти заново.")).toBeInTheDocument()
  })

  it("falls back to a token saved in localStorage when the URL has none", () => {
    localStorage.setItem("tg_signup_token", "stashed")
    vi.mocked(api.telegramFinalize).mockReturnValue(new Promise(() => {}))
    render(<TgCallbackPage />)
    expect(api.telegramFinalize).toHaveBeenCalledWith("stashed")
  })

  it("shows the role picker for a brand-new account", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.telegramFinalize).mockResolvedValue({
      user_id: 1, created: true, access: "acc", refresh: "ref",
    })

    render(<TgCallbackPage />)

    expect(await screen.findByText("Кто вы?")).toBeInTheDocument()
    expect(localStorage.getItem("role")).toBe("student")
  })

  it("logs an existing account straight in and redirects by role", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.telegramFinalize).mockResolvedValue({
      user_id: 1, created: false, access: "acc", refresh: "ref",
    })
    vi.mocked(api.fetchMe).mockResolvedValue({ role: "mentor" } as never)

    render(<TgCallbackPage />)

    expect(await screen.findByText("Вход выполнен!")).toBeInTheDocument()
    expect(localStorage.getItem("role")).toBe("mentor")
  })

  it("confirms the picked role against the backend before routing to onboarding", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.telegramFinalize).mockResolvedValue({
      user_id: 1, created: true, access: "acc", refresh: "ref",
    })
    vi.mocked(api.setUserRole).mockResolvedValue(undefined)
    vi.mocked(api.fetchMe).mockResolvedValue({ role: "mentor" } as never)

    const user = userEvent.setup()
    render(<TgCallbackPage />)

    await screen.findByText("Кто вы?")
    await user.click(screen.getByRole("button", { name: "Я ментор" }))

    expect(api.setUserRole).toHaveBeenCalledWith("mentor")
    expect(await screen.findByText("Вход выполнен!")).toBeInTheDocument()
    expect(localStorage.getItem("role")).toBe("mentor")
  })

  it("shows an error when the finalize call fails", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.telegramFinalize).mockRejectedValue(new Error("Ссылка устарела"))

    render(<TgCallbackPage />)

    expect(await screen.findByText("Ссылка устарела")).toBeInTheDocument()
  })
})
