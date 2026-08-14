import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { useSearchParams } from "next/navigation"
import * as api from "@/lib/api"
import LoginPage from "./page"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return { ...actual, telegramStart: vi.fn() }
})

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>)
    vi.mocked(api.telegramStart).mockReset()
  })

  it("does not show the session-expired notice by default", () => {
    render(<LoginPage />)
    expect(screen.queryByText(/Сессия истекла/)).not.toBeInTheDocument()
  })

  it("shows the session-expired notice when redirected with session_expired=1", () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("session_expired=1") as ReturnType<typeof useSearchParams>,
    )
    render(<LoginPage />)
    expect(screen.getByText(/Сессия истекла/)).toBeInTheDocument()
  })

  it("renders the email/password form", () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("••••••••••••")).toBeInTheDocument()
  })

  it("passes the current locale to telegramStart when logging in via Telegram", async () => {
    vi.mocked(api.telegramStart).mockResolvedValue({ token: "tok123", bot_url: "https://t.me/bot?start=signup_tok123" })
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole("button", { name: "Войти через Telegram" }))

    await vi.waitFor(() => {
      expect(api.telegramStart).toHaveBeenCalledWith("student", "ru")
    })
  })

  // Regression test for the bug where the whole form (Telegram button,
  // Google button, email/password submit) stayed stuck disabled forever
  // if `window.location.href = bot_url` didn't actually navigate away
  // (e.g. an installed Telegram Desktop app intercepting the link
  // without unloading the tab, or an extension silently blocking it).
  it("shows a manual fallback link and re-enables the rest of the form after a successful telegramStart", async () => {
    vi.mocked(api.telegramStart).mockResolvedValue({ token: "tok123", bot_url: "https://t.me/bot?start=login_tok123" })
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole("button", { name: "Войти через Telegram" }))

    const fallbackLink = await screen.findByRole("link", { name: "Открыть ссылку вручную" })
    expect(fallbackLink).toHaveAttribute("href", "https://t.me/bot?start=login_tok123")

    // The rest of the form must not stay stuck on "Logging in..." just
    // because the (possibly failed) redirect is still pending.
    expect(screen.getByRole("button", { name: "Войти через Google" })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: "Войти" })).not.toBeDisabled()
  })

  it("disables the Telegram button itself once a redirect is pending, so a stuck navigation can't be retried into a second, orphaning token", async () => {
    vi.mocked(api.telegramStart).mockResolvedValue({ token: "tok123", bot_url: "https://t.me/bot?start=login_tok123" })
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole("button", { name: "Войти через Telegram" }))
    await screen.findByRole("link", { name: "Открыть ссылку вручную" })

    expect(screen.getByRole("button", { name: "Войти через Telegram" })).toBeDisabled()
  })
})
