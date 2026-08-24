import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import * as api from "@/lib/api"
import TgLoginPage from "./page"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    telegramLogin: vi.fn(),
    fetchMe: vi.fn(),
  }
})

describe("TgLoginPage", () => {
  const push = vi.fn()
  const replace = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    push.mockClear()
    replace.mockClear()
    vi.mocked(api.telegramLogin).mockReset()
    vi.mocked(api.fetchMe).mockReset()
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>)
  })

  it("shows an error when there is no token in the URL", async () => {
    render(<TgLoginPage />)
    expect(await screen.findByText("Ошибка входа")).toBeInTheDocument()
    expect(screen.getByText("Токен не найден. Открой ссылку из бота заново.")).toBeInTheDocument()
  })

  it("strips the token from the URL bar immediately", () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.telegramLogin).mockReturnValue(new Promise(() => {}))
    render(<TgLoginPage />)
    expect(replace).toHaveBeenCalledWith("/auth/tg-login")
  })

  it("logs in, stores tokens/role, and shows the success screen", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.telegramLogin).mockResolvedValue({ user_id: 1, access: "acc", refresh: "ref" })
    vi.mocked(api.fetchMe).mockResolvedValue({ role: "student" } as never)

    render(<TgLoginPage />)

    expect(await screen.findByText("Вход выполнен!")).toBeInTheDocument()
    expect(localStorage.getItem("access_token")).toBe("acc")
    expect(localStorage.getItem("refresh_token")).toBe("ref")
    expect(localStorage.getItem("role")).toBe("student")
  })

  it("sends an admin straight to /crm instead of a dashboard", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.telegramLogin).mockResolvedValue({ user_id: 1, access: "acc", refresh: "ref" })
    vi.mocked(api.fetchMe).mockResolvedValue({ role: "admin" } as never)

    const originalLocation = window.location
    // jsdom's window.location isn't directly assignable and throws a
    // "not implemented: navigation" error on a real href set — swap in a
    // plain writable stand-in so we can assert the redirect target.
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: { ...originalLocation, href: "" },
    })

    render(<TgLoginPage />)
    expect(await screen.findByText("Вход выполнен!")).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(1500)

    expect(window.location.href).toBe("/crm")
    expect(push).not.toHaveBeenCalled()

    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: originalLocation,
    })
    vi.useRealTimers()
  })

  it("shows an error screen with a fallback-to-login CTA when login fails", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=bad") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.telegramLogin).mockRejectedValue(new Error("Ссылка недействительна"))

    render(<TgLoginPage />)

    expect(await screen.findByText("Ссылка недействительна")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Войти обычным способом" })).toBeInTheDocument()
  })
})
