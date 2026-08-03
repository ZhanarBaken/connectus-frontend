import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useRouter } from "@/i18n/navigation"
import MentorClientsPage from "./page"
import type { MentorProfile } from "@/types"

vi.mock("@/lib/api")
vi.mock("@/lib/chat")

import {
  authFetch, fetchMentorClients, fetchMentorProfile, markChatRead,
  type MentorClient, type MentorClients,
} from "@/lib/api"
import { connectChat, fetchChatMessages, startConversationWithClient } from "@/lib/chat"

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
    vi.mocked(markChatRead).mockResolvedValue(undefined)
    vi.mocked(fetchChatMessages).mockResolvedValue([])
    vi.mocked(connectChat).mockImplementation(() => ({ send: vi.fn(() => true), close: vi.fn() }))
  })

  afterEach(() => {
    window.Telegram = undefined
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

    it("navigates straight to the existing conversation when one is already known", async () => {
      const { push } = mockRouter()
      vi.mocked(fetchMentorClients).mockResolvedValue(
        makeClients({ active: [makeClient({ conversation_id: 77 })] }),
      )
      render(<MentorClientsPage />)

      fireEvent.click(await screen.findByRole("button", { name: "Написать в чат" }))

      expect(push).toHaveBeenCalledWith("/messages/77")
      expect(startConversationWithClient).not.toHaveBeenCalled()
    })

    it("starts a new conversation and navigates to it when none exists yet", async () => {
      const { push } = mockRouter()
      vi.mocked(fetchMentorClients).mockResolvedValue(
        makeClients({ active: [makeClient({ id: 9, conversation_id: null })] }),
      )
      vi.mocked(startConversationWithClient).mockResolvedValue({
        id: 88, mentor: 1, student: 9, created_at: "2026-01-01T00:00:00Z",
        closed_at: null, is_active: true, other_party_name: "Асель Смагулова", other_party_photo: null,
      })
      render(<MentorClientsPage />)

      fireEvent.click(await screen.findByRole("button", { name: "Написать в чат" }))

      await waitFor(() => expect(startConversationWithClient).toHaveBeenCalledWith(9))
      await waitFor(() => expect(push).toHaveBeenCalledWith("/messages/88"))
    })

    it("shows an error and re-enables the button when starting the conversation fails", async () => {
      const { push } = mockRouter()
      vi.mocked(fetchMentorClients).mockResolvedValue(
        makeClients({ active: [makeClient({ id: 9, conversation_id: null })] }),
      )
      vi.mocked(startConversationWithClient).mockRejectedValue(new Error("network error"))
      render(<MentorClientsPage />)

      const button = await screen.findByRole("button", { name: "Написать в чат" })
      fireEvent.click(button)

      expect(await screen.findByText("Не удалось открыть чат")).toBeInTheDocument()
      expect(push).not.toHaveBeenCalled()
      expect(button).not.toBeDisabled()
    })

    describe("inside the Telegram Mini App", () => {
      beforeEach(() => {
        window.Telegram = {
          WebApp: { initData: "raw-init-data", ready: vi.fn() } as unknown as TelegramWebApp,
        }
      })

      it("opens the fullscreen chat overlay instead of navigating, when a conversation already exists", async () => {
        const { push } = mockRouter()
        vi.mocked(fetchMentorClients).mockResolvedValue(
          makeClients({ active: [makeClient({ conversation_id: 77 })] }),
        )
        render(<MentorClientsPage />)

        fireEvent.click(await screen.findByRole("button", { name: "Написать в чат" }))

        expect(await screen.findByRole("heading", { name: "Асель Смагулова" })).toBeInTheDocument()
        expect(push).not.toHaveBeenCalled()
        expect(startConversationWithClient).not.toHaveBeenCalled()
      })

      it("starts a new conversation and opens the overlay when none exists yet", async () => {
        const { push } = mockRouter()
        vi.mocked(fetchMentorClients).mockResolvedValue(
          makeClients({ active: [makeClient({ id: 9, conversation_id: null })] }),
        )
        vi.mocked(startConversationWithClient).mockResolvedValue({
          id: 88, mentor: 1, student: 9, created_at: "2026-01-01T00:00:00Z",
          closed_at: null, is_active: true, other_party_name: "Асель Смагулова", other_party_photo: null,
        })
        render(<MentorClientsPage />)

        fireEvent.click(await screen.findByRole("button", { name: "Написать в чат" }))

        await waitFor(() => expect(startConversationWithClient).toHaveBeenCalledWith(9))
        expect(await screen.findByRole("heading", { name: "Асель Смагулова" })).toBeInTheDocument()
        expect(push).not.toHaveBeenCalled()
      })

      it("shows the client's name in the overlay header and closes it on back", async () => {
        vi.mocked(fetchMentorClients).mockResolvedValue(
          makeClients({ active: [makeClient({ conversation_id: 77, full_name: "Данияр Сериков" })] }),
        )
        render(<MentorClientsPage />)

        fireEvent.click(await screen.findByRole("button", { name: "Написать в чат" }))

        expect(await screen.findByRole("heading", { name: "Данияр Сериков" })).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Назад" }))

        await waitFor(() =>
          expect(screen.queryByRole("heading", { name: "Данияр Сериков" })).not.toBeInTheDocument(),
        )
      })

      it("shows the second client's chat after closing the first, not a stale mix of both", async () => {
        vi.mocked(fetchMentorClients).mockResolvedValue(
          makeClients({
            active: [
              makeClient({ id: 1, conversation_id: 77, full_name: "Данияр Сериков" }),
              makeClient({ id: 2, conversation_id: 78, full_name: "Аружан Есенова" }),
            ],
          }),
        )
        render(<MentorClientsPage />)

        const buttons = await screen.findAllByRole("button", { name: "Написать в чат" })
        fireEvent.click(buttons[0])
        expect(await screen.findByRole("heading", { name: "Данияр Сериков" })).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Назад" }))
        await waitFor(() =>
          expect(screen.queryByRole("heading", { name: "Данияр Сериков" })).not.toBeInTheDocument(),
        )

        const buttonsAgain = await screen.findAllByRole("button", { name: "Написать в чат" })
        fireEvent.click(buttonsAgain[1])
        expect(await screen.findByRole("heading", { name: "Аружан Есенова" })).toBeInTheDocument()
        expect(screen.queryByRole("heading", { name: "Данияр Сериков" })).not.toBeInTheDocument()
      })
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
