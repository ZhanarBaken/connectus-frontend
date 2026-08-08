import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter, usePathname } from "@/i18n/navigation"
import Header from "./Header"

vi.mock("@/lib/api", () => ({
  fetchChatUnread: vi.fn().mockResolvedValue({ total: 0, conversations: {} }),
  fetchUnreadNotificationCount: vi.fn().mockResolvedValue(0),
  fetchNotifications: vi.fn().mockResolvedValue([]),
  markNotificationsRead: vi.fn().mockResolvedValue(undefined),
  // getFreshAccessToken resolving to null keeps NotificationBell from
  // ever constructing a real WebSocket in jsdom — it just falls back
  // to (mocked, harmless) polling.
  getFreshAccessToken: vi.fn().mockResolvedValue(null),
}))

function renderHeader() {
  return render(<Header />)
}

describe("Header", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(usePathname).mockReturnValue("/")
    delete window.Telegram
  })

  it("shows guest nav + login/signup links when logged out", () => {
    renderHeader()
    expect(screen.getByText("Менторы")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/auth/login")
    expect(screen.getByRole("link", { name: "Регистрация" })).toHaveAttribute(
      "href",
      "/auth/register",
    )
  })

  it("does not show a logout button when logged out", () => {
    renderHeader()
    expect(screen.queryByText("Выйти")).not.toBeInTheDocument()
  })

  it("shows the mentor nav and logout button when role is mentor", async () => {
    localStorage.setItem("role", "mentor")
    renderHeader()
    await waitFor(() => expect(screen.getByText("Клиенты")).toBeInTheDocument())
    expect(screen.getByText("Кабинет")).toBeInTheDocument()
    expect(screen.getByText("Выйти")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Войти" })).not.toBeInTheDocument()
  })

  it("hides the mentor nav links while on the onboarding wizard", async () => {
    // Regression: dashboard/profile/schedule/services are gated behind
    // useMentorOnboardingGate — a not-yet-submitted mentor clicking any of
    // these from the header while still on /onboarding/mentor would just
    // get bounced straight back. The nav should show nothing there instead
    // of dead links.
    localStorage.setItem("role", "mentor")
    vi.mocked(usePathname).mockReturnValue("/onboarding/mentor")
    renderHeader()
    await waitFor(() => expect(screen.getByText("Выйти")).toBeInTheDocument())
    expect(screen.queryByText("Кабинет")).not.toBeInTheDocument()
    expect(screen.queryByText("Клиенты")).not.toBeInTheDocument()
  })

  it("points the logo at / even while on the onboarding wizard", async () => {
    localStorage.setItem("role", "mentor")
    vi.mocked(usePathname).mockReturnValue("/onboarding/mentor")
    renderHeader()
    await waitFor(() =>
      expect(screen.getByText("Connectus").closest("a")).toHaveAttribute("href", "/"),
    )
  })

  it("shows the student nav when role is student", async () => {
    localStorage.setItem("role", "student")
    renderHeader()
    await waitFor(() => expect(screen.getByText("Найти ментора")).toBeInTheDocument())
    expect(screen.getByText("Сообщения")).toBeInTheDocument()
  })

  it("shows the CRM link when role is admin", async () => {
    localStorage.setItem("role", "admin")
    renderHeader()
    await waitFor(() => expect(screen.getByText("CRM")).toBeInTheDocument())
  })

  it("points the logo home link at / for mentors", async () => {
    localStorage.setItem("role", "mentor")
    renderHeader()
    await waitFor(() =>
      expect(screen.getByText("Connectus").closest("a")).toHaveAttribute("href", "/"),
    )
  })

  it("points the logo home link at / for guests", () => {
    renderHeader()
    expect(screen.getByText("Connectus").closest("a")).toHaveAttribute("href", "/")
  })

  it("logs out, clears localStorage and redirects home", async () => {
    const push = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    localStorage.setItem("role", "student")
    localStorage.setItem("access_token", "abc")
    localStorage.setItem("refresh_token", "def")
    const user = userEvent.setup()
    renderHeader()

    await waitFor(() => expect(screen.getByText("Выйти")).toBeInTheDocument())
    await user.click(screen.getByText("Выйти"))

    expect(localStorage.getItem("access_token")).toBeNull()
    expect(localStorage.getItem("refresh_token")).toBeNull()
    expect(localStorage.getItem("role")).toBeNull()
    expect(push).toHaveBeenCalledWith("/")
  })

  it("toggles the mobile menu open and closed", async () => {
    renderHeader()
    // Guest nav links are duplicated between desktop and mobile menus
    // once the mobile menu is open, so start from a known state: closed.
    expect(screen.getAllByText("Менторы")).toHaveLength(1)

    const [menuButton] = document.querySelectorAll("button.md\\:hidden")
    fireEvent.click(menuButton)
    await waitFor(() => expect(screen.getAllByText("Менторы")).toHaveLength(2))

    fireEvent.click(menuButton)
    await waitFor(() => expect(screen.getAllByText("Менторы")).toHaveLength(1))
  })

  it("shows a Telegram-only signup trigger when inside the Telegram Mini App", () => {
    // @ts-expect-error - minimal Telegram WebApp stub for this test
    window.Telegram = { WebApp: { initData: "abc123", ready: vi.fn() } }
    renderHeader()
    expect(screen.queryByRole("link", { name: "Войти" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Регистрация" })).toBeInTheDocument()
  })

  it("dispatches the tg-auth-required event when the Telegram signup button is clicked", async () => {
    // @ts-expect-error - minimal Telegram WebApp stub for this test
    window.Telegram = { WebApp: { initData: "abc123", ready: vi.fn() } }
    const user = userEvent.setup()
    const handler = vi.fn()
    window.addEventListener("tg-auth-required", handler)
    renderHeader()
    await user.click(screen.getByRole("button", { name: "Регистрация" }))
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener("tg-auth-required", handler)
  })
})
