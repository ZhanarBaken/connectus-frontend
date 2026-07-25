import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "@/i18n/navigation"
import * as api from "@/lib/api"
import { User } from "@/types"
import MentorIdentityPage from "./page"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    fetchMe: vi.fn(),
    setEmail: vi.fn(),
    changeEmail: vi.fn(),
    resendVerification: vi.fn(),
    googleLink: vi.fn(),
    telegramLinkStart: vi.fn(),
    telegramLinkFinalize: vi.fn(),
    clearAuth: vi.fn(),
  }
})

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: "",
    role: "mentor",
    email_verified: false,
    has_telegram: false,
    telegram_username: null,
    has_google: false,
    google_email_at_signup: null,
    has_password: true,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("MentorIdentityPage", () => {
  const push = vi.fn()
  const replace = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem("access_token", "tok")
    push.mockClear()
    replace.mockClear()
    vi.mocked(api.fetchMe).mockReset()
    vi.mocked(api.setEmail).mockReset()
    vi.mocked(api.changeEmail).mockReset()
    vi.mocked(api.resendVerification).mockReset()
    vi.mocked(api.googleLink).mockReset()
    vi.mocked(api.telegramLinkStart).mockReset()
    vi.mocked(api.telegramLinkFinalize).mockReset()
    vi.mocked(api.clearAuth).mockReset()
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
  })

  it("redirects to login when there is no access token", () => {
    localStorage.clear()
    render(<MentorIdentityPage />)
    expect(replace).toHaveBeenCalledWith("/auth/login")
  })

  it("redirects a student who lands here to their dashboard", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ role: "student" }))
    render(<MentorIdentityPage />)
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/student/dashboard"))
  })

  it("skips ahead to onboarding when identity is already complete", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(
      makeUser({ email: "mentor@example.com", email_verified: true, has_telegram: true }),
    )
    render(<MentorIdentityPage />)
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/mentor"))
  })

  it("shows the email + telegram cards when identity is incomplete", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    render(<MentorIdentityPage />)

    expect(await screen.findByText("Подтверди свои контакты")).toBeInTheDocument()
    expect(screen.getByText("Email")).toBeInTheDocument()
    expect(screen.getByText("Telegram")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Сначала привяжи и email, и Telegram" })).toBeDisabled()
  })

  it("submits a new email and shows the pending-verification copy after reload", async () => {
    vi.mocked(api.fetchMe)
      .mockResolvedValueOnce(makeUser())
      .mockResolvedValueOnce(makeUser({ email: "mentor@example.com" }))
    vi.mocked(api.setEmail).mockResolvedValue(undefined)

    const user = userEvent.setup()
    render(<MentorIdentityPage />)
    await screen.findByText("Подтверди свои контакты")

    await user.type(screen.getByPlaceholderText("you@example.com"), "mentor@example.com")
    await user.click(screen.getByRole("button", { name: "Сохранить и отправить письмо" }))

    expect(await screen.findByText(/Письмо отправлено на mentor@example\.com/)).toBeInTheDocument()
    expect(api.setEmail).toHaveBeenCalledWith("mentor@example.com")
  })

  it("shows an amber notice when the email is already taken by another account", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.setEmail).mockRejectedValue(new api.EmailTakenError("Уже занято"))

    const user = userEvent.setup()
    render(<MentorIdentityPage />)
    await screen.findByText("Подтверди свои контакты")

    await user.type(screen.getByPlaceholderText("you@example.com"), "taken@example.com")
    await user.click(screen.getByRole("button", { name: "Сохранить и отправить письмо" }))

    expect(await screen.findByText(/Эта почта уже зарегистрирована/)).toBeInTheDocument()
  })

  it("lets the mentor resend the verification email while pending", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ email: "mentor@example.com" }))
    vi.mocked(api.resendVerification).mockResolvedValue(undefined)

    const user = userEvent.setup()
    render(<MentorIdentityPage />)
    await screen.findByText(/Письмо отправлено на mentor@example\.com/)

    await user.click(screen.getByRole("button", { name: "Отправить ещё раз" }))

    expect(api.resendVerification).toHaveBeenCalledWith("mentor@example.com")
  })

  it("starts the Telegram link flow and redirects the browser to the bot", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ email: "mentor@example.com", email_verified: true }))
    vi.mocked(api.telegramLinkStart).mockResolvedValue({ token: "t1", bot_url: "https://t.me/bot?start=t1" })

    const originalLocation = window.location
    // jsdom's window.location isn't directly assignable and throws a
    // "not implemented: navigation" error on a real href set — swap in a
    // plain writable stand-in so we can assert the redirect target.
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: { ...originalLocation, href: "" },
    })

    const user = userEvent.setup()
    render(<MentorIdentityPage />)
    await screen.findByText("Подтверждён: mentor@example.com")

    await user.click(screen.getByRole("button", { name: "Привязать Telegram" }))

    expect(window.location.href).toBe("https://t.me/bot?start=t1")
    expect(localStorage.getItem("tg_link_return")).toBe("/onboarding/mentor/identity")

    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: originalLocation,
    })
  })

  it("enables Continue once the last-missing piece (email) becomes ready via an in-session reload", async () => {
    // Mount with Telegram already linked but email still unverified —
    // the mount-time auto-skip only fires when BOTH are ready together,
    // so this state renders the review UI instead of redirecting away.
    vi.mocked(api.fetchMe)
      .mockResolvedValueOnce(
        makeUser({ email: "mentor@example.com", email_verified: false, has_telegram: true, telegram_username: "mentoruser" }),
      )
      .mockResolvedValueOnce(
        makeUser({ email: "mentor@example.com", email_verified: true, has_telegram: true, telegram_username: "mentoruser" }),
      )

    const user = userEvent.setup()
    render(<MentorIdentityPage />)

    await screen.findByText("Привязан: @mentoruser")
    expect(screen.getByRole("button", { name: "Сначала привяжи и email, и Telegram" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Я подтвердил, обновить" }))

    expect(await screen.findByText("Подтверждён: mentor@example.com")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Продолжить →" })).not.toBeDisabled()
  })
})
