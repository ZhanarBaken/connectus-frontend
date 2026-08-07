import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import LandingMentors from "./LandingMentors"
import { track } from "@/lib/analytics"
import type { MentorCard } from "@/types"

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}))

function makeMentor(id: number, overrides: Partial<MentorCard> = {}): MentorCard {
  return {
    id,
    profile_photo: null,
    full_name: `Mentor ${id}`,
    countries: [{ country: "US" }],
    languages: [],
    school_or_university: "MIT",
    grant_or_scholarship: "",
    major: "CS",
    expertise_areas: [{ area: "admission" }],
    detailed_bio: "Bio",
    is_accepting_bookings: true,
    is_universal: false,
    rating_avg: 4.9,
    rating_count: 10,
    ...overrides,
  }
}

describe("LandingMentors", () => {
  it("renders the section heading and 'all mentors' link", () => {
    render(<LandingMentors mentors={[makeMentor(1)]} />)
    expect(screen.getByText("менторы")).toBeInTheDocument()
    const links = screen.getAllByRole("link", { name: /Все менторы|Смотреть всех менторов/ })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/mentors")
    }
  })

  it("renders up to the last fifteen mentors", () => {
    const mentors = Array.from({ length: 20 }, (_, i) => makeMentor(i + 1))
    render(<LandingMentors mentors={mentors} />)
    // Last 15 of 20 => ids 6..20.
    expect(screen.getByText("Mentor 6")).toBeInTheDocument()
    expect(screen.getByText("Mentor 20")).toBeInTheDocument()
    expect(screen.queryByText("Mentor 5")).not.toBeInTheDocument()
  })

  it("renders every mentor when there are fewer than fifteen", () => {
    const mentors = [makeMentor(1), makeMentor(2), makeMentor(3)]
    render(<LandingMentors mentors={mentors} />)
    expect(screen.getByText("Mentor 1")).toBeInTheDocument()
    expect(screen.getByText("Mentor 2")).toBeInTheDocument()
    expect(screen.getByText("Mentor 3")).toBeInTheDocument()
  })

  it("shows 'Принимает записи' for mentors accepting bookings and 'Не принимает записи' otherwise", () => {
    render(
      <LandingMentors
        mentors={[
          makeMentor(1, { is_accepting_bookings: true }),
          makeMentor(2, { is_accepting_bookings: false }),
        ]}
      />,
    )
    expect(screen.getByText("Принимает записи")).toBeInTheDocument()
    expect(screen.getByText("Не принимает записи")).toBeInTheDocument()
  })

  it("shows the mentor's initial when there is no profile photo", () => {
    render(<LandingMentors mentors={[makeMentor(1, { full_name: "Aida" })]} />)
    expect(screen.getByText("A")).toBeInTheDocument()
  })

  it("tracks a mentor_card_clicked analytics event when a card is clicked", () => {
    render(<LandingMentors mentors={[makeMentor(7, { full_name: "Zarina" })]} />)
    fireEvent.click(screen.getByRole("link", { name: /Zarina/ }))
    expect(track).toHaveBeenCalledWith("mentor_card_clicked", { mentor_profile_id: 7 })
  })

  it("links each card to the mentor's profile", () => {
    render(<LandingMentors mentors={[makeMentor(9, { full_name: "Zarina" })]} />)
    expect(screen.getByRole("link", { name: /Zarina/ })).toHaveAttribute("href", "/mentors/9")
  })
})
