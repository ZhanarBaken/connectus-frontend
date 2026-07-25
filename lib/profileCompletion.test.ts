import { describe, it, expect } from "vitest"
import { calcProfileCompletion } from "./profileCompletion"
import type { MentorProfile } from "@/types"

// Fully-empty profile — every one of the 8 checked fields is falsy.
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

// Fully-filled profile — all 8 checked fields present.
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
    expertise_areas: [{ area: "admission" }],
  }
}

describe("calcProfileCompletion", () => {
  it("returns 0 filled / 0% for a completely empty profile", () => {
    const result = calcProfileCompletion(emptyProfile())
    expect(result).toEqual({ filled: 0, total: 8, percent: 0 })
  })

  it("returns 8 filled / 100% for a fully-filled profile", () => {
    const result = calcProfileCompletion(fullProfile())
    expect(result).toEqual({ filled: 8, total: 8, percent: 100 })
  })

  it("counts whitespace-only strings as not filled", () => {
    const profile = { ...emptyProfile(), full_name: "   ", major: "\t\n" }
    const result = calcProfileCompletion(profile)
    expect(result.filled).toBe(0)
  })

  it("counts a single filled field correctly (1/8 -> 13%)", () => {
    const profile = { ...emptyProfile(), full_name: "Aigerim" }
    const result = calcProfileCompletion(profile)
    expect(result.filled).toBe(1)
    expect(result.percent).toBe(13) // round(1/8 * 100) = 12.5 -> 13
  })

  it("treats countries/expertise_areas presence via array length, not truthiness", () => {
    const withEmptyArrays = { ...fullProfile(), countries: [], expertise_areas: [] }
    const result = calcProfileCompletion(withEmptyArrays)
    expect(result.filled).toBe(6)
  })

  it("rounds percent to nearest integer for partial completion (3/8 -> 38%)", () => {
    const profile = {
      ...emptyProfile(),
      profile_photo: "photo.jpg",
      full_name: "Name",
      school_or_university: "Uni",
    }
    const result = calcProfileCompletion(profile)
    expect(result.filled).toBe(3)
    expect(result.percent).toBe(38) // round(3/8*100) = 37.5 -> 38
  })
})
