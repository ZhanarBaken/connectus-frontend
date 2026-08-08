import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { useRouter } from "@/i18n/navigation"
import MentorProfilePage from "./page"
import { fetchMentorProfile, fetchMentorServices, fetchMe, authFetch } from "@/lib/api"
import type { MentorProfile } from "@/types"

vi.mock("@/lib/api")

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

// jsdom doesn't implement Element.scrollIntoView — the field-error path
// calls it to bring the first invalid field into view after a failed
// save, which would otherwise throw and abort the state update mid-catch.
Element.prototype.scrollIntoView = vi.fn()

function makeMentorProfile(overrides: Partial<MentorProfile> = {}): MentorProfile {
  return {
    id: 1,
    full_name: "Данияр Сериков",
    age: 25,
    countries: [{ country: "US" }],
    languages: [],
    school_or_university: "MIT",
    major: "CS",
    grant_or_scholarship: "Болашак",
    gpa: "3.9",
    exam_results: "IELTS 8.0",
    detailed_bio: "Учусь в MIT, помогаю поступить в топ вузы США.",
    linkedin_url: "",
    university_email: "",
    profile_photo: null,
    expertise_areas: [{ area: "admission" }],
    contacts: "",
    phone: "+7 777 000 00 00",
    payout_details: "",
    graduation_year_or_current_course: "",
    is_approved: false,
    is_submitted: false,
    is_public: false,
    is_accepting_bookings: true,
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

function jsonResponse(data: unknown, ok = true): Response {
  return { ok, json: async () => data } as Response
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  // MentorDocumentsUploader (embedded in this page) issues its own GET
  // on mount via authFetch — default to an empty document list so it
  // doesn't error out before each test configures anything specific.
  vi.mocked(authFetch).mockResolvedValue(jsonResponse([]))
  // Fetched alongside the profile purely to feed the completion-percent
  // calculation (services/email/telegram) — default to "nothing yet" so
  // tests that don't care about the percent aren't forced to mock these.
  vi.mocked(fetchMentorServices).mockResolvedValue([])
  vi.mocked(fetchMe).mockResolvedValue({
    id: 1, email: "mentor@example.com", role: "mentor", email_verified: false,
    has_telegram: false, telegram_username: null, has_google: false,
    google_email_at_signup: null, has_password: true, created_at: "2026-01-01T00:00:00Z",
  })
})

describe("MentorProfilePage — loading and prefill", () => {
  it("prefills the form from fetchMentorProfile", async () => {
    vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())

    render(<MentorProfilePage />)

    expect(await screen.findByDisplayValue("Данияр Сериков")).toBeInTheDocument()
    expect(screen.getByDisplayValue("MIT")).toBeInTheDocument()
    expect(screen.getByDisplayValue("IELTS 8.0")).toBeInTheDocument()
  })

  it("shows an error state when the profile fails to load", async () => {
    vi.mocked(fetchMentorProfile).mockRejectedValue(new Error("network error"))

    render(<MentorProfilePage />)

    expect(await screen.findByText("Не удалось загрузить профиль")).toBeInTheDocument()
  })

  it("redirects a not-yet-submitted mentor to the onboarding wizard (useMentorOnboardingGate)", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      makeMentorProfile({ is_submitted: false, is_approved: false }),
    )

    render(<MentorProfilePage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/mentor"))
  })

  it("does not show 100% just because every text field is filled — services/email/telegram/documents/languages still count", async () => {
    // Regression: the completion % used to only cover a subset of
    // fields (not gpa/exam_results/phone/languages/documents/services/
    // email/telegram), so a mentor could see 100% here and still get
    // rejected by the backend's real submission gate.
    vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
    // Defaults from beforeEach already have no services, no verified
    // email/telegram, and authFetch resolves an empty document list —
    // so languages=[] (also unfilled on makeMentorProfile) is the only
    // other gap, but that alone is enough to prove it's not 100%.

    render(<MentorProfilePage />)

    const percent = await screen.findByText(/%$/)
    expect(percent.textContent).not.toBe("100%")
  })

  it("reaches 100% once every field, an active service, and a verified email+Telegram are all present", async () => {
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      makeMentorProfile({
        profile_photo: "https://cdn.example.com/avatar.jpg",
        languages: [{ language: "ru" }],
        has_documents: true,
        linkedin_url: "https://linkedin.com/in/daniyar",
        payout_details: "Kaspi: +7 777 000 00 00",
      }),
    )
    vi.mocked(fetchMentorServices).mockResolvedValue([
      {
        id: 1, title: "Первичная консультация", description: "", price: "5000.00", client_price: "6250.00", currency: "KZT",
        duration_minutes: 30, payout_category: "paid_consultation", grade_min: null, grade_max: null,
        meetings_min: null, meetings_max: null, duration_months_min: null, duration_months_max: null,
        is_price_negotiable: false, intro_call_enabled: false, is_active: true,
      },
    ])
    vi.mocked(fetchMe).mockResolvedValue({
      id: 1, email: "mentor@example.com", role: "mentor", email_verified: true,
      has_telegram: true, telegram_username: "mentoruser", has_google: false,
      google_email_at_signup: null, has_password: true, created_at: "2026-01-01T00:00:00Z",
    })
    vi.mocked(authFetch).mockResolvedValue(
      jsonResponse([
        {
          id: 1, kind: "diploma", original_filename: "diploma.pdf", content_type: "application/pdf",
          size_bytes: 1024, status: "pending", review_note: "", uploaded_at: "2026-01-01T00:00:00Z",
          download_url: "https://cdn.example.com/diploma.pdf",
        },
        {
          id: 2, kind: "enrollment_certificate", original_filename: "enroll.pdf", content_type: "application/pdf",
          size_bytes: 2048, status: "pending", review_note: "", uploaded_at: "2026-01-01T00:00:00Z",
          download_url: "https://cdn.example.com/enroll.pdf",
        },
      ]),
    )

    render(<MentorProfilePage />)

    expect(await screen.findByText("100%")).toBeInTheDocument()
  })

  it("does not count documents as done with only one of the two required kinds", async () => {
    // Regression: the backend requires a diploma AND an enrollment
    // certificate specifically (apps.mentors.models.MentorProfile
    // .submission_errors) — a single document of only one kind (or the
    // wrong kind entirely) must not read as "documents done".
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      makeMentorProfile({
        profile_photo: "https://cdn.example.com/avatar.jpg",
        languages: [{ language: "ru" }],
        has_documents: true,
      }),
    )
    vi.mocked(fetchMentorServices).mockResolvedValue([
      {
        id: 1, title: "Первичная консультация", description: "", price: "5000.00", client_price: "6250.00", currency: "KZT",
        duration_minutes: 30, payout_category: "paid_consultation", grade_min: null, grade_max: null,
        meetings_min: null, meetings_max: null, duration_months_min: null, duration_months_max: null,
        is_price_negotiable: false, intro_call_enabled: false, is_active: true,
      },
    ])
    vi.mocked(fetchMe).mockResolvedValue({
      id: 1, email: "mentor@example.com", role: "mentor", email_verified: true,
      has_telegram: true, telegram_username: "mentoruser", has_google: false,
      google_email_at_signup: null, has_password: true, created_at: "2026-01-01T00:00:00Z",
    })
    vi.mocked(authFetch).mockResolvedValue(
      jsonResponse([{
        id: 1, kind: "diploma", original_filename: "diploma.pdf", content_type: "application/pdf",
        size_bytes: 1024, status: "pending", review_note: "", uploaded_at: "2026-01-01T00:00:00Z",
        download_url: "https://cdn.example.com/diploma.pdf",
      }]),
    )

    render(<MentorProfilePage />)

    const percent = await screen.findByText(/%$/)
    expect(percent.textContent).not.toBe("100%")
  })
})

