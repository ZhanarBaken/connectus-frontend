import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import * as api from "@/lib/api"
import RegisterPage from "./page"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    register: vi.fn(),
    resendVerification: vi.fn(),
    updateUnverifiedEmail: vi.fn(),
    googleAuth: vi.fn(),
    telegramStart: vi.fn(),
    fetchMe: vi.fn(),
    fetchPublicSettings: vi.fn(),
  }
})

async function giveConsent(user: ReturnType<typeof userEvent.setup>) {
  // The consent modal fetches its text lazily once opened.
  await screen.findByText("Я даю согласие")
  const consentBtn = await screen.findByRole("button", { name: "Я даю согласие" })
  await vi.waitFor(() => expect(consentBtn).not.toBeDisabled())
  await user.click(consentBtn)
}

describe("RegisterPage", () => {
  const push = vi.fn()
  const replace = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    push.mockClear()
    replace.mockClear()
    vi.mocked(api.register).mockReset()
    vi.mocked(api.resendVerification).mockReset()
    vi.mocked(api.updateUnverifiedEmail).mockReset()
    vi.mocked(api.googleAuth).mockReset()
    vi.mocked(api.telegramStart).mockReset()
    vi.mocked(api.fetchMe).mockReset()
    vi.mocked(api.fetchPublicSettings).mockReset()
    vi.mocked(api.fetchPublicSettings).mockResolvedValue({
      dispute_window_hours: 48,
      support_dispute_window_hours: 168,
      support_intro_call_response_deadline_hours: 24,
      support_url: "",
      terms_text: "",
      platform_rules_text: "",
      data_consent_text: "Мы обрабатываем твои данные согласно закону.",
      privacy_policy_text: "",
      support_intro_call_duration_minutes: 30,
    })
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

  it("skips the role picker and preselects mentor when linked with ?role=mentor", () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("role=mentor") as ReturnType<typeof useSearchParams>,
    )
    render(<RegisterPage />)
    expect(screen.getByText("Создай аккаунт")).toBeInTheDocument()
    expect(screen.getByText("ментор")).toBeInTheDocument()
  })

  it("redirects an already-authenticated user to their dashboard", () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "mentor")
    render(<RegisterPage />)
    expect(replace).toHaveBeenCalledWith("/mentor/dashboard")
  })

  it("starts on step 1 with student selected by default", () => {
    render(<RegisterPage />)
    expect(screen.getByText("Кто ты?")).toBeInTheDocument()
    expect(screen.getByText("Я абитуриент или родитель")).toBeInTheDocument()
    expect(screen.getByText("Я ментор")).toBeInTheDocument()
  })

  it("lets the user pick the mentor role and move to step 2", async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByText("Я ментор"))
    await user.click(screen.getByRole("button", { name: "Продолжить →" }))

    expect(screen.getByText("Создай аккаунт")).toBeInTheDocument()
    expect(screen.getByText("ментор")).toBeInTheDocument()
  })

  it("disables the email-signup submit button until terms are accepted", async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)
    await user.click(screen.getByRole("button", { name: "Продолжить →" }))

    const submit = screen.getByRole("button", { name: "Создать аккаунт через email" })
    expect(submit).toBeDisabled()

    await user.type(screen.getByPlaceholderText("you@example.com"), "student@example.com")
    await user.type(screen.getByPlaceholderText("Минимум 12 символов"), "supersecretpw123")
    await user.click(screen.getByRole("checkbox"))

    expect(submit).not.toBeDisabled()
  })

  it("shows the consent modal on first submit, then registers after consent is given", async () => {
    vi.mocked(api.register).mockResolvedValue({ id: 1, email: "student@example.com", role: "student" })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole("button", { name: "Продолжить →" }))
    await user.type(screen.getByPlaceholderText("you@example.com"), "student@example.com")
    await user.type(screen.getByPlaceholderText("Минимум 12 символов"), "supersecretpw123")
    await user.click(screen.getByRole("checkbox"))
    await user.click(screen.getByRole("button", { name: "Создать аккаунт через email" }))

    await giveConsent(user)

    expect(await screen.findByText("Проверь почту")).toBeInTheDocument()
    expect(api.register).toHaveBeenCalledWith("student@example.com", "supersecretpw123", "student", true, "KZ")
  })

  it("passes the chosen country to whichever signup method is used", async () => {
    vi.mocked(api.register).mockResolvedValue({ id: 1, email: "student@example.com", role: "student" })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole("button", { name: "Продолжить →" }))
    await user.click(screen.getByText(/Узбекистан/))
    await user.type(screen.getByPlaceholderText("you@example.com"), "student@example.com")
    await user.type(screen.getByPlaceholderText("Минимум 12 символов"), "supersecretpw123")
    await user.click(screen.getByRole("checkbox"))
    await user.click(screen.getByRole("button", { name: "Создать аккаунт через email" }))

    await giveConsent(user)

    await screen.findByText("Проверь почту")
    expect(api.register).toHaveBeenCalledWith("student@example.com", "supersecretpw123", "student", true, "UZ")
  })

  it("does not re-show the consent modal on a second signup flow in the same session", async () => {
    vi.mocked(api.register).mockResolvedValue({ id: 1, email: "student@example.com", role: "student" })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole("button", { name: "Продолжить →" }))
    await user.type(screen.getByPlaceholderText("you@example.com"), "student@example.com")
    await user.type(screen.getByPlaceholderText("Минимум 12 символов"), "supersecretpw123")
    await user.click(screen.getByRole("checkbox"))
    await user.click(screen.getByRole("button", { name: "Создать аккаунт через email" }))
    await giveConsent(user)
    await screen.findByText("Проверь почту")

    // fetchPublicSettings should only have been called once (modal opened once)
    expect(api.fetchPublicSettings).toHaveBeenCalledTimes(1)
  })

  it("shows a server error message when registration fails", async () => {
    vi.mocked(api.register).mockRejectedValue(new Error("Этот email уже занят"))
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole("button", { name: "Продолжить →" }))
    await user.type(screen.getByPlaceholderText("you@example.com"), "student@example.com")
    await user.type(screen.getByPlaceholderText("Минимум 12 символов"), "supersecretpw123")
    await user.click(screen.getByRole("checkbox"))
    await user.click(screen.getByRole("button", { name: "Создать аккаунт через email" }))
    await giveConsent(user)

    expect(await screen.findByText("Этот email уже занят")).toBeInTheDocument()
  })

  it("cancelling the consent modal leaves the form untouched (no registration call)", async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole("button", { name: "Продолжить →" }))
    await user.type(screen.getByPlaceholderText("you@example.com"), "student@example.com")
    await user.type(screen.getByPlaceholderText("Минимум 12 символов"), "supersecretpw123")
    await user.click(screen.getByRole("checkbox"))
    await user.click(screen.getByRole("button", { name: "Создать аккаунт через email" }))

    await screen.findByText("Я даю согласие")
    await user.click(screen.getByRole("button", { name: "Отмена" }))

    expect(api.register).not.toHaveBeenCalled()
    expect(screen.getByText("Создай аккаунт")).toBeInTheDocument()
  })

  it("resends the verification email from the post-registration screen", async () => {
    vi.mocked(api.register).mockResolvedValue({ id: 1, email: "student@example.com", role: "student" })
    vi.mocked(api.resendVerification).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole("button", { name: "Продолжить →" }))
    await user.type(screen.getByPlaceholderText("you@example.com"), "student@example.com")
    await user.type(screen.getByPlaceholderText("Минимум 12 символов"), "supersecretpw123")
    await user.click(screen.getByRole("checkbox"))
    await user.click(screen.getByRole("button", { name: "Создать аккаунт через email" }))
    await giveConsent(user)
    await screen.findByText("Проверь почту")

    await user.click(screen.getByRole("button", { name: "Отправить письмо повторно" }))

    expect(await screen.findByText("Письмо отправлено повторно ✓")).toBeInTheDocument()
    expect(api.resendVerification).toHaveBeenCalledWith("student@example.com")
  })

  it("passes the current locale to telegramStart when registering via Telegram", async () => {
    vi.mocked(api.telegramStart).mockResolvedValue({ token: "tok123", bot_url: "https://t.me/bot?start=signup_tok123" })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole("button", { name: "Продолжить →" }))
    await user.click(screen.getByRole("button", { name: "Продолжить через Telegram" }))
    await giveConsent(user)

    await vi.waitFor(() => {
      expect(api.telegramStart).toHaveBeenCalledWith("student", "ru", "KZ")
    })
  })

  // Regression test for the bug where the whole form (Telegram button,
  // Google button, email/password submit) stayed stuck disabled forever
  // if `window.location.href = bot_url` didn't actually navigate away
  // (e.g. an installed Telegram Desktop app intercepting the link
  // without unloading the tab, or an extension silently blocking it).
  it("shows a manual fallback link and re-enables the rest of the form after a successful telegramStart", async () => {
    vi.mocked(api.telegramStart).mockResolvedValue({ token: "tok123", bot_url: "https://t.me/bot?start=signup_tok123" })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole("button", { name: "Продолжить →" }))
    await user.click(screen.getByRole("button", { name: "Продолжить через Telegram" }))
    await giveConsent(user)

    const fallbackLink = await screen.findByRole("link", { name: "Открыть ссылку вручную" })
    expect(fallbackLink).toHaveAttribute("href", "https://t.me/bot?start=signup_tok123")
    expect(screen.getByRole("button", { name: "Продолжить через Google" })).not.toBeDisabled()
  })

  it("disables the Telegram button itself once a redirect is pending, so a stuck navigation can't be retried into a second, orphaning token", async () => {
    vi.mocked(api.telegramStart).mockResolvedValue({ token: "tok123", bot_url: "https://t.me/bot?start=signup_tok123" })
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole("button", { name: "Продолжить →" }))
    await user.click(screen.getByRole("button", { name: "Продолжить через Telegram" }))
    await giveConsent(user)
    await screen.findByRole("link", { name: "Открыть ссылку вручную" })

    expect(screen.getByRole("button", { name: "Продолжить через Telegram" })).toBeDisabled()
  })

  it("lets the user correct a mistyped email after registering", async () => {
    vi.mocked(api.register).mockResolvedValue({ id: 1, email: "typo@example.com", role: "student" })
    vi.mocked(api.updateUnverifiedEmail).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.click(screen.getByRole("button", { name: "Продолжить →" }))
    await user.type(screen.getByPlaceholderText("you@example.com"), "typo@example.com")
    await user.type(screen.getByPlaceholderText("Минимум 12 символов"), "supersecretpw123")
    await user.click(screen.getByRole("checkbox"))
    await user.click(screen.getByRole("button", { name: "Создать аккаунт через email" }))
    await giveConsent(user)
    await screen.findByText("Проверь почту")

    await user.click(screen.getByRole("button", { name: "Опечатался в email? Исправить" }))
    await user.type(screen.getByPlaceholderText("correct@example.com"), "fixed@example.com")
    await user.click(screen.getByRole("button", { name: "Сохранить" }))

    expect(await screen.findByText("Email обновлён, письмо отправлено ✓")).toBeInTheDocument()
    expect(api.updateUnverifiedEmail).toHaveBeenCalledWith("typo@example.com", "fixed@example.com")
    expect(screen.getByText("fixed@example.com")).toBeInTheDocument()
  })
})
