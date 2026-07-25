import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import { track } from "@/lib/analytics"
import { TG_AUTH_EVENT } from "@/components/TelegramAutoLogin"
import MentorsList from "@/components/MentorsList"
import type { MentorCard } from "@/types"

vi.mock("@/lib/useTelegramWebApp")
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }))

function makeMentor(overrides: Partial<MentorCard> = {}): MentorCard {
  return {
    id: 1,
    profile_photo: null,
    full_name: "Aigerim Nurlanovna",
    countries: [{ country: "US" }],
    languages: [{ language: "ru" }],
    school_or_university: "Harvard University",
    grant_or_scholarship: "Fulbright",
    major: "Economics",
    expertise_areas: [{ area: "admission" }],
    detailed_bio: "Helps students apply to Ivy League schools.",
    is_accepting_bookings: true,
    is_universal: false,
    rating_avg: 4.8,
    rating_count: 12,
    ...overrides,
  }
}

const MENTORS: MentorCard[] = [
  makeMentor({
    id: 1,
    full_name: "Aigerim Nurlanovna",
    school_or_university: "Harvard University",
    detailed_bio: "Helps students apply to Ivy League schools.",
    countries: [{ country: "US" }],
    languages: [{ language: "ru" }],
    expertise_areas: [{ area: "admission" }],
    is_accepting_bookings: true,
    is_universal: false,
  }),
  makeMentor({
    id: 2,
    full_name: "Yerlan Bekov",
    school_or_university: "Oxford University",
    detailed_bio: "Visa and scholarship specialist for the UK.",
    countries: [{ country: "GB" }],
    languages: [{ language: "en" }],
    expertise_areas: [{ area: "visa" }, { area: "scholarships" }],
    is_accepting_bookings: false,
    is_universal: true,
  }),
  makeMentor({
    id: 3,
    full_name: "Dana Smagulova",
    school_or_university: "TU Munich",
    detailed_bio: "Document prep for German universities.",
    countries: [{ country: "DE" }],
    languages: [{ language: "de" }, { language: "ru" }],
    expertise_areas: [{ area: "documents" }],
    is_accepting_bookings: true,
    is_universal: false,
  }),
]

