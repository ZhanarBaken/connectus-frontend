import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "next/navigation"
import * as api from "@/lib/api"
import { MentorProfile, User } from "@/types"
import MentorOnboarding from "./page"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    authFetch: vi.fn(),
    clearAuth: vi.fn(),
    fetchMe: vi.fn(),
    fetchMentorProfile: vi.fn(),
    updateMentorProfile: vi.fn(),
    submitMentorProfile: vi.fn(),
  }
})

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: "mentor@example.com",
    role: "mentor",
    email_verified: true,
    has_telegram: true,
    telegram_username: "mentoruser",
    has_google: false,
    google_email_at_signup: null,
    has_password: true,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeProfile(overrides: Partial<MentorProfile> = {}): MentorProfile {
  return {
    id: 1,
    full_name: "",
    age: 0,
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
    is_approved: false,
    is_submitted: false,
    is_public: false,
    is_accepting_bookings: false,
    is_universal: false,
    is_banned: false,
    ban_reason: "",
    has_documents: false,
    rating_avg: null,
    rating_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

const emptyDocsResponse = { ok: true, json: async () => [] } as Response

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response
}

describe("MentorOnboarding", () => {
  const push = vi.fn()
  const replace = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem("access_token", "tok")
    push.mockClear()
    replace.mockClear()
    vi.mocked(api.authFetch).mockReset()
    vi.mocked(api.authFetch).mockResolvedValue(emptyDocsResponse)
    vi.mocked(api.clearAuth).mockReset()
    vi.mocked(api.fetchMe).mockReset()
    vi.mocked(api.fetchMentorProfile).mockReset()
    vi.mocked(api.updateMentorProfile).mockReset()
    vi.mocked(api.updateMentorProfile).mockResolvedValue(makeProfile())
    vi.mocked(api.submitMentorProfile).mockReset()
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
    render(<MentorOnboarding />)
    expect(replace).toHaveBeenCalledWith("/auth/login")
  })

  it("redirects a student who lands here to their dashboard", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ role: "student" }))
    render(<MentorOnboarding />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/student/dashboard"))
  })

  it("redirects to the identity gate when email/telegram are incomplete", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser({ email_verified: false }))
    render(<MentorOnboarding />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/mentor/identity"))
  })

  it("redirects to the dashboard when the profile was already submitted", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile({ is_submitted: true }))
    render(<MentorOnboarding />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/mentor/dashboard"))
  })

  it("clears stale auth and redirects to login when fetchMe fails", async () => {
    vi.mocked(api.fetchMe).mockRejectedValue(new Error("401"))
    render(<MentorOnboarding />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"))
    expect(api.clearAuth).toHaveBeenCalled()
  })

  it("loads existing profile values into the About tab", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(
      makeProfile({ full_name: "Nazgul Akhmetova", detailed_bio: "Опытный ментор", phone: "+7 777 000 00 00" }),
    )
    render(<MentorOnboarding />)

    expect(await screen.findByDisplayValue("Nazgul Akhmetova")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Опытный ментор")).toBeInTheDocument()
    expect(screen.getByDisplayValue("+7 777 000 00 00")).toBeInTheDocument()
  })

  it("navigates forward and back between tabs", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    expect(screen.getByRole("heading", { name: "Образование" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    expect(screen.getByRole("heading", { name: "Экспертиза" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "← Назад" }))
    expect(screen.getByRole("heading", { name: "Образование" })).toBeInTheDocument()
  })

  it("auto-saves the About tab on blur and flashes a saved confirmation", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    const fullNameInput = await screen.findByPlaceholderText("Назгуль Ахметова")
    await user.type(fullNameInput, "Aigerim")
    await user.tab()

    expect(await screen.findByText("Сохранено ✓")).toBeInTheDocument()
    expect(api.updateMentorProfile).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: "Aigerim" }),
    )
  })

  it("shows a save error when auto-save fails", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    vi.mocked(api.updateMentorProfile).mockRejectedValue(new Error("Не удалось сохранить"))
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    const fullNameInput = await screen.findByPlaceholderText("Назгуль Ахметова")
    await user.type(fullNameInput, "Aigerim")
    await user.tab()

    expect(await screen.findByText("Не удалось сохранить")).toBeInTheDocument()
  })

  it("rejects a profile photo over 5MB with an inline error", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    const user = userEvent.setup()
    const { container } = render(<MentorOnboarding />)
    await screen.findByRole("heading", { name: "О себе" })

    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "avatar.jpg", { type: "image/jpeg" })
    const fileInput = container.querySelector('input[type="file"][accept^="image"]') as HTMLInputElement
    await user.upload(fileInput, bigFile)

    expect(await screen.findByText("Фото не должно превышать 5 МБ")).toBeInTheDocument()
  })

  it("uploads a verification document and lists it", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    vi.mocked(api.authFetch).mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse({ id: 1, kind: "diploma", original_filename: "diploma.pdf", size_bytes: 1024, status: "pending" })
      }
      return emptyDocsResponse
    })
    const user = userEvent.setup()
    const { container } = render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await screen.findByRole("heading", { name: "Экспертиза" })

    const docFile = new File(["content"], "diploma.pdf", { type: "application/pdf" })
    const docInput = container.querySelector('input[type="file"][accept^="application"]') as HTMLInputElement
    await user.upload(docInput, docFile)
    await user.click(screen.getByRole("button", { name: "Загрузить документ" }))

    expect(await screen.findByText("diploma.pdf")).toBeInTheDocument()
  })

  it("shows the early-submit hint listing missing sections when incomplete", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Отправить профиль на проверку →" }))

    expect(await screen.findByText("Ещё не всё заполнено:")).toBeInTheDocument()
    expect(api.submitMentorProfile).not.toHaveBeenCalled()
  })

  it("submits a fully completed profile and shows the review screen", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(
      makeProfile({
        profile_photo: "https://cdn.example.com/avatar.jpg",
        full_name: "Aigerim Bekova",
        detailed_bio: "Опытный ментор с 3 годами практики.",
        phone: "+7 777 000 00 00",
        languages: [{ language: "ru" }],
        countries: [{ country: "US" }],
        school_or_university: "MIT",
        major: "Computer Science",
        grant_or_scholarship: "Болашак",
        gpa: "3.8",
        exam_results: "IELTS 7.5",
        expertise_areas: [{ area: "admission" }],
      }),
    )
    vi.mocked(api.authFetch).mockResolvedValue(
      jsonResponse([
        { id: 1, kind: "diploma", original_filename: "diploma.pdf", size_bytes: 1024, status: "pending" },
        { id: 2, kind: "enrollment_certificate", original_filename: "enroll.pdf", size_bytes: 2048, status: "pending" },
      ]),
    )
    vi.mocked(api.submitMentorProfile).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Отправить профиль на проверку →" }))

    expect(await screen.findByText("Профиль отправлен на проверку")).toBeInTheDocument()
    expect(api.submitMentorProfile).toHaveBeenCalled()
  })

  it("shows field-level errors and jumps to the offending tab when submit is rejected", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(
      makeProfile({
        profile_photo: "https://cdn.example.com/avatar.jpg",
        full_name: "Aigerim Bekova",
        detailed_bio: "Опытный ментор с 3 годами практики.",
        phone: "+7 777 000 00 00",
        languages: [{ language: "ru" }],
        countries: [{ country: "US" }],
        school_or_university: "MIT",
        major: "Computer Science",
        grant_or_scholarship: "Болашак",
        gpa: "3.8",
        exam_results: "IELTS 7.5",
        expertise_areas: [{ area: "admission" }],
      }),
    )
    vi.mocked(api.authFetch).mockResolvedValue(
      jsonResponse([
        { id: 1, kind: "diploma", original_filename: "diploma.pdf", size_bytes: 1024, status: "pending" },
        { id: 2, kind: "enrollment_certificate", original_filename: "enroll.pdf", size_bytes: 2048, status: "pending" },
      ]),
    )
    vi.mocked(api.submitMentorProfile).mockRejectedValue(
      new Error(JSON.stringify({ grant_or_scholarship: "Обязательное поле" })),
    )
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Отправить профиль на проверку →" }))

    expect(await screen.findByText("Исправь ошибки перед отправкой:")).toBeInTheDocument()
    expect(screen.getByText("Обязательное поле")).toBeInTheDocument()
    // The error is on an "education" field — the UI should have switched
    // from the default "about" tab to "education".
    expect(screen.getByRole("heading", { name: "Образование" })).toBeInTheDocument()
    expect(screen.getByPlaceholderText("MIT, UCL, TU Munich...")).toBeInTheDocument()
  })
})
