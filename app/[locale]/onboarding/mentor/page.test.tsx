import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "@/i18n/navigation"
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
    fetchMentorServices: vi.fn(),
    createMentorService: vi.fn(),
    updateMentorProfile: vi.fn(),
    submitMentorProfile: vi.fn(),
    fetchMyMentorSchedule: vi.fn(),
    saveMyMentorSchedule: vi.fn(),
  }
})

// jsdom doesn't implement Element.scrollIntoView — the field-error path
// calls it to bring the first invalid field into view after a failed
// submit, which would otherwise throw and abort the state update mid-catch.
Element.prototype.scrollIntoView = vi.fn()

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
    vi.mocked(api.fetchMentorServices).mockReset()
    vi.mocked(api.fetchMentorServices).mockResolvedValue([])
    vi.mocked(api.createMentorService).mockReset()
    vi.mocked(api.updateMentorProfile).mockReset()
    vi.mocked(api.updateMentorProfile).mockResolvedValue(makeProfile())
    vi.mocked(api.submitMentorProfile).mockReset()
    vi.mocked(api.fetchMyMentorSchedule).mockReset()
    vi.mocked(api.fetchMyMentorSchedule).mockResolvedValue({ timezone: "Asia/Almaty", weekly: [], blocks: [] })
    vi.mocked(api.saveMyMentorSchedule).mockReset()
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

  it("creates a quick service and lists it on the Services tab", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    vi.mocked(api.createMentorService).mockResolvedValue({
      id: 20, title: "Первичная консультация", description: "", price: "5000.00", currency: "KZT",
      duration_minutes: 30, payout_category: "paid_consultation", grade_min: null, grade_max: null,
      meetings_min: null, meetings_max: null, duration_months_min: null, duration_months_max: null,
      is_price_negotiable: false, intro_call_enabled: false, is_active: true,
    })
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await screen.findByRole("heading", { name: "Услуги" })

    const longDescription = "Разбираем твою ситуацию и составляем подробный план поступления в выбранный университет вместе."
    await user.type(screen.getByPlaceholderText("Первичная консультация"), "Первичная консультация")
    await user.type(screen.getByPlaceholderText(/Разбираем твою ситуацию/), longDescription)
    await user.type(screen.getByPlaceholderText("10000"), "5000")
    await user.click(screen.getByRole("button", { name: "+ Добавить услугу" }))

    expect(await screen.findByText("Первичная консультация")).toBeInTheDocument()
    expect(api.createMentorService).toHaveBeenCalledWith(
      expect.objectContaining({
        payout_category: "paid_consultation", title: "Первичная консультация",
        description: longDescription, price: "5000",
      }),
    )
  })

  it("creates a support-category service after switching the type toggle", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    vi.mocked(api.createMentorService).mockResolvedValue({
      id: 21, title: "Поступление в 3 вуза", description: "", price: "500000.00", currency: "KZT",
      duration_minutes: 60, payout_category: "support", grade_min: null, grade_max: null,
      meetings_min: 4, meetings_max: 8, duration_months_min: 6, duration_months_max: 12,
      is_price_negotiable: false, intro_call_enabled: true, is_active: true,
    })
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await screen.findByRole("heading", { name: "Услуги" })

    await user.click(screen.getByRole("button", { name: "Сопровождение" }))
    await user.type(screen.getByPlaceholderText("Поступление в 3 вуза"), "Поступление в 3 вуза")
    await user.type(screen.getByPlaceholderText("4"), "4")
    await user.type(screen.getByPlaceholderText("8"), "8")
    await user.type(screen.getByPlaceholderText("6"), "6")
    await user.type(screen.getByPlaceholderText("12"), "12")
    await user.type(screen.getByPlaceholderText("10000"), "500000")
    await user.click(screen.getByRole("button", { name: "+ Добавить услугу" }))

    expect(await screen.findByText("Поступление в 3 вуза")).toBeInTheDocument()
    expect(api.createMentorService).toHaveBeenCalledWith(
      expect.objectContaining({
        payout_category: "support",
        meetings_min: 4, meetings_max: 8,
        duration_months_min: 6, duration_months_max: 12,
        is_price_negotiable: false, price: "500000",
        intro_call_enabled: true,
      }),
    )
  })

  it("does not require price when the support service is marked price-negotiable", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    vi.mocked(api.createMentorService).mockResolvedValue({
      id: 22, title: "Поступление в 3 вуза", description: "", price: "0.00", currency: "KZT",
      duration_minutes: 60, payout_category: "support", grade_min: null, grade_max: null,
      meetings_min: 4, meetings_max: 8, duration_months_min: 6, duration_months_max: 12,
      is_price_negotiable: true, intro_call_enabled: true, is_active: true,
    })
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await screen.findByRole("heading", { name: "Услуги" })

    await user.click(screen.getByRole("button", { name: "Сопровождение" }))
    await user.type(screen.getByPlaceholderText("Поступление в 3 вуза"), "Поступление в 3 вуза")
    await user.type(screen.getByPlaceholderText("4"), "4")
    await user.type(screen.getByPlaceholderText("8"), "8")
    await user.type(screen.getByPlaceholderText("6"), "6")
    await user.type(screen.getByPlaceholderText("12"), "12")
    await user.click(screen.getByText("Цена договорная (обсуждается с каждым студентом отдельно)"))

    expect(screen.getByRole("button", { name: "+ Добавить услугу" })).not.toBeDisabled()
    await user.click(screen.getByRole("button", { name: "+ Добавить услугу" }))

    expect(api.createMentorService).toHaveBeenCalledWith(
      expect.objectContaining({ is_price_negotiable: true, price: "0.00" }),
    )
  })

  it("does not leak support-only fields into a consultation submit after switching category back", async () => {
    // Fills the support fields, switches back to Consultation without
    // submitting, then fills+submits a consultation service — the
    // payload must contain none of the support-only keys.
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    vi.mocked(api.createMentorService).mockResolvedValue({
      id: 23, title: "Первичная консультация", description: "", price: "5000.00", currency: "KZT",
      duration_minutes: 30, payout_category: "paid_consultation", grade_min: null, grade_max: null,
      meetings_min: null, meetings_max: null, duration_months_min: null, duration_months_max: null,
      is_price_negotiable: false, intro_call_enabled: false, is_active: true,
    })
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await screen.findByRole("heading", { name: "Услуги" })

    // Partially fill the Support tab first.
    await user.click(screen.getByRole("button", { name: "Сопровождение" }))
    await user.type(screen.getByPlaceholderText("4"), "4")
    await user.type(screen.getByPlaceholderText("8"), "8")

    // Switch back to Consultation without submitting, and fill+submit that instead.
    await user.click(screen.getByRole("button", { name: "Консультация" }))
    const longDescription = "Разбираем твою ситуацию и составляем подробный план поступления в выбранный университет вместе."
    await user.type(screen.getByPlaceholderText("Первичная консультация"), "Первичная консультация")
    await user.type(screen.getByPlaceholderText(/Разбираем твою ситуацию/), longDescription)
    await user.type(screen.getByPlaceholderText("10000"), "5000")
    await user.click(screen.getByRole("button", { name: "+ Добавить услугу" }))

    await screen.findByText("Первичная консультация")
    const [payload] = vi.mocked(api.createMentorService).mock.calls[0]
    expect(payload).toMatchObject({ payout_category: "paid_consultation" })
    expect(payload).not.toHaveProperty("meetings_min")
    expect(payload).not.toHaveProperty("meetings_max")
    expect(payload).not.toHaveProperty("is_price_negotiable")
  })

  it("keeps the add-service button disabled until the description reaches the minimum length", async () => {
    // Regression: paid_consultation requires a real description (backend
    // CONSULTATION_DESCRIPTION_MIN_LENGTH=80), not just non-blank — a
    // mentor could previously never satisfy this since the quick-add form
    // had no description field at all.
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await screen.findByRole("heading", { name: "Услуги" })

    await user.type(screen.getByPlaceholderText("Первичная консультация"), "Первичная консультация")
    await user.type(screen.getByPlaceholderText(/Разбираем твою ситуацию/), "Слишком коротко")
    await user.type(screen.getByPlaceholderText("10000"), "5000")

    expect(screen.getByRole("button", { name: "+ Добавить услугу" })).toBeDisabled()
    expect(api.createMentorService).not.toHaveBeenCalled()
  })

  it("shows an inline error and keeps the form filled when creating a service fails", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    vi.mocked(api.createMentorService).mockRejectedValue(new Error("Цена должна быть положительной."))
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await screen.findByRole("heading", { name: "Услуги" })

    const longDescription = "Разбираем твою ситуацию и составляем подробный план поступления в выбранный университет вместе."
    await user.type(screen.getByPlaceholderText("Первичная консультация"), "Первичная консультация")
    await user.type(screen.getByPlaceholderText(/Разбираем твою ситуацию/), longDescription)
    await user.type(screen.getByPlaceholderText("10000"), "5000")
    await user.click(screen.getByRole("button", { name: "+ Добавить услугу" }))

    expect(await screen.findByText("Цена должна быть положительной.")).toBeInTheDocument()
    // The form isn't cleared on failure — the mentor shouldn't have to
    // retype everything just to fix one field.
    expect(screen.getByDisplayValue("Первичная консультация")).toBeInTheDocument()
  })

  it("toggles a day on and saves a weekly schedule on the Schedule tab", async () => {
    vi.mocked(api.fetchMe).mockResolvedValue(makeUser())
    vi.mocked(api.fetchMentorProfile).mockResolvedValue(makeProfile())
    vi.mocked(api.saveMyMentorSchedule).mockResolvedValue({
      timezone: "Asia/Almaty",
      weekly: [{ weekday: 0, start_time: "10:00", end_time: "18:00" }],
      blocks: [],
    })
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await user.click(screen.getByRole("button", { name: "Вперёд →" }))
    await screen.findByRole("heading", { name: "Когда ты доступен?" })

    await user.click(screen.getByRole("button", { name: "Понедельник" }))
    await user.click(screen.getByRole("button", { name: "Сохранить расписание" }))

    await waitFor(() => expect(api.saveMyMentorSchedule).toHaveBeenCalledWith({
      weekly: [{ weekday: 0, start_time: "10:00", end_time: "18:00" }],
      blocks: [],
    }))
  })

  it("routes an availability submission error to the Schedule tab", async () => {
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
    vi.mocked(api.fetchMentorServices).mockResolvedValue([
      { id: 10, title: "Первичная консультация", description: "", price: "10000.00", currency: "KZT", duration_minutes: 60, payout_category: "paid_consultation", grade_min: null, grade_max: null, meetings_min: null, meetings_max: null, duration_months_min: null, duration_months_max: null, is_price_negotiable: false, intro_call_enabled: false, is_active: true },
    ])
    // Client-side tabDone already considers the schedule complete (a
    // window was saved above), so this simulates a race where the
    // backend still rejects — same pattern as the documents/services
    // race-condition tests above.
    vi.mocked(api.fetchMyMentorSchedule).mockResolvedValue({
      timezone: "Asia/Almaty",
      weekly: [{ weekday: 0, start_time: "10:00", end_time: "18:00" }],
      blocks: [],
    })
    vi.mocked(api.submitMentorProfile).mockRejectedValue(
      new Error(JSON.stringify({ availability: "At least one weekly availability window is required." })),
    )
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Отправить профиль на проверку →" }))

    expect(await screen.findByText("Исправь ошибки перед отправкой:")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Когда ты доступен?" })).toBeInTheDocument()
    // The raw backend message must never reach the screen — only the
    // translated copy.
    expect(screen.queryByText("At least one weekly availability window is required.")).not.toBeInTheDocument()
    expect(screen.getAllByText("Включи хотя бы один день в расписании и сохрани.").length).toBeGreaterThan(0)
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
    vi.mocked(api.fetchMentorServices).mockResolvedValue([
      { id: 10, title: "Первичная консультация", description: "", price: "10000.00", currency: "KZT", duration_minutes: 60, payout_category: "paid_consultation", grade_min: null, grade_max: null, meetings_min: null, meetings_max: null, duration_months_min: null, duration_months_max: null, is_price_negotiable: false, intro_call_enabled: false, is_active: true },
    ])
    vi.mocked(api.fetchMyMentorSchedule).mockResolvedValue({
      timezone: "Asia/Almaty",
      weekly: [{ weekday: 0, start_time: "10:00", end_time: "18:00" }],
      blocks: [],
    })
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
    vi.mocked(api.fetchMentorServices).mockResolvedValue([
      { id: 10, title: "Первичная консультация", description: "", price: "10000.00", currency: "KZT", duration_minutes: 60, payout_category: "paid_consultation", grade_min: null, grade_max: null, meetings_min: null, meetings_max: null, duration_months_min: null, duration_months_max: null, is_price_negotiable: false, intro_call_enabled: false, is_active: true },
    ])
    vi.mocked(api.fetchMyMentorSchedule).mockResolvedValue({
      timezone: "Asia/Almaty",
      weekly: [{ weekday: 0, start_time: "10:00", end_time: "18:00" }],
      blocks: [],
    })
    vi.mocked(api.submitMentorProfile).mockRejectedValue(
      new Error(JSON.stringify({ grant_or_scholarship: "Обязательное поле" })),
    )
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Отправить профиль на проверку →" }))

    expect(await screen.findByText("Исправь ошибки перед отправкой:")).toBeInTheDocument()
    // The raw backend message ("Обязательное поле", no period) must never
    // reach the screen — it's always swapped for the translated copy.
    expect(screen.queryByText("Обязательное поле")).not.toBeInTheDocument()
    expect(screen.getAllByText("Обязательное поле.").length).toBeGreaterThan(0)
    // The error is on an "education" field — the UI should have switched
    // from the default "about" tab to "education".
    expect(screen.getByRole("heading", { name: "Образование" })).toBeInTheDocument()
    const grantInput = screen.getByPlaceholderText("Болашак, Chevening...")
    expect(grantInput).toBeInTheDocument()
    expect(grantInput.className).toContain("border-red-300")
    expect(screen.getByPlaceholderText("MIT, UCL, TU Munich...")).toBeInTheDocument()
  })

  it("jumps to the Services tab when the backend rejects with a missing-active-service error", async () => {
    // Regression: a `services` submission error used to have nowhere to
    // route to at all — there was no Services tab in this wizard.
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
    vi.mocked(api.fetchMentorServices).mockResolvedValue([
      { id: 10, title: "Первичная консультация", description: "", price: "10000.00", currency: "KZT", duration_minutes: 60, payout_category: "paid_consultation", grade_min: null, grade_max: null, meetings_min: null, meetings_max: null, duration_months_min: null, duration_months_max: null, is_price_negotiable: false, intro_call_enabled: false, is_active: true },
    ])
    vi.mocked(api.fetchMyMentorSchedule).mockResolvedValue({
      timezone: "Asia/Almaty",
      weekly: [{ weekday: 0, start_time: "10:00", end_time: "18:00" }],
      blocks: [],
    })
    vi.mocked(api.submitMentorProfile).mockRejectedValue(
      new Error(JSON.stringify({ services: "At least one active service is required." })),
    )
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Отправить профиль на проверку →" }))

    expect(await screen.findByText("Исправь ошибки перед отправкой:")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Услуги" })).toBeInTheDocument()
    // The raw backend message must never reach the screen — only the
    // translated copy.
    expect(screen.queryByText("At least one active service is required.")).not.toBeInTheDocument()
    expect(screen.getAllByText("Добавь хотя бы одну активную услугу.").length).toBeGreaterThan(0)
  })

  it("scrolls to the shared documents field when only enrollment_document is rejected", async () => {
    // Regression: diploma_document and enrollment_document share one
    // upload widget (a single data-field="diploma_document" wrapper) —
    // an enrollment_document-only error must still resolve to that
    // shared element instead of silently finding nothing to scroll to.
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
    vi.mocked(api.fetchMentorServices).mockResolvedValue([
      { id: 10, title: "Первичная консультация", description: "", price: "10000.00", currency: "KZT", duration_minutes: 60, payout_category: "paid_consultation", grade_min: null, grade_max: null, meetings_min: null, meetings_max: null, duration_months_min: null, duration_months_max: null, is_price_negotiable: false, intro_call_enabled: false, is_active: true },
    ])
    vi.mocked(api.fetchMyMentorSchedule).mockResolvedValue({
      timezone: "Asia/Almaty",
      weekly: [{ weekday: 0, start_time: "10:00", end_time: "18:00" }],
      blocks: [],
    })
    // Client-side tabDone gating already considers documents complete
    // (both kinds uploaded above), so this simulates a race where the
    // backend still rejects — the exact scenario the field-error UX
    // needs to surface correctly.
    vi.mocked(api.submitMentorProfile).mockRejectedValue(
      new Error(JSON.stringify({ enrollment_document: "An enrollment certificate document is required." })),
    )
    const user = userEvent.setup()
    render(<MentorOnboarding />)

    await screen.findByRole("heading", { name: "О себе" })
    await user.click(screen.getByRole("button", { name: "Отправить профиль на проверку →" }))

    expect(await screen.findByText("Исправь ошибки перед отправкой:")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Экспертиза" })).toBeInTheDocument()
    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    })
    const target = document.querySelector('[data-field="diploma_document"]')
    expect(target).not.toBeNull()
    expect(vi.mocked(Element.prototype.scrollIntoView).mock.instances).toContain(target)
  })
})