describe("MentorProfilePage — editing", () => {
  beforeEach(() => {
    vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
  })

  it("toggles a popular country chip", async () => {
    render(<MentorProfilePage />)

    const usChip = await screen.findByRole("button", { name: /США/ })
    expect(usChip.textContent).toContain("✓")

    fireEvent.click(usChip)
    expect(usChip.textContent).not.toContain("✓")
  })

  it("prefills selected languages and lets the mentor toggle more", async () => {
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      makeMentorProfile({ languages: [{ language: "ru" }] }),
    )
    render(<MentorProfilePage />)

    const ruChip = await screen.findByRole("button", { name: /Русский/ })
    expect(ruChip.textContent).toContain("✓")

    const enChip = screen.getByRole("button", { name: /English/ })
    expect(enChip.textContent).not.toContain("✓")
    fireEvent.click(enChip)
    expect(enChip.textContent).toContain("✓")
  })

  it("includes selected languages in the save payload", async () => {
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      makeMentorProfile({ languages: [{ language: "ru" }] }),
    )
    // handleSubmit now PATCHes directly via authFetch (not updateMentorProfile)
    // so it can see the full field-keyed error dict on failure — the mount-time
    // documents GET (empty list) still needs its own response.
    vi.mocked(authFetch).mockImplementation(async (_url, init) => {
      if (init?.method === "PATCH") return jsonResponse(makeMentorProfile())
      return jsonResponse([])
    })
    render(<MentorProfilePage />)

    const enChip = await screen.findByRole("button", { name: /English/ })
    fireEvent.click(enChip)
    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }))

    await waitFor(() => expect(authFetch).toHaveBeenCalledWith(
      expect.stringContaining("/mentors/profile/me/"),
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"ru"'),
      }),
    ))
    const patchCall = vi.mocked(authFetch).mock.calls.find(([, init]) => init?.method === "PATCH")
    const body = JSON.parse(String(patchCall?.[1]?.body))
    expect(body.languages).toEqual(expect.arrayContaining([{ language: "ru" }, { language: "en" }]))
  })

  it("saves successfully and shows the confirmation banner", async () => {
    vi.mocked(authFetch).mockImplementation(async (_url, init) => {
      if (init?.method === "PATCH") return jsonResponse(makeMentorProfile())
      return jsonResponse([])
    })

    render(<MentorProfilePage />)

    const nameInput = await screen.findByDisplayValue("Данияр Сериков")
    fireEvent.change(nameInput, { target: { value: "Данияр С." } })
    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }))

    await waitFor(() => {
      const patchCall = vi.mocked(authFetch).mock.calls.find(([, init]) => init?.method === "PATCH")
      expect(patchCall).toBeDefined()
      const body = JSON.parse(String(patchCall?.[1]?.body))
      expect(body.full_name).toBe("Данияр С.")
    })
    expect(await screen.findByText("✓ Профиль сохранён! Перенаправляем...")).toBeInTheDocument()
  })

  it("shows field-level errors returned by the backend", async () => {
    vi.mocked(authFetch).mockImplementation(async (_url, init) => {
      if (init?.method === "PATCH") return jsonResponse({ full_name: ["Слишком короткое имя"] }, false)
      return jsonResponse([])
    })

    render(<MentorProfilePage />)

    await screen.findByDisplayValue("Данияр Сериков")
    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }))

    expect(await screen.findByText("Слишком короткое имя")).toBeInTheDocument()
    expect(screen.getByText("Исправь поля, отмеченные красным")).toBeInTheDocument()
  })

  it("translates a known backend validation message instead of showing raw text", async () => {
    // Regression: updateMentorProfile used to collapse the backend's
    // field-keyed error dict into a single flattened string, so the raw,
    // untranslated, harshly-worded backend message ("Похоже на ерунду...")
    // showed up in a generic bottom banner instead of under the phone field.
    vi.mocked(authFetch).mockImplementation(async (_url, init) => {
      if (init?.method === "PATCH") {
        return jsonResponse({
          phone: ["Похоже на ерунду — введи номер цифрами, можно с +, пробелами и скобками."],
        }, false)
      }
      return jsonResponse([])
    })

    render(<MentorProfilePage />)

    await screen.findByDisplayValue("Данияр Сериков")
    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }))

    expect(
      await screen.findByText("Введи номер телефона цифрами — можно с +, пробелами и скобками."),
    ).toBeInTheDocument()
    expect(
      screen.queryByText("Похоже на ерунду — введи номер цифрами, можно с +, пробелами и скобками."),
    ).not.toBeInTheDocument()
  })

  it("highlights the LinkedIn field on an invalid-URL error, translated", async () => {
    // Regression: the LinkedIn <Field>/<input> weren't wired to
    // fieldErrors at all — a 400 on linkedin_url set the generic
    // "fix the fields marked in red" banner but never actually
    // highlighted (or showed a message under) the LinkedIn field.
    vi.mocked(authFetch).mockImplementation(async (_url, init) => {
      if (init?.method === "PATCH") {
        return jsonResponse({ linkedin_url: ["Enter a valid URL."] }, false)
      }
      return jsonResponse([])
    })

    render(<MentorProfilePage />)

    await screen.findByDisplayValue("Данияр Сериков")
    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }))

    expect(
      await screen.findByText("Введи корректную ссылку, например https://linkedin.com/in/имя."),
    ).toBeInTheDocument()
    expect(screen.getByText("Исправь поля, отмеченные красным")).toBeInTheDocument()
    expect(screen.queryByText("Enter a valid URL.")).not.toBeInTheDocument()
  })
})

describe("MentorProfilePage — banned mentor", () => {
  it("shows the ban banner and disables the form", async () => {
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      makeMentorProfile({ is_banned: true, ban_reason: "Нарушение правил платформы" }),
    )

    render(<MentorProfilePage />)

    expect(await screen.findByText("Аккаунт заблокирован")).toBeInTheDocument()
    expect(screen.getByText("Нарушение правил платформы")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Сохранить профиль" })).toBeDisabled()
  })
})
