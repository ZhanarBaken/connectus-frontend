import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "@/i18n/navigation"
import MentorClientsPage from "./page"
import type { MentorProfile } from "@/types"

vi.mock("@/lib/api")

import { authFetch, fetchMentorClients, fetchMentorProfile, type MentorClient, type MentorClients } from "@/lib/api"

function okJson(body: unknown): Response {
  return { ok: true, json: async () => body } as Response
}

function makeClient(overrides: Partial<MentorClient> = {}): MentorClient {
  return {
    id: 1,
    full_name: "Асель Смагулова",
    current_school_or_university: "NIS",
    city: "Алматы",
    profile_photo: null,
    conversation_id: null,
    engagement_id: null,
    ...overrides,
  }
}

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

function makeClients(overrides: Partial<MentorClients> = {}): MentorClients {
  return {
    active: [],
    inactive: [],
    ...overrides,
  }
}

function mockRouter() {
  const replace = vi.fn()
  const push = vi.fn()
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as ReturnType<typeof useRouter>)
  return { replace, push }
}

describe("MentorClientsPage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
    vi.mocked(authFetch).mockResolvedValue(okJson({ id: 1, email: "mentor@test.com" }))
  })

  it("redirects to login when there is no access token", async () => {
    const { replace } = mockRouter()
    render(<MentorClientsPage />)
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/auth/login?next=/mentor/clients"),
    )
    expect(fetchMentorClients).not.toHaveBeenCalled()
  })

  describe("authenticated", () => {
    beforeEach(() => {
      localStorage.setItem("access_token", "fake-token")
      localStorage.setItem("role", "mentor")
      mockRouter()
    })

    it("shows an error state when the fetch fails", async () => {
      vi.mocked(fetchMentorClients).mockRejectedValue(new Error("Не удалось загрузить список клиентов"))
      render(<MentorClientsPage />)
      expect(await screen.findByText("Не удалось загрузить список клиентов")).toBeInTheDocument()
    })

    it("shows the empty state on the active tab by default", async () => {
      vi.mocked(fetchMentorClients).mockResolvedValue(makeClients())
      render(<MentorClientsPage />)
      expect(await screen.findByText("Нет активных клиентов")).toBeInTheDocument()
    })

    it("lists active clients with school and city", async () => {
      vi.mocked(fetchMentorClients).mockResolvedValue(
        makeClients({
          active: [makeClient()],
        }),
      )
      render(<MentorClientsPage />)
      expect(await screen.findByText("Асель Смагулова")).toBeInTheDocument()
      expect(screen.getByText("NIS · Алматы")).toBeInTheDocument()
    })

    it("switches to the inactive tab and shows its clients", async () => {
      vi.mocked(fetchMentorClients).mockResolvedValue(
        makeClients({
          inactive: [makeClient({ id: 2, full_name: "Даурен Ахметов", current_school_or_university: "", city: "" })],
        }),
      )
      render(<MentorClientsPage />)
      await screen.findByText("Нет активных клиентов")

      fireEvent.click(screen.getByText(/Неактивные/))
      expect(await screen.findByText("Даурен Ахметов")).toBeInTheDocument()
    })

    it("shows the tab counts", async () => {
      vi.mocked(fetchMentorClients).mockResolvedValue(
        makeClients({
          active: [
            makeClient({ id: 1, full_name: "A", current_school_or_university: "", city: "" }),
            makeClient({ id: 2, full_name: "B", current_school_or_university: "", city: "" }),
          ],
          inactive: [
            makeClient({ id: 3, full_name: "C", current_school_or_university: "", city: "" }),
          ],
        }),
      )
      render(<MentorClientsPage />)
      expect(await screen.findByText(/Активные · 2/)).toBeInTheDocument()
      expect(screen.getByText(/Неактивные · 1/)).toBeInTheDocument()
    })

    it("links each client row to their unified client window", async () => {
      vi.mocked(fetchMentorClients).mockResolvedValue(
        makeClients({ active: [makeClient({ id: 9 })] }),
      )
      render(<MentorClientsPage />)

      const link = await screen.findByText("Асель Смагулова")
      expect(link.closest("a")).toHaveAttribute("href", "/mentor/clients/9")
    })

    it("redirects a not-yet-submitted mentor to the onboarding wizard (useMentorOnboardingGate)", async () => {
      const { replace } = mockRouter()
      vi.mocked(fetchMentorProfile).mockResolvedValue(
        makeMentorProfile({ is_submitted: false, is_approved: false }),
      )
      vi.mocked(fetchMentorClients).mockResolvedValue(makeClients())

      render(<MentorClientsPage />)

      await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/mentor"))
    })
  })
})
