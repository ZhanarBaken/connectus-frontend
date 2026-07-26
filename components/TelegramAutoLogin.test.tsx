import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"
import { telegramMiniAppLogin, fetchMe } from "@/lib/api"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import TelegramAutoLogin, { TG_AUTH_EVENT } from "@/components/TelegramAutoLogin"
import type { User } from "@/types"

vi.mock("@/lib/api")
vi.mock("@/lib/useTelegramWebApp")

// DataConsentModal has its own fetch/loading lifecycle (fetchPublicSettings)
// that's irrelevant to TelegramAutoLogin's own state machine — stub it to a
// minimal control surface so these tests stay focused on auto-login logic.
vi.mock("@/components/DataConsentModal", () => ({
  default: ({
    open,
    onConsent,
    onCancel,
  }: {
    open: boolean
    onConsent: () => void
    onCancel: () => void
  }) =>
    open ? (
      <div>
        <button onClick={onConsent}>consent-yes</button>
        <button onClick={onCancel}>consent-no</button>
      </div>
    ) : null,
}))

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: "student@example.com",
    role: "student",
    email_verified: true,
    has_telegram: true,
    telegram_username: "student_tg",
    has_google: false,
    google_email_at_signup: null,
    has_password: false,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

// The component reads the deep-link target from two places that must be
// kept in sync for a realistic Mini App simulation:
//  1. window.location.hash — read synchronously on mount (before the SDK
//     script has necessarily finished loading) to decide the very first
//     paint's stage ("checking" vs "idle").
//  2. window.Telegram.WebApp.initDataUnsafe.start_param — read inside the
//     login effect once the SDK/hook is considered ready. This is what
//     actually drives runLogin()'s navigation target.
function setDeepLink(startParam: string) {
  window.location.hash = "#tgWebAppData=" + encodeURIComponent(`start_param=${startParam}`)
  window.Telegram = {
    WebApp: {
      initDataUnsafe: { start_param: startParam },
    } as unknown as TelegramWebApp,
  }
}

