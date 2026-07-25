import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import MentorsPage from "./page"
import { fetchMentors } from "@/lib/api"
import type { MentorCard } from "@/types"

vi.mock("@/lib/api")

function makeMentorCard(overrides: Partial<MentorCard> = {}): MentorCard {
  return {
    id: 3,
    profile_photo: null,
    full_name: "Данияр Сериков",
    countries: [],
    languages: [],
    school_or_university: "MIT",
    grant_or_scholarship: "",
    major: "CS",
    expertise_areas: [],
    detailed_bio: "",
    is_accepting_bookings: true,
    is_universal: false,
    rating_avg: null,
    rating_count: 0,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  // MentorsList (the client component this page renders) redirects to
  // /auth/login unless a token is present — set one so we can assert on
  // the actual mentor list content rather than the redirect branch.
  localStorage.setItem("access_token", "fake-token")
})

describe("MentorsPage (server component)", () => {
  it("renders the mentor list returned by fetchMentors", async () => {
    vi.mocked(fetchMentors).mockResolvedValue([makeMentorCard()])

    const jsx = await MentorsPage()
    render(jsx)

    expect(await screen.findByText("Данияр Сериков")).toBeInTheDocument()
  })

  it("degrades gracefully to an empty list when fetchMentors throws", async () => {
    vi.mocked(fetchMentors).mockRejectedValue(new Error("backend unreachable"))

    const jsx = await MentorsPage()
    render(jsx)

    expect(await screen.findByText("Менторов не найдено")).toBeInTheDocument()
  })
})
