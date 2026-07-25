import { render, screen } from "@testing-library/react"
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
  }
})

describe("TgCallbackPage", () => {
  const push = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    push.mockClear()
    vi.mocked(api.telegramFinalize).mockReset()
    vi.mocked(api.fetchMe).mockReset()
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

  it("routes a brand-new student straight to onboarding without asking again", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.telegramFinalize).mockResolvedValue({
      user_id: 1, created: true, access: "acc", refresh: "ref",
    })
    vi.mocked(api.fetchMe).mockResolvedValue({ role: "student" } as never)

    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<TgCallbackPage />)

    await vi.waitFor(() => expect(screen.getByText("Вход выполнен!")).toBeInTheDocument())
    expect(localStorage.getItem("role")).toBe("student")

    vi.advanceTimersByTime(1500)
    expect(push).toHaveBeenCalledWith("/onboarding/student")
    vi.useRealTimers()
  })

  it("routes a brand-new mentor straight to identity onboarding", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.telegramFinalize).mockResolvedValue({
      user_id: 1, created: true, access: "acc", refresh: "ref",
    })
    vi.mocked(api.fetchMe).mockResolvedValue({ role: "mentor" } as never)

    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<TgCallbackPage />)

    await vi.waitFor(() => expect(screen.getByText("Вход выполнен!")).toBeInTheDocument())
    expect(localStorage.getItem("role")).toBe("mentor")

    vi.advanceTimersByTime(1500)
    expect(push).toHaveBeenCalledWith("/onboarding/mentor/identity")
    vi.useRealTimers()
  })

  it("logs an existing account straight in and redirects by role", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.telegramFinalize).mockResolvedValue({
      user_id: 1, created: false, access: "acc", refresh: "ref",
    })
    vi.mocked(api.fetchMe).mockResolvedValue({ role: "mentor" } as never)

    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<TgCallbackPage />)

    await vi.waitFor(() => expect(screen.getByText("Вход выполнен!")).toBeInTheDocument())
    expect(localStorage.getItem("role")).toBe("mentor")

    vi.advanceTimersByTime(1500)
    expect(push).toHaveBeenCalledWith("/mentor/dashboard")
    vi.useRealTimers()
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
