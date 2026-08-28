import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import * as api from "@/lib/api"
import { MentorCard } from "@/types"
import HomePage from "./page"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    fetchMentors: vi.fn(),
  }
})

// HomePage's own logic is the accepting-bookings filter and the
// category builder — LandingHero/LandingSections render the actual
// mentor cards and are tested independently. Mock them here so this
// file only exercises what app/page.tsx itself computes.
vi.mock("@/components/LandingHero", () => ({
  default: ({ mentors }: { mentors: MentorCard[] }) => (
    <div data-testid="landing-hero">{mentors.map((m) => m.full_name).join(",")}</div>
  ),
}))
vi.mock("@/components/LandingSections", () => ({
  default: ({ categories, mentors }: { categories: { code: string; label: string }[]; mentors: MentorCard[] }) => (
    <div data-testid="landing-sections">
      <span data-testid="categories">{categories.map((c) => c.code).join(",")}</span>
      <span data-testid="sections-mentors">{mentors.map((m) => m.full_name).join(",")}</span>
    </div>
  ),
}))

function makeMentor(overrides: Partial<MentorCard> = {}): MentorCard {
  return {
    id: 1,
    profile_photo: null,
    full_name: "Aigerim Bekova",
    countries: [{ country: "US" }],
    languages: [{ language: "ru" }],
    school_or_university: "MIT",
    grant_or_scholarship: "Болашак",
    major: "CS",
    expertise_areas: [{ area: "admission" }],
    detailed_bio: "",
    is_accepting_bookings: true,
    is_universal: false,
    rating_avg: null,
    rating_count: 0,
    ...overrides,
  }
}

describe("HomePage (landing)", () => {
  beforeEach(() => {
    vi.mocked(api.fetchMentors).mockReset()
    localStorage.clear()
  })

  it("renders without crashing when the backend is unreachable", async () => {
    vi.mocked(api.fetchMentors).mockRejectedValue(new Error("network error"))
    const ui = await HomePage()
    render(ui)
    expect(screen.getByTestId("landing-hero")).toBeInTheDocument()
    expect(screen.getByTestId("landing-hero").textContent).toBe("")
  })

  it("passes only accepting-bookings mentors to LandingHero and LandingSections", async () => {
    vi.mocked(api.fetchMentors).mockResolvedValue([
      makeMentor({ id: 1, full_name: "Open Mentor", is_accepting_bookings: true }),
      makeMentor({ id: 2, full_name: "Closed Mentor", is_accepting_bookings: false }),
    ])
    const ui = await HomePage()
    render(ui)

    expect(screen.getByTestId("landing-hero").textContent).toBe("Open Mentor")
    expect(screen.getByTestId("sections-mentors").textContent).toBe("Open Mentor")
  })

  it("builds the country category list from every public mentor, including ones not accepting bookings", async () => {
    vi.mocked(api.fetchMentors).mockResolvedValue([
      makeMentor({ id: 1, countries: [{ country: "US" }], is_accepting_bookings: true }),
      makeMentor({ id: 2, countries: [{ country: "DE" }], is_accepting_bookings: false }),
    ])
    const ui = await HomePage()
    render(ui)

    const codes = screen.getByTestId("categories").textContent?.split(",") ?? []
    expect(codes).toContain("US")
    expect(codes).toContain("DE")
  })

  it("orders known destination categories using the curated order, unknown ones alphabetically after", async () => {
    vi.mocked(api.fetchMentors).mockResolvedValue([
      makeMentor({ id: 1, countries: [{ country: "GB" }] }),
      makeMentor({ id: 2, countries: [{ country: "US" }] }),
      makeMentor({ id: 3, countries: [{ country: "ZZ" }] }),
    ])
    const ui = await HomePage()
    render(ui)

    const codes = screen.getByTestId("categories").textContent?.split(",") ?? []
    // US precedes GB in KNOWN_CATEGORY_ORDER; unknown codes sort after known ones.
    expect(codes.indexOf("US")).toBeLessThan(codes.indexOf("GB"))
    expect(codes.indexOf("GB")).toBeLessThan(codes.indexOf("ZZ"))
  })

  it("dedupes repeated country codes across mentors", async () => {
    vi.mocked(api.fetchMentors).mockResolvedValue([
      makeMentor({ id: 1, countries: [{ country: "US" }] }),
      makeMentor({ id: 2, countries: [{ country: "US" }] }),
    ])
    const ui = await HomePage()
    render(ui)

    const codes = screen.getByTestId("categories").textContent?.split(",") ?? []
    expect(codes.filter((c) => c === "US")).toHaveLength(1)
  })
})
