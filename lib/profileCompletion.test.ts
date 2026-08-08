import { describe, it, expect } from "vitest"
import { calcProfileCompletion } from "./profileCompletion"
import type { MentorProfile } from "@/types"

const emptyExtras = { hasActiveService: false, emailVerified: false, hasTelegram: false }
const fullExtras = { hasActiveService: true, emailVerified: true, hasTelegram: true }

// Fully-empty profile — every one of the 18 checked fields is falsy.
function emptyProfile(): MentorProfile {
  return {
    id: 1,
    full_name: "",
    age: 20,
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
  }
}

// Fully-filled profile — all fields the model itself carries present,
// including the two optional ones (linkedin_url, payout_details); the
// remaining 3 (service/email/telegram) come from `fullExtras`.
function fullProfile(): MentorProfile {
  return {
    ...emptyProfile(),
    profile_photo: "https://example.com/photo.jpg",
    full_name: "Aigerim Bek",
    school_or_university: "MIT",
    countries: [{ country: "US" }],
    major: "Computer Science",
    detailed_bio: "Long bio text",
    grant_or_scholarship: "Fulbright",
    gpa: "3.9",
    exam_results: "IELTS 8.0",
    phone: "+7 777 000 00 00",
    expertise_areas: [{ area: "admission" }],
    languages: [{ language: "ru" }],
    has_documents: true,
    linkedin_url: "https://linkedin.com/in/aigerim",
    payout_details: "Kaspi: +7 777 000 00 00",
  }
}

describe("calcProfileCompletion", () => {
  it("returns 0 filled / 0% for a completely empty profile with no extras", () => {
    const result = calcProfileCompletion(emptyProfile(), emptyExtras)
    expect(result).toEqual({ filled: 0, total: 18, percent: 0 })
  })

  it("returns 18 filled / 100% for a fully-filled profile with all extras", () => {
    const result = calcProfileCompletion(fullProfile(), fullExtras)
    expect(result).toEqual({ filled: 18, total: 18, percent: 100 })
  })

  it("counts whitespace-only strings as not filled", () => {
    const profile = { ...emptyProfile(), full_name: "   ", major: "\t\n" }
    const result = calcProfileCompletion(profile, emptyExtras)
    expect(result.filled).toBe(0)
  })

  it("counts a single filled field correctly (1/18 -> 6%)", () => {
    const profile = { ...emptyProfile(), full_name: "Aigerim" }
    const result = calcProfileCompletion(profile, emptyExtras)
    expect(result.filled).toBe(1)
    expect(result.percent).toBe(6) // round(1/18 * 100) = 5.56 -> 6
  })

  it("treats countries/expertise_areas/languages presence via array length, not truthiness", () => {
    const withEmptyArrays = { ...fullProfile(), countries: [], expertise_areas: [], languages: [] }
    const result = calcProfileCompletion(withEmptyArrays, fullExtras)
    expect(result.filled).toBe(15)
  })

  it("rounds percent to nearest integer for partial completion (3/18 -> 17%)", () => {
    const profile = {
      ...emptyProfile(),
      profile_photo: "photo.jpg",
      full_name: "Name",
      school_or_university: "Uni",
    }
    const result = calcProfileCompletion(profile, emptyExtras)
    expect(result.filled).toBe(3)
    expect(result.percent).toBe(17) // round(3/18*100) = 16.67 -> 17
  })

  it("does not count a filled model without an active service/email/telegram as 100%", () => {
    // Regression: the profile-edit page used to show 100% off a subset
    // of fields even when the mentor hadn't verified email/Telegram or
    // added a service yet — the real submission gate needs all of it.
    const result = calcProfileCompletion(fullProfile(), emptyExtras)
    expect(result.percent).toBeLessThan(100)
  })

  it("counts the optional linkedin_url and payout_details fields too", () => {
    // The user explicitly asked for the percentage to reflect the whole
    // form, not just what the backend requires to submit — linkedin_url
    // and payout_details are optional for submission but still part of
    // "how much of the form is filled in".
    const withoutOptional = { ...fullProfile(), linkedin_url: "", payout_details: "" }
    const result = calcProfileCompletion(withoutOptional, fullExtras)
    expect(result.percent).toBeLessThan(100)
    expect(result.filled).toBe(16)
  })

  it("each of the three extras independently affects the count", () => {
    const base = calcProfileCompletion(fullProfile(), emptyExtras).filled
    expect(calcProfileCompletion(fullProfile(), { ...emptyExtras, hasActiveService: true }).filled).toBe(base + 1)
    expect(calcProfileCompletion(fullProfile(), { ...emptyExtras, emailVerified: true }).filled).toBe(base + 1)
    expect(calcProfileCompletion(fullProfile(), { ...emptyExtras, hasTelegram: true }).filled).toBe(base + 1)
  })
})