describe("MentorsList", () => {
  const push = vi.fn()
  const replace = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    push.mockClear()
    replace.mockClear()
    vi.mocked(track).mockClear()
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(useTelegramWebApp).mockReturnValue({
      webApp: null,
      isInTelegram: false,
      initData: "",
    })
  })

  describe("auth gating", () => {
    it("shows a loading spinner and redirects to login when there is no access token", async () => {
      const { container } = render(<MentorsList mentors={MENTORS} />)
      expect(container.querySelector(".animate-spin")).toBeInTheDocument()
      await waitFor(() => {
        expect(replace).toHaveBeenCalledWith("/auth/login?next=/mentors")
      })
      expect(screen.queryByText("Найти ментора")).not.toBeInTheDocument()
    })

    it("in a Telegram Mini App with no token, redirects home and dispatches the TG auth event instead of the login page", async () => {
      vi.mocked(useTelegramWebApp).mockReturnValue({
        webApp: null,
        isInTelegram: true,
        initData: "",
      })
      const dispatchSpy = vi.spyOn(window, "dispatchEvent")
      render(<MentorsList mentors={MENTORS} />)

      await waitFor(() => {
        expect(replace).toHaveBeenCalledWith("/")
      })
      expect(
        dispatchSpy.mock.calls.some((call) => (call[0] as Event).type === TG_AUTH_EVENT),
      ).toBe(true)
      expect(replace).not.toHaveBeenCalledWith("/auth/login?next=/mentors")
    })

    it("renders the list once an access token is present", async () => {
      localStorage.setItem("access_token", "tok")
      render(<MentorsList mentors={MENTORS} />)
      await waitFor(() => {
        expect(screen.getByText("Найти ментора")).toBeInTheDocument()
      })
      expect(replace).not.toHaveBeenCalled()
    })
  })

  describe("filtering (authenticated)", () => {
    beforeEach(() => {
      localStorage.setItem("access_token", "tok")
    })

    async function renderList() {
      render(<MentorsList mentors={MENTORS} />)
      await waitFor(() => screen.getByText("Найти ментора"))
    }

    it("shows all mentors and the total count with no filters applied", async () => {
      await renderList()
      expect(screen.getByText("Aigerim Nurlanovna")).toBeInTheDocument()
      expect(screen.getByText("Yerlan Bekov")).toBeInTheDocument()
      expect(screen.getByText("Dana Smagulova")).toBeInTheDocument()
      expect(screen.getByText("3 менторов")).toBeInTheDocument()
    })

    it("filters by name via the search box", async () => {
      const user = userEvent.setup()
      await renderList()
      await user.type(screen.getByPlaceholderText(/Поиск по имени/), "Yerlan")

      expect(screen.getByText("Yerlan Bekov")).toBeInTheDocument()
      expect(screen.queryByText("Aigerim Nurlanovna")).not.toBeInTheDocument()
      expect(screen.queryByText("Dana Smagulova")).not.toBeInTheDocument()
    })

    it("filters by university via the search box, case-insensitively", async () => {
      const user = userEvent.setup()
      await renderList()
      await user.type(screen.getByPlaceholderText(/Поиск по имени/), "oxford")

      expect(screen.getByText("Yerlan Bekov")).toBeInTheDocument()
      expect(screen.queryByText("Aigerim Nurlanovna")).not.toBeInTheDocument()
    })

    it("filters by bio text via the search box", async () => {
      const user = userEvent.setup()
      await renderList()
      await user.type(screen.getByPlaceholderText(/Поиск по имени/), "German universities")

      expect(screen.getByText("Dana Smagulova")).toBeInTheDocument()
      expect(screen.queryByText("Yerlan Bekov")).not.toBeInTheDocument()
    })

    it("filters by country", async () => {
      const user = userEvent.setup()
      await renderList()
      const [countrySelect] = screen.getAllByRole("combobox")
      await user.selectOptions(countrySelect, "GB")

      expect(screen.getByText("Yerlan Bekov")).toBeInTheDocument()
      expect(screen.queryByText("Aigerim Nurlanovna")).not.toBeInTheDocument()
      expect(screen.queryByText("Dana Smagulova")).not.toBeInTheDocument()
    })

    it("filters by expertise area", async () => {
      const user = userEvent.setup()
      await renderList()
      const selects = screen.getAllByRole("combobox")
      const expertiseSelect = selects[1]
      await user.selectOptions(expertiseSelect, "documents")

      expect(screen.getByText("Dana Smagulova")).toBeInTheDocument()
      expect(screen.queryByText("Aigerim Nurlanovna")).not.toBeInTheDocument()
      expect(screen.queryByText("Yerlan Bekov")).not.toBeInTheDocument()
    })

    it("filters by language", async () => {
      const user = userEvent.setup()
      await renderList()
      const selects = screen.getAllByRole("combobox")
      const languageSelect = selects[2]
      await user.selectOptions(languageSelect, "de")

      expect(screen.getByText("Dana Smagulova")).toBeInTheDocument()
      expect(screen.queryByText("Aigerim Nurlanovna")).not.toBeInTheDocument()
      expect(screen.queryByText("Yerlan Bekov")).not.toBeInTheDocument()
    })

    it("filters to only mentors accepting bookings", async () => {
      const user = userEvent.setup()
      await renderList()
      await user.click(screen.getByRole("button", { name: /Принимает записи/ }))

      expect(screen.getByText("Aigerim Nurlanovna")).toBeInTheDocument()
      expect(screen.getByText("Dana Smagulova")).toBeInTheDocument()
      expect(screen.queryByText("Yerlan Bekov")).not.toBeInTheDocument()
    })

    it("filters to only universal mentors", async () => {
      const user = userEvent.setup()
      await renderList()
      await user.click(screen.getByRole("button", { name: /Универсальный ментор/ }))

      expect(screen.getByText("Yerlan Bekov")).toBeInTheDocument()
      expect(screen.queryByText("Aigerim Nurlanovna")).not.toBeInTheDocument()
      expect(screen.queryByText("Dana Smagulova")).not.toBeInTheDocument()
    })

    it("combines multiple filters (AND semantics)", async () => {
      const user = userEvent.setup()
      await renderList()
      await user.type(screen.getByPlaceholderText(/Поиск по имени/), "Dana")
      await user.click(screen.getByRole("button", { name: /Принимает записи/ }))

      expect(screen.getByText("Dana Smagulova")).toBeInTheDocument()
      expect(screen.queryByText("Aigerim Nurlanovna")).not.toBeInTheDocument()
    })

    it("shows the empty state and a reset link when no mentor matches", async () => {
      const user = userEvent.setup()
      await renderList()
      await user.type(screen.getByPlaceholderText(/Поиск по имени/), "nonexistent mentor xyz")

      expect(screen.getByText("Менторов не найдено")).toBeInTheDocument()
      const resetLink = screen.getByText("Сбросить все фильтры")
      await user.click(resetLink)

      expect(screen.getByText("Aigerim Nurlanovna")).toBeInTheDocument()
    })

    it("shows a 'clear filters' button only when a filter is active, and it resets everything", async () => {
      const user = userEvent.setup()
      await renderList()
      expect(screen.queryByText("Сбросить фильтры")).not.toBeInTheDocument()

      await user.type(screen.getByPlaceholderText(/Поиск по имени/), "Dana")
      expect(screen.getByText("Сбросить фильтры")).toBeInTheDocument()

      await user.click(screen.getByText("Сбросить фильтры"))
      expect(screen.queryByText("Сбросить фильтры")).not.toBeInTheDocument()
      expect(screen.getByText("3 менторов")).toBeInTheDocument()
    })

    it("tracks a mentor_card_clicked analytics event when a card is clicked", async () => {
      const user = userEvent.setup()
      await renderList()
      await user.click(screen.getByText("Aigerim Nurlanovna"))

      expect(track).toHaveBeenCalledWith("mentor_card_clicked", { mentor_profile_id: 1 })
    })

    it("shows the singular 'ментор' label when exactly one result matches", async () => {
      const user = userEvent.setup()
      await renderList()
      await user.type(screen.getByPlaceholderText(/Поиск по имени/), "Dana")
      expect(screen.getByText("1 ментор")).toBeInTheDocument()
    })
  })
})