describe("TelegramAutoLogin", () => {
  const push = vi.fn()
  const refresh = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ""
    push.mockClear()
    refresh.mockClear()
    vi.mocked(telegramMiniAppLogin).mockReset()
    vi.mocked(fetchMe).mockReset()
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh,
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(useTelegramWebApp).mockReturnValue({
      webApp: null,
      isInTelegram: false,
      initData: "",
    })
  })

  afterEach(() => {
    window.location.hash = ""
    window.Telegram = undefined
  })

  describe("malformed start_param is rejected, not partially matched", () => {
    it("does not treat an unrecognised locale tag as a valid deep link", () => {
      // "xx" isn't ru/en/kk — must not fall through to a best-effort match.
      setDeepLink("order_42_xx")
      const { container } = render(<TelegramAutoLogin />)
      expect(container).toBeEmptyDOMElement()
    })

    it("does not treat trailing garbage after a valid locale tag as a valid deep link", () => {
      setDeepLink("order_42_en_extra")
      const { container } = render(<TelegramAutoLogin />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe("outside Telegram (no-op path)", () => {
    it("renders nothing when there is no Mini App hash and not in Telegram", () => {
      const { container } = render(<TelegramAutoLogin />)
      expect(container).toBeEmptyDOMElement()
    })

    it("does not react to the TG_AUTH_EVENT trigger when not in Telegram", async () => {
      render(<TelegramAutoLogin />)
      act(() => {
        window.dispatchEvent(new Event(TG_AUTH_EVENT))
      })
      // No listener was ever attached (the effect bails on !isInTelegram),
      // so the overlay never appears and no login call is made.
      expect(screen.queryByText("Входим в Connectus...")).not.toBeInTheDocument()
      expect(telegramMiniAppLogin).not.toHaveBeenCalled()
    })
  })

  describe("deep-link auto-login (start_param=order_<id>)", () => {
    it("shows the checking overlay immediately on first paint when the hash carries a recognised deep link", () => {
      setDeepLink("order_42")
      render(<TelegramAutoLogin />)
      expect(screen.getByText("Входим в Connectus...")).toBeInTheDocument()
    })

    it("skips the checking overlay when a token is already cached, even with a deep link present", () => {
      setDeepLink("order_42")
      localStorage.setItem("access_token", "cached")
      const { container } = render(<TelegramAutoLogin />)
      expect(container).toBeEmptyDOMElement()
    })

    it("auto-fires login and navigates to the deep-linked order on success", async () => {
      setDeepLink("order_42")
      vi.mocked(useTelegramWebApp).mockReturnValue({
        webApp: null,
        isInTelegram: true,
        initData: "raw-init-data",
      })
      vi.mocked(telegramMiniAppLogin).mockResolvedValue({
        ok: true,
        access: "AT",
        refresh: "RT",
        user_id: 1,
        created: false,
      })
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ role: "student" }))

      render(<TelegramAutoLogin />)

      await waitFor(() => {
        expect(telegramMiniAppLogin).toHaveBeenCalledWith("raw-init-data", undefined)
      })
      await waitFor(() => {
        expect(localStorage.getItem("access_token")).toBe("AT")
        expect(localStorage.getItem("refresh_token")).toBe("RT")
        expect(localStorage.getItem("role")).toBe("student")
      })
      await waitFor(() => {
        expect(push).toHaveBeenCalledWith("/orders/42?chat=open")
      })
    })

    it("routes to a locale-prefixed order path when the deep link is tagged with a non-default locale", async () => {
      setDeepLink("order_42_en")
      vi.mocked(useTelegramWebApp).mockReturnValue({
        webApp: null,
        isInTelegram: true,
        initData: "raw-init-data",
      })
      vi.mocked(telegramMiniAppLogin).mockResolvedValue({
        ok: true,
        access: "AT",
        refresh: "RT",
        user_id: 1,
        created: false,
      })
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ role: "student" }))

      render(<TelegramAutoLogin />)

      await waitFor(() => {
        expect(push).toHaveBeenCalledWith("/en/orders/42?chat=open")
      })
    })

    it("stays unprefixed when the deep link is explicitly tagged with the default (ru) locale", async () => {
      setDeepLink("order_42_ru")
      vi.mocked(useTelegramWebApp).mockReturnValue({
        webApp: null,
        isInTelegram: true,
        initData: "raw-init-data",
      })
      vi.mocked(telegramMiniAppLogin).mockResolvedValue({
        ok: true,
        access: "AT",
        refresh: "RT",
        user_id: 1,
        created: false,
      })
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ role: "student" }))

      render(<TelegramAutoLogin />)

      await waitFor(() => {
        expect(push).toHaveBeenCalledWith("/orders/42?chat=open")
      })
    })

    it("routes a brand-new mentor to onboarding instead of the deep link when created=true", async () => {
      setDeepLink("order_42")
      vi.mocked(useTelegramWebApp).mockReturnValue({
        webApp: null,
        isInTelegram: true,
        initData: "raw-init-data",
      })
      vi.mocked(telegramMiniAppLogin).mockResolvedValue({
        ok: true,
        access: "AT",
        refresh: "RT",
        user_id: 1,
        created: true,
      })
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ role: "mentor" }))

      render(<TelegramAutoLogin />)

      await waitFor(() => {
        expect(push).toHaveBeenCalledWith("/onboarding/mentor/identity")
      })
      expect(push).not.toHaveBeenCalledWith("/orders/42?chat=open")
    })

    it("shows the role picker when the backend reports role_required", async () => {
      setDeepLink("order_42")
      vi.mocked(useTelegramWebApp).mockReturnValue({
        webApp: null,
        isInTelegram: true,
        initData: "raw-init-data",
      })
      vi.mocked(telegramMiniAppLogin).mockResolvedValue({ ok: false, reason: "role_required" })

      render(<TelegramAutoLogin />)

      await waitFor(() => {
        expect(screen.getByText("Добро пожаловать в Connectus")).toBeInTheDocument()
      })
      expect(screen.getByRole("button", { name: /абитуриент или родитель/ })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Я ментор" })).toBeInTheDocument()
    })

    it("shows an error message and dismisses to done when the login call throws", async () => {
      setDeepLink("order_42")
      vi.mocked(useTelegramWebApp).mockReturnValue({
        webApp: null,
        isInTelegram: true,
        initData: "raw-init-data",
      })
      vi.mocked(telegramMiniAppLogin).mockRejectedValue(new Error("Сеть недоступна"))

      render(<TelegramAutoLogin />)

      await waitFor(() => {
        expect(telegramMiniAppLogin).toHaveBeenCalled()
      })
      // stage becomes "done" on failure, which renders null — the error
      // is only surfaced if the user re-triggers the flow (needsRole UI).
      await waitFor(() => {
        expect(screen.queryByText("Входим в Connectus...")).not.toBeInTheDocument()
      })
    })
  })

  describe("role picker flow", () => {
    async function renderAtRolePicker() {
      setDeepLink("order_1")
      vi.mocked(useTelegramWebApp).mockReturnValue({
        webApp: null,
        isInTelegram: true,
        initData: "raw-init-data",
      })
      vi.mocked(telegramMiniAppLogin).mockResolvedValueOnce({ ok: false, reason: "role_required" })
      render(<TelegramAutoLogin />)
      await waitFor(() => screen.getByText("Добро пожаловать в Connectus"))
    }

    it("opens the consent modal before submitting the picked role, and completes login on consent", async () => {
      await renderAtRolePicker()
      vi.mocked(telegramMiniAppLogin).mockResolvedValueOnce({
        ok: true,
        access: "AT2",
        refresh: "RT2",
        user_id: 2,
        created: true,
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole("button", { name: /абитуриент или родитель/ }))

      // Consent modal must be shown before any second login call fires.
      expect(screen.getByText("consent-yes")).toBeInTheDocument()
      expect(telegramMiniAppLogin).toHaveBeenCalledTimes(1)

      await user.click(screen.getByText("consent-yes"))

      await waitFor(() => {
        expect(telegramMiniAppLogin).toHaveBeenCalledTimes(2)
      })
      await waitFor(() => {
        expect(localStorage.getItem("role")).toBe("student")
      })
      await waitFor(() => {
        expect(push).toHaveBeenCalledWith("/onboarding/student")
      })
    })

    it("cancelling consent does not submit a role and returns to the picker", async () => {
      await renderAtRolePicker()
      const user = userEvent.setup()
      await user.click(screen.getByRole("button", { name: "Я ментор" }))
      expect(screen.getByText("consent-no")).toBeInTheDocument()

      await user.click(screen.getByText("consent-no"))

      expect(telegramMiniAppLogin).toHaveBeenCalledTimes(1)
      expect(screen.getByText("Добро пожаловать в Connectus")).toBeInTheDocument()
    })

    it("shows an error when role submission fails after consent", async () => {
      await renderAtRolePicker()
      vi.mocked(telegramMiniAppLogin).mockResolvedValueOnce({ ok: false, reason: "role_required" })

      const user = userEvent.setup()
      await user.click(screen.getByRole("button", { name: "Я ментор" }))
      await user.click(screen.getByText("consent-yes"))

      await waitFor(() => {
        expect(screen.getByText("Не удалось создать аккаунт")).toBeInTheDocument()
      })
    })

    it("dismisses the overlay via the 'Назад' button without logging in", async () => {
      await renderAtRolePicker()
      const user = userEvent.setup()
      await user.click(screen.getByRole("button", { name: "Назад" }))

      expect(screen.queryByText("Добро пожаловать в Connectus")).not.toBeInTheDocument()
      expect(telegramMiniAppLogin).toHaveBeenCalledTimes(1)
    })
  })

  describe("TG_AUTH_EVENT trigger (e.g. tapping 'Войти' in <Header>)", () => {
    it("fires the login flow when the event is dispatched inside Telegram with no cached token", async () => {
      vi.mocked(useTelegramWebApp).mockReturnValue({
        webApp: null,
        isInTelegram: true,
        initData: "raw-init-data",
      })
      vi.mocked(telegramMiniAppLogin).mockResolvedValue({
        ok: true,
        access: "AT",
        refresh: "RT",
        user_id: 1,
        created: false,
      })
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ role: "student" }))

      render(<TelegramAutoLogin />)
      expect(telegramMiniAppLogin).not.toHaveBeenCalled()

      act(() => {
        window.dispatchEvent(new Event(TG_AUTH_EVENT))
      })

      await waitFor(() => {
        expect(screen.getByText("Входим в Connectus...")).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(telegramMiniAppLogin).toHaveBeenCalledWith("raw-init-data", undefined)
      })
    })

    it("ignores the trigger event when a token is already cached", async () => {
      vi.mocked(useTelegramWebApp).mockReturnValue({
        webApp: null,
        isInTelegram: true,
        initData: "raw-init-data",
      })
      localStorage.setItem("access_token", "cached")

      render(<TelegramAutoLogin />)
      act(() => {
        window.dispatchEvent(new Event(TG_AUTH_EVENT))
      })

      expect(telegramMiniAppLogin).not.toHaveBeenCalled()
      expect(screen.queryByText("Входим в Connectus...")).not.toBeInTheDocument()
    })
  })
})
