import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import MentorProfilePage from "./page"
import { fetchMentorProfile, updateMentorProfile, authFetch } from "@/lib/api"
import type { MentorProfile } from "@/types"

vi.mock("@/lib/api")

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
  // MentorDocumentsUploader (embedded in this page) issues its own GET
  // on mount via authFetch — default to an empty document list so it
  // doesn't error out before each test configures anything specific.
  vi.mocked(authFetch).mockResolvedValue(jsonResponse([]))
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

  it("saves successfully and shows the confirmation banner", async () => {
    vi.mocked(updateMentorProfile).mockResolvedValue(makeMentorProfile())

    render(<MentorProfilePage />)

    const nameInput = await screen.findByDisplayValue("Данияр Сериков")
    fireEvent.change(nameInput, { target: { value: "Данияр С." } })
    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }))

    await waitFor(() => expect(updateMentorProfile).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: "Данияр С." }),
    ))
    expect(await screen.findByText("✓ Профиль сохранён! Перенаправляем...")).toBeInTheDocument()
  })

  it("shows field-level errors returned by the backend", async () => {
    vi.mocked(updateMentorProfile).mockRejectedValue(
      new Error(JSON.stringify({ full_name: ["Слишком короткое имя"] })),
    )

    render(<MentorProfilePage />)

    await screen.findByDisplayValue("Данияр Сериков")
    fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }))

    expect(await screen.findByText("Слишком короткое имя")).toBeInTheDocument()
    expect(screen.getByText("Исправь поля, отмеченные красным")).toBeInTheDocument()
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
