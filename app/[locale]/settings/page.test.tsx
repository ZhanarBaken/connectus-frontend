import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "@/i18n/navigation"
import SettingsPage from "./page"
import type { MentorProfile, StudentProfile, User } from "@/types"

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api")
  return {
    ...actual,
    fetchMentorProfile: vi.fn(),
    updateMentorProfile: vi.fn(),
    fetchStudentProfile: vi.fn(),
    updateStudentProfile: vi.fn(),
    fetchMe: vi.fn(),
    telegramLinkStart: vi.fn(),
    telegramLinkFinalize: vi.fn(),
    telegramUnlink: vi.fn(),
    googleLink: vi.fn(),
    googleUnlink: vi.fn(),
    setEmail: vi.fn(),
    changeEmail: vi.fn(),
    setPassword: vi.fn(),
  }
})

import {
  fetchMentorProfile,
  updateMentorProfile,
  fetchStudentProfile,
  updateStudentProfile,
  fetchMe,
  telegramLinkStart,
  telegramLinkFinalize,
  telegramUnlink,
  googleUnlink,
  setEmail,
  changeEmail,
  setPassword,
  CooldownError,
  MergeRequiresSupportError,
} from "@/lib/api"

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
    has_password: false,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeMentorProfile(overrides: Partial<MentorProfile> = {}): MentorProfile {
  return {
    id: 1,
    full_name: "Айгерим Ержанова",
    age: 25,
    countries: [],
    languages: [],
    school_or_university: "",
    major: "",
    grant_or_scholarship: "",
    gpa: "",
    exam_results: "",
    detailed_bio: "",
    linkedin_url: "",
    university_email: "",
    profile_photo: null,
    expertise_areas: [],
    contacts: "",
    phone: "",
    payout_details: "",
    graduation_year_or_current_course: "",
    is_approved: true,
    is_submitted: true,
    is_public: true,
    is_accepting_bookings: true,
    is_universal: false,
    is_banned: false,
    ban_reason: "",
    has_documents: true,
    rating_avg: null,
    rating_count: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeStudentProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    id: 1,
    full_name: "Данияр Сериков",
    date_of_birth: null,
    age: 17,
    current_school_or_university: "",
    contacts: "",
    school_grade: "",
    city: "",
    school_graduation_year: null,
    desired_major: "",
    desired_countries: "",
    exam_results: "",
    gpa: "",
    profile_photo: null,
    is_public: true,
    welcome_bonus_available: false,
    welcome_bonus_expires_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

function mockRouter() {
  const replace = vi.fn()
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as ReturnType<typeof useRouter>)
  return { replace }
}

function getToggleButton(labelText: string): HTMLElement {
  const label = screen.getByText(labelText)
  const row = label.closest("div.flex.items-start") as HTMLElement
  return within(row).getByRole("button")
}

describe("SettingsPage", () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.pushState({}, "", "/settings")
    vi.clearAllMocks()
  })

  it("redirects to /auth/login when there is no access token", async () => {
    const { replace } = mockRouter()
    render(<SettingsPage />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"))
  })

  describe("mentor role", () => {
    beforeEach(() => {
      localStorage.setItem("access_token", "fake-token")
      localStorage.setItem("role", "mentor")
      mockRouter()
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ role: "mentor" }))
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
    })

    it("renders the visibility and accepting-bookings toggles as on by default", async () => {
      render(<SettingsPage />)
      expect(await screen.findByText("Видимость профиля")).toBeInTheDocument()
      expect(getToggleButton("Видимость профиля")).toHaveAttribute("aria-pressed", "true")
      expect(getToggleButton("Приём заявок")).toHaveAttribute("aria-pressed", "true")
    })

    it("saves a toggle change and shows the saved confirmation", async () => {
      const user = userEvent.setup()
      vi.mocked(updateMentorProfile).mockResolvedValue(
        makeMentorProfile({ is_public: false }),
      )
      render(<SettingsPage />)

      await screen.findByText("Видимость профиля")
      const toggle = getToggleButton("Видимость профиля")
      await user.click(toggle)

      expect(updateMentorProfile).toHaveBeenCalledWith({ is_public: false })
      expect(await screen.findByText("Сохранено")).toBeInTheDocument()
    })

    it("reverts the toggle and shows an error when saving fails", async () => {
      const user = userEvent.setup()
      vi.mocked(updateMentorProfile).mockRejectedValue(new Error("Не удалось сохранить видимость"))
      render(<SettingsPage />)

      await screen.findByText("Видимость профиля")
      const toggle = getToggleButton("Видимость профиля")
      await user.click(toggle)

      expect(await screen.findByText("Не удалось сохранить видимость")).toBeInTheDocument()
      expect(getToggleButton("Видимость профиля")).toHaveAttribute("aria-pressed", "true")
    })

    it("shows the banned banner and disables toggles when the mentor is banned", async () => {
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile({ is_banned: true }))
      render(<SettingsPage />)

      expect(await screen.findByText("Аккаунт заблокирован")).toBeInTheDocument()
      expect(getToggleButton("Видимость профиля")).toBeDisabled()
    })
  })

  describe("student role", () => {
    beforeEach(() => {
      localStorage.setItem("access_token", "fake-token")
      localStorage.setItem("role", "student")
      mockRouter()
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ role: "student" }))
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile({ is_public: true }))
    })

    it("renders a single visibility toggle for students", async () => {
      render(<SettingsPage />)
      expect(await screen.findByText(/Только менторы, с которыми ты переписываешься/)).toBeInTheDocument()
    })

    it("saves the student visibility toggle", async () => {
      const user = userEvent.setup()
      vi.mocked(updateStudentProfile).mockResolvedValue(makeStudentProfile({ is_public: false }))
      render(<SettingsPage />)

      await screen.findByText("Видимость профиля")
      const toggle = getToggleButton("Видимость профиля")
      await user.click(toggle)

      expect(updateStudentProfile).toHaveBeenCalledWith({ is_public: false })
      expect(await screen.findByText("Сохранено")).toBeInTheDocument()
    })
  })

  describe("connected accounts", () => {
    beforeEach(() => {
      localStorage.setItem("access_token", "fake-token")
      localStorage.setItem("role", "mentor")
      mockRouter()
      vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
    })

    it("shows required-for-mentors hints when telegram and email are missing", async () => {
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ has_telegram: false, email: "" }))
      render(<SettingsPage />)

      const hints = await screen.findAllByText(/Обязательно для менторов/)
      // One hint next to Telegram, one next to Email.
      expect(hints).toHaveLength(2)
    })

    it("shows the verified email badge when email is confirmed", async () => {
      vi.mocked(fetchMe).mockResolvedValue(
        makeUser({ email: "mentor@example.com", email_verified: true }),
      )
      render(<SettingsPage />)

      expect(await screen.findByText("mentor@example.com")).toBeInTheDocument()
      expect(screen.getByText("· Подтверждён")).toBeInTheDocument()
    })

    it("two-tap confirms before unlinking telegram", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ has_telegram: true, telegram_username: "durka" }))
      vi.mocked(telegramUnlink).mockResolvedValue(undefined)
      render(<SettingsPage />)

      const firstClick = await screen.findByRole("button", { name: "Отвязать" })
      await user.click(firstClick)
      expect(telegramUnlink).not.toHaveBeenCalled()

      const confirmClick = await screen.findByRole("button", { name: "Точно отвязать?" })
      await user.click(confirmClick)

      expect(telegramUnlink).toHaveBeenCalledTimes(1)
      expect(await screen.findByText("Telegram отвязан")).toBeInTheDocument()
    })

    it("shows a config error when linking google without a configured client id", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ has_google: false }))
      render(<SettingsPage />)

      const linkButtons = await screen.findAllByRole("button", { name: "Привязать" })
      const googleLinkButton = linkButtons.find((btn) =>
        btn.closest("div.flex.items-center.gap-4")?.textContent?.includes("Google"),
      ) as HTMLElement
      await user.click(googleLinkButton)

      expect(await screen.findByText("Google не настроен")).toBeInTheDocument()
      expect(googleUnlink).not.toHaveBeenCalled()
    })

    it("adds a new email via setEmail when none is set yet", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ email: "" }))
      vi.mocked(setEmail).mockResolvedValue(undefined)
      render(<SettingsPage />)

      const addButton = await screen.findByRole("button", { name: "Добавить" })
      await user.click(addButton)

      const input = screen.getByPlaceholderText("email@example.com")
      await user.type(input, "new@example.com")
      await user.click(screen.getByRole("button", { name: "Сохранить" }))

      expect(setEmail).toHaveBeenCalledWith("new@example.com")
      expect(changeEmail).not.toHaveBeenCalled()
      expect(await screen.findByText("Ссылка для подтверждения отправлена")).toBeInTheDocument()
    })

    it("changes an existing email via changeEmail", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ email: "old@example.com", email_verified: true }))
      vi.mocked(changeEmail).mockResolvedValue(undefined)
      render(<SettingsPage />)

      const editButton = await screen.findByRole("button", { name: "Изменить" })
      await user.click(editButton)

      const input = screen.getByPlaceholderText("old@example.com")
      await user.type(input, "new@example.com")
      await user.click(screen.getByRole("button", { name: "Сохранить" }))

      expect(changeEmail).toHaveBeenCalledWith("new@example.com")
      expect(setEmail).not.toHaveBeenCalled()
    })

    it("shows a cooldown message and disables save when setEmail is rate-limited", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ email: "" }))
      vi.mocked(setEmail).mockRejectedValue(new CooldownError("Подождите 47 секунд", 47))
      render(<SettingsPage />)

      const addButton = await screen.findByRole("button", { name: "Добавить" })
      await user.click(addButton)
      const input = screen.getByPlaceholderText("email@example.com")
      await user.type(input, "new@example.com")
      await user.click(screen.getByRole("button", { name: "Сохранить" }))

      expect(await screen.findByText("Подождите 47 секунд")).toBeInTheDocument()
      expect(await screen.findByRole("button", { name: /Подождите 47с/ })).toBeDisabled()
    })

    it("rejects a password shorter than 12 characters without calling setPassword", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ email: "mentor@example.com" }))
      render(<SettingsPage />)

      const passwordButton = await screen.findByRole("button", { name: "Установить" })
      await user.click(passwordButton)
      const input = screen.getByPlaceholderText("Минимум 12 символов")
      await user.type(input, "short")
      await user.click(screen.getByRole("button", { name: "Сохранить" }))

      expect(screen.getByText("Пароль должен быть не менее 12 символов")).toBeInTheDocument()
      expect(setPassword).not.toHaveBeenCalled()
    })

    it("sets a password of valid length and shows a success message", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ email: "mentor@example.com", has_password: false }))
      vi.mocked(setPassword).mockResolvedValue(undefined)
      render(<SettingsPage />)

      const passwordButton = await screen.findByRole("button", { name: "Установить" })
      await user.click(passwordButton)
      const input = screen.getByPlaceholderText("Минимум 12 символов")
      await user.type(input, "supersecurepassword123")
      await user.click(screen.getByRole("button", { name: "Сохранить" }))

      expect(setPassword).toHaveBeenCalledWith("supersecurepassword123")
      expect(await screen.findByText("Пароль установлен")).toBeInTheDocument()
    })

    it("starts the telegram link flow by calling telegramLinkStart", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchMe).mockResolvedValue(makeUser({ has_telegram: false }))
      vi.mocked(telegramLinkStart).mockResolvedValue({ token: "tok", bot_url: "https://t.me/bot" })
      render(<SettingsPage />)

      const linkButtons = await screen.findAllByRole("button", { name: "Привязать" })
      const telegramLinkButton = linkButtons.find((btn) =>
        btn.closest("div.flex.items-center.gap-4")?.textContent?.includes("Telegram"),
      ) as HTMLElement
      await user.click(telegramLinkButton)

      await waitFor(() => expect(telegramLinkStart).toHaveBeenCalledTimes(1))
    })

    it("shows a merge-conflict notice when the telegram link callback requires support", async () => {
      window.history.pushState({}, "", "/settings?tg_link_token=abc123")
      vi.mocked(fetchMe).mockResolvedValue(makeUser())
      vi.mocked(telegramLinkFinalize).mockRejectedValue(
        new MergeRequiresSupportError("Требуется помощь поддержки"),
      )
      render(<SettingsPage />)

      expect(await screen.findByText("Telegram уже привязан к другому аккаунту")).toBeInTheDocument()
    })
  })
})
