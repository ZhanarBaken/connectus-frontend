import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "@/i18n/navigation"
import MentorEarningsPage from "./page"
import type { MentorProfile } from "@/types"

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api")
  return {
    ...actual,
    fetchMentorEarnings: vi.fn(),
    fetchMentorProfile: vi.fn(),
  }
})

import { fetchMentorEarnings, fetchMentorProfile, type MentorEarnings } from "@/lib/api"

function makeMentorProfile(overrides: Partial<MentorProfile> = {}): MentorProfile {
  return {
    id: 1,
    full_name: "Айгерим Ержанова",
    age: 25,
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
    is_approved: true,
    is_submitted: true,
    is_public: true,
    is_accepting_bookings: true,
    is_universal: false,
    is_banned: false,
    ban_reason: "",
    has_documents: true,
    rating_avg: null,
    rating_count: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeEarnings(overrides: Partial<MentorEarnings> = {}): MentorEarnings {
  return {
    pending_amount: "0",
    earned_unpaid_amount: "0",
    earned_paid_amount: "0",
    payouts: [],
    ...overrides,
  }
}

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

describe("MentorEarningsPage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // MentorStatusBanner is rendered with no props on this page, so it
    // fetches the mentor profile itself — keep it quiet by resolving
    // as approved (banner renders nothing).
    vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
  })

  it("redirects to login when there is no access token", async () => {
    const { replace } = mockRouter()
    render(<MentorEarningsPage />)
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/auth/login?next=/mentor/earnings"),
    )
    expect(fetchMentorEarnings).not.toHaveBeenCalled()
  })

  describe("authenticated", () => {
    beforeEach(() => {
      localStorage.setItem("access_token", "fake-token")
      localStorage.setItem("role", "mentor")
      mockRouter()
    })

    it("shows an error state when the fetch fails", async () => {
      vi.mocked(fetchMentorEarnings).mockRejectedValue(new Error("Не удалось загрузить финансы"))
      render(<MentorEarningsPage />)
      expect(await screen.findByText("Не удалось загрузить финансы")).toBeInTheDocument()
    })

    it("formats zero earnings correctly instead of showing blank or NaN", async () => {
      vi.mocked(fetchMentorEarnings).mockResolvedValue(makeEarnings())
      render(<MentorEarningsPage />)

      const amounts = await screen.findAllByText("0 ₸")
      // pending, unpaid, and paid tiles all show "0 ₸" when nothing has
      // happened yet — this is exactly the kind of display bug that
      // would silently mislead a mentor about money owed if it broke.
      expect(amounts).toHaveLength(3)
      expect(screen.getByText("Выплат пока не было")).toBeInTheDocument()
    })

    it("renders the three KPI tiles with correctly formatted amounts", async () => {
      vi.mocked(fetchMentorEarnings).mockResolvedValue(
        makeEarnings({
          pending_amount: "125000",
          earned_unpaid_amount: "40000",
          earned_paid_amount: "980000",
        }),
      )
      render(<MentorEarningsPage />)

      expect(await screen.findByText(/125\s000 ₸/)).toBeInTheDocument()
      expect(screen.getByText(/40\s000 ₸/)).toBeInTheDocument()
      expect(screen.getByText(/980\s000 ₸/)).toBeInTheDocument()
    })

    it("renders payout history entries with method label, date and note", async () => {
      vi.mocked(fetchMentorEarnings).mockResolvedValue(
        makeEarnings({
          earned_paid_amount: "15000",
          payouts: [
            {
              id: 1,
              amount: "15000",
              paid_at: "2026-06-15T10:00:00Z",
              method: "kaspi",
              note: "Июньская выплата",
            },
          ],
        }),
      )
      render(<MentorEarningsPage />)

      expect(await screen.findByText(/\+15\s000 ₸/)).toBeInTheDocument()
      expect(screen.getByText("Kaspi")).toBeInTheDocument()
      expect(screen.getByText("Июньская выплата")).toBeInTheDocument()
      expect(screen.getByText(/15 июня 2026/)).toBeInTheDocument()
    })

    it("falls back to the raw method string for an unknown payout method", async () => {
      vi.mocked(fetchMentorEarnings).mockResolvedValue(
        makeEarnings({
          payouts: [
            {
              id: 2,
              amount: "1000",
              paid_at: "2026-01-01T00:00:00Z",
              // Cast to bypass the union type — defensively covers a
              // backend value the frontend enum hasn't caught up with.
              method: "crypto" as unknown as "other",
              note: "",
            },
          ],
        }),
      )
      render(<MentorEarningsPage />)

      expect(await screen.findByText("crypto")).toBeInTheDocument()
    })

    it("redirects a not-yet-submitted mentor to the onboarding wizard (useMentorOnboardingGate)", async () => {
      const { replace } = mockRouter()
      vi.mocked(fetchMentorProfile).mockResolvedValue(
        makeMentorProfile({ is_submitted: false, is_approved: false }),
      )
      vi.mocked(fetchMentorEarnings).mockResolvedValue(makeEarnings())

      render(<MentorEarningsPage />)

      await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/mentor"))
    })
  })
})
