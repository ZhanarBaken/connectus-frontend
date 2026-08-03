import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "@/i18n/navigation"
import * as api from "@/lib/api"
import { StudentProfile, User } from "@/types"
import StudentOnboarding from "./page"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    fetchMe: vi.fn(),
    fetchStudentProfile: vi.fn(),
    setEmail: vi.fn(),
    authFetch: vi.fn(),
    clearAuth: vi.fn(),
  }
})

// jsdom doesn't implement Element.scrollIntoView — the field-error path
// calls it to bring the first invalid field into view after a failed
// save, which would otherwise throw and abort the state update mid-catch.
Element.prototype.scrollIntoView = vi.fn()

function jsonResponse(data: unknown, ok = true): Response {
  return { ok, json: async () => data } as Response
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: "",
    role: "student",
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

function makeProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    id: 1,
    full_name: "",
    date_of_birth: null,
    age: null,
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
    is_profile_complete: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("StudentOnboarding", () => {
  const push = vi.fn()
  const replace = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    push.mockClear()
    replace.mockClear()
    vi.mocked(api.fetchMe).mockReset()
    vi.mocked(api.fetchStudentProfile).mockReset()
    vi.mocked(api.fetchStudentProfile).mockResolvedValue(makeProfile())
    vi.mocked(api.setEmail).mockReset()
    vi.mocked(api.authFetch).mockReset()
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

  it("clears stale auth and redirects to login when fetchMe fails", async () => {
    vi.mocked(api.fetchMe).mockRejectedValue(new Error("401"))
    render(<StudentOnboarding />)
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"))
    expect(api.clearAuth).toHaveBeenCalled()
  })

  it("redirects to the dashboard when the profile is already complete", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ email: "student@example.com", email_verified: true }))
    vi.mocked(api.fetchStudentProfile).mockResolvedValue(makeProfile({ is_profile_complete: true }))
    render(<StudentOnboarding />)
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/student/dashboard"))
  })

  it("shows the email step when the user has no email yet", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    render(<StudentOnboarding />)
    expect(await screen.findByText("Добавь email")).toBeInTheDocument()
  })

  it("shows the verify step when an email is set but not verified", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ email: "student@example.com" }))
    render(<StudentOnboarding />)
    expect(await screen.findByText("Проверь почту")).toBeInTheDocument()
    expect(screen.getByText("student@example.com")).toBeInTheDocument()
  })

  it("shows the profile form directly when the email is already verified", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ email: "student@example.com", email_verified: true }))
    render(<StudentOnboarding />)
    expect(await screen.findByText("О себе")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Айгерим Бекова")).toBeInTheDocument()
  })

  it("submits the email and moves to the verify stage", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.setEmail).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<StudentOnboarding />)
    await screen.findByText("Добавь email")

    await user.type(screen.getByPlaceholderText("you@example.com"), "student@example.com")
    await user.click(screen.getByRole("button", { name: "Отправить письмо для подтверждения" }))

    expect(await screen.findByText("Проверь почту")).toBeInTheDocument()
    expect(api.setEmail).toHaveBeenCalledWith("student@example.com", false)
  })

  it("shows an amber notice when the email is already taken", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.setEmail).mockRejectedValue(new api.EmailTakenError("Уже занято"))
    const user = userEvent.setup()
    render(<StudentOnboarding />)
    await screen.findByText("Добавь email")

    await user.type(screen.getByPlaceholderText("you@example.com"), "taken@example.com")
    await user.click(screen.getByRole("button", { name: "Отправить письмо для подтверждения" }))

    expect(await screen.findByText(/Эта почта уже зарегистрирована/)).toBeInTheDocument()
  })

  it("manually re-checking verification advances to the form once verified", async () => {
    vi.mocked(api.fetchMe)
      .mockResolvedValueOnce(makeUser({ email: "student@example.com" }))
      .mockResolvedValueOnce(makeUser({ email: "student@example.com", email_verified: true }))
    const user = userEvent.setup()
    render(<StudentOnboarding />)
    await screen.findByText("Проверь почту")

    await user.click(screen.getByRole("button", { name: "Я подтвердил email" }))

    expect(await screen.findByText("О себе")).toBeInTheDocument()
  })

  it("shows an inline error when the manual check finds it still unverified", async () => {
    vi.mocked(api.fetchMe)
      .mockResolvedValueOnce(makeUser({ email: "student@example.com" }))
      .mockResolvedValueOnce(makeUser({ email: "student@example.com", email_verified: false }))
    const user = userEvent.setup()
    render(<StudentOnboarding />)
    await screen.findByText("Проверь почту")

    await user.click(screen.getByRole("button", { name: "Я подтвердил email" }))

    expect(await screen.findByText(/Email пока не подтверждён/)).toBeInTheDocument()
  })

  it("disables Готово until the required fields are filled, and shows the missing-fields hint", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ email: "student@example.com", email_verified: true }))
    const user = userEvent.setup()
    render(<StudentOnboarding />)
    await screen.findByText("О себе")

    await user.click(screen.getByRole("button", { name: "Готово →" }))

    expect(await screen.findByText("Ещё не всё заполнено:")).toBeInTheDocument()
    expect(api.authFetch).not.toHaveBeenCalled()
  })

  it("submits the completed profile and redirects to the student dashboard", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ email: "student@example.com", email_verified: true }))
    vi.mocked(api.authFetch).mockResolvedValue(jsonResponse(makeProfile()))
    const user = userEvent.setup()
    render(<StudentOnboarding />)
    await screen.findByText("О себе")

    await user.type(screen.getByPlaceholderText("Айгерим Бекова"), "Aigerim Bekova")
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    await user.type(dateInput, "2008-05-01")
    await user.selectOptions(screen.getByRole("combobox"), "11 класс")
    await user.type(screen.getByPlaceholderText("Алматы"), "Алматы")
    await user.type(screen.getByPlaceholderText("2026"), "2026")

    await user.click(screen.getByRole("button", { name: "Готово →" }))

    await vi.waitFor(() => {
      const patchCall = vi.mocked(api.authFetch).mock.calls.find(([, init]) => init?.method === "PATCH")
      expect(patchCall).toBeDefined()
      const body = JSON.parse(String(patchCall?.[1]?.body))
      expect(body).toMatchObject({ full_name: "Aigerim Bekova", city: "Алматы" })
    })
    expect(push).toHaveBeenCalledWith("/student/dashboard")
  })

  it("shows an error and stays on the form when saving fails", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ email: "student@example.com", email_verified: true }))
    // A network-level failure (not a 400 with a field-keyed body) — the
    // message isn't JSON, so it falls through to the generic banner
    // instead of being parsed as a field-errors dict.
    vi.mocked(api.authFetch).mockRejectedValue(new Error("Ошибка сервера"))
    const user = userEvent.setup()
    render(<StudentOnboarding />)
    await screen.findByText("О себе")

    await user.type(screen.getByPlaceholderText("Айгерим Бекова"), "Aigerim Bekova")
    const dateInput2 = document.querySelector('input[type="date"]') as HTMLInputElement
    await user.type(dateInput2, "2008-05-01")
    await user.selectOptions(screen.getByRole("combobox"), "11 класс")
    await user.type(screen.getByPlaceholderText("Алматы"), "Алматы")
    await user.type(screen.getByPlaceholderText("2026"), "2026")
    await user.click(screen.getByRole("button", { name: "Готово →" }))

    expect(await screen.findByText("Ошибка сервера")).toBeInTheDocument()
    expect(push).not.toHaveBeenCalledWith("/student/dashboard")
  })

  it("shows a field-level error returned by the backend under the offending field", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ email: "student@example.com", email_verified: true }))
    vi.mocked(api.authFetch).mockResolvedValue(
      jsonResponse({ city: ["Город обязателен"] }, false),
    )
    const user = userEvent.setup()
    render(<StudentOnboarding />)
    await screen.findByText("О себе")

    await user.type(screen.getByPlaceholderText("Айгерим Бекова"), "Aigerim Bekova")
    const dateInput3 = document.querySelector('input[type="date"]') as HTMLInputElement
    await user.type(dateInput3, "2008-05-01")
    await user.selectOptions(screen.getByRole("combobox"), "11 класс")
    await user.type(screen.getByPlaceholderText("Алматы"), "Алматы")
    await user.type(screen.getByPlaceholderText("2026"), "2026")
    await user.click(screen.getByRole("button", { name: "Готово →" }))

    expect(await screen.findByText("Город обязателен")).toBeInTheDocument()
    expect(screen.getByText("Исправь поля, отмеченные красным")).toBeInTheDocument()
  })

  it("translates a known backend validation message instead of showing raw text", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ email: "student@example.com", email_verified: true }))
    vi.mocked(api.authFetch).mockResolvedValue(
      jsonResponse(
        { school_graduation_year: ["Ensure this value is greater than or equal to 1990."] },
        false,
      ),
    )
    const user = userEvent.setup()
    render(<StudentOnboarding />)
    await screen.findByText("О себе")

    await user.type(screen.getByPlaceholderText("Айгерим Бекова"), "Aigerim Bekova")
    const dateInput4 = document.querySelector('input[type="date"]') as HTMLInputElement
    await user.type(dateInput4, "2008-05-01")
    await user.selectOptions(screen.getByRole("combobox"), "11 класс")
    await user.type(screen.getByPlaceholderText("Алматы"), "Алматы")
    await user.type(screen.getByPlaceholderText("2026"), "2026")
    await user.click(screen.getByRole("button", { name: "Готово →" }))

    expect(await screen.findByText("Год должен быть не раньше 1990.")).toBeInTheDocument()
    expect(
      screen.queryByText("Ensure this value is greater than or equal to 1990."),
    ).not.toBeInTheDocument()
  })
})
