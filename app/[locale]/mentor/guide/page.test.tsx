import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "@/i18n/navigation"
import MentorGuidePage from "./page"

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api")
  return {
    ...actual,
    fetchMentorProfile: vi.fn(),
  }
})

import { fetchMentorProfile } from "@/lib/api"
import type { MentorProfile } from "@/types"

function mockRouter() {
  const replace = vi.fn()
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as ReturnType<typeof useRouter>)
  return { replace }
}

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

  it("redirects a not-yet-submitted mentor to the onboarding wizard (useMentorOnboardingGate)", async () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      { is_submitted: false, is_approved: false } as MentorProfile,
    )

    render(<MentorGuidePage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/mentor"))
  })
})
