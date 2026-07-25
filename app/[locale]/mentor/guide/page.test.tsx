import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import MentorGuidePage from "./page"

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api")
  return {
    ...actual,
    fetchMentorProfile: vi.fn(),
  }
})

import { fetchMentorProfile } from "@/lib/api"

describe("MentorGuidePage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // No token → MentorStatusBanner's self-fetch effect bails out early
    // without calling the API, matching the component's own guard.
  })

  it("renders the page heading and all four guide sections", () => {
    render(<MentorGuidePage />)

    expect(screen.getByText("Памятка ментора")).toBeInTheDocument()
    expect(screen.getByText("Первичная консультация — настрой под себя")).toBeInTheDocument()
    expect(screen.getByText("Заполни расписание — без него студент не запишется")).toBeInTheDocument()
    expect(screen.getByText("Сколько ты получаешь и как")).toBeInTheDocument()
    expect(screen.getByText("Прочие услуги — твой следующий шаг продаж")).toBeInTheDocument()
  })

  it("renders the commission breakdown figures", () => {
    render(<MentorGuidePage />)

    expect(screen.getByText(/Первичная консультация → 50 %/)).toBeInTheDocument()
    expect(screen.getByText(/Прочие услуги → 75 %/)).toBeInTheDocument()
  })

  it("renders a CTA link for every section pointing at the right page", () => {
    render(<MentorGuidePage />)

    expect(screen.getByRole("link", { name: /Открыть «Мои услуги»/ })).toHaveAttribute(
      "href",
      "/mentors/services",
    )
    expect(screen.getByRole("link", { name: /Настроить расписание/ })).toHaveAttribute(
      "href",
      "/mentors/schedule",
    )
    expect(screen.getByRole("link", { name: /Заполнить реквизиты/ })).toHaveAttribute(
      "href",
      "/mentors/profile",
    )
    expect(screen.getByRole("link", { name: /Добавить услугу/ })).toHaveAttribute(
      "href",
      "/mentors/services",
    )
  })

  it("does not call the API when there's no access token", () => {
    render(<MentorGuidePage />)
    expect(fetchMentorProfile).not.toHaveBeenCalled()
  })
})
