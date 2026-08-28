import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import MentorsPage from "./page"
import { fetchMentors } from "@/lib/api"
import { useRouter } from "@/i18n/navigation"
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

  it("shows a distinct load-error state (not the empty-catalog state) when fetchMentors throws", async () => {
    // Regression: fetchMentors().catch(() => []) made a down backend look
    // identical to "we genuinely have zero mentors."
    vi.mocked(fetchMentors).mockRejectedValue(new Error("backend unreachable"))

    const jsx = await MentorsPage()
    render(jsx)

    expect(await screen.findByText("Не удалось загрузить менторов")).toBeInTheDocument()
    expect(screen.queryByText("Менторов не найдено")).not.toBeInTheDocument()
  })

  it("redirects a logged-in mentor straight to their dashboard instead of the catalog", async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchMentors).mockResolvedValue([makeMentorCard()])

    const jsx = await MentorsPage()
    render(jsx)

    expect(replace).toHaveBeenCalledWith("/mentor/dashboard")
  })

  it("does not redirect a student browsing the catalog", async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    localStorage.setItem("role", "student")
    vi.mocked(fetchMentors).mockResolvedValue([makeMentorCard()])

    const jsx = await MentorsPage()
    render(jsx)

    expect(await screen.findByText("Данияр Сериков")).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })
})
