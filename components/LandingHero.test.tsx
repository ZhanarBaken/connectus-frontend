import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import LandingHero from "./LandingHero"
import type { MentorCard } from "@/types"

function makeMentor(overrides: Partial<MentorCard> = {}, id = 1): MentorCard {
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

function renderHero(mentors: MentorCard[]) {
  return render(<LandingHero mentors={mentors} />)
}

describe("LandingHero", () => {
  it("renders the headline", () => {
    renderHero([])
    expect(screen.getByText("Поступи в университет мечты")).toBeInTheDocument()
    expect(screen.getByText("с ментором")).toBeInTheDocument()
  })

  it("renders the primary CTAs", () => {
    renderHero([])
    expect(screen.getByRole("link", { name: /Найти ментора/ })).toHaveAttribute(
      "href",
      "/mentors",
    )
    expect(screen.getByRole("link", { name: /Хочу стать ментором/ })).toHaveAttribute(
      "href",
      "/become-mentor",
    )
  })

  it("renders no mentor preview cards when there are no mentors", () => {
    renderHero([])
    expect(screen.queryByText("MIT")).not.toBeInTheDocument()
  })

  it("shows up to the first three mentors as preview cards", () => {
    const mentors = [1, 2, 3, 4].map((id) => makeMentor({ full_name: `Mentor ${id}` }, id))
    renderHero(mentors)
    expect(screen.getByText("Mentor 1")).toBeInTheDocument()
    expect(screen.getByText("Mentor 2")).toBeInTheDocument()
    expect(screen.getByText("Mentor 3")).toBeInTheDocument()
    expect(screen.queryByText("Mentor 4")).not.toBeInTheDocument()
  })

  it("shows the mentor's first initial when there is no profile photo", () => {
    renderHero([makeMentor({ full_name: "Zarina", profile_photo: null })])
    expect(screen.getByText("Z")).toBeInTheDocument()
  })

  it("links each preview card to the mentor's profile", () => {
    renderHero([makeMentor({ id: 42, full_name: "Zarina" })])
    expect(screen.getByRole("link", { name: /Zarina/ })).toHaveAttribute("href", "/mentors/42")
  })
})
