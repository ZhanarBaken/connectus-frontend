import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import LandingSections from "./LandingSections"
import type { MentorCard } from "@/types"

const categories = [
  { label: "США", code: "US", desc: "Ivy League и топ университеты" },
  { label: "Неизвестная страна", code: "ZZ", desc: "Собственное описание" },
]

function renderSections(mentors: MentorCard[] = []) {
  return render(<LandingSections categories={categories} mentors={mentors} />)
}

describe("LandingSections", () => {
  it("renders the 'how it works' steps", () => {
    renderSections()
    const section = within(document.getElementById("how-it-works") as HTMLElement)
    expect(section.getByText("Найди ментора")).toBeInTheDocument()
    expect(section.getByText("Консультация")).toBeInTheDocument()
    expect(section.getByText("Начни подготовку")).toBeInTheDocument()
  })

  it("renders a translated category using its dict entry", () => {
    renderSections()
    // "US" is in the dict as cat.us.label -> "США" / cat.us.desc.
    expect(screen.getByText("Ivy League и топ университеты")).toBeInTheDocument()
  })

  it("falls back to the raw category label/desc when no translation exists", () => {
    renderSections()
    expect(screen.getByText("Неизвестная страна")).toBeInTheDocument()
    expect(screen.getByText("Собственное описание")).toBeInTheDocument()
  })

  it("renders the trust section stats", () => {
    renderSections()
    expect(screen.getByText("Верифицированные менторы")).toBeInTheDocument()
    expect(screen.getByText("Реальный опыт")).toBeInTheDocument()
  })

  it("renders the become-a-mentor CTA section", () => {
    renderSections()
    expect(screen.getByRole("link", { name: /Узнать больше/ })).toHaveAttribute(
      "href",
      "/become-mentor",
    )
  })

  it("renders the FAQ list and lets a question expand", async () => {
    const user = userEvent.setup()
    renderSections()
    const question = screen.getByText("Кто такие менторы на Connectus?")
    expect(question).toBeInTheDocument()
    const button = question.closest("button") as HTMLButtonElement
    expect(button).toHaveAttribute("aria-expanded", "false")
    await user.click(button)
    expect(button).toHaveAttribute("aria-expanded", "true")
  })

  it("renders the footer with support contacts and legal links", () => {
    renderSections()
    expect(screen.getByText("connectus.platform@gmail.com")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Условия/ })).toHaveAttribute("href", "/terms")
    expect(screen.getByRole("link", { name: /Политика конфиденциальности/ })).toHaveAttribute(
      "href",
      "/privacy",
    )
  })

  it("renders the featured mentors section with a given mentor", () => {
    const mentor: MentorCard = {
      id: 1,
      profile_photo: null,
      full_name: "Zarina",
      countries: [{ country: "US" }],
      languages: [],
      school_or_university: "MIT",
      grant_or_scholarship: "",
      major: "CS",
      expertise_areas: [],
      detailed_bio: "Bio",
      is_accepting_bookings: true,
      is_universal: false,
      rating_avg: 4.9,
      rating_count: 10,
    }
    renderSections([mentor])
    expect(screen.getByText("Zarina")).toBeInTheDocument()
  })
})
