import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchAdminMentors, approveMentor, rejectMentor, banMentor, unbanMentor } from "@/lib/api"
import { AdminMentorProfile } from "@/types"
import CRMMentorsPage from "./page"

vi.mock("@/lib/api")

function makeMentor(overrides: Partial<AdminMentorProfile> = {}): AdminMentorProfile {
  return {
    id: 1,
    full_name: "Айгерим Ержанова",
    age: 25,
    countries: [],
    languages: [],
    school_or_university: "MIT",
    major: "CS",
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
    is_approved: false,
    is_submitted: true,
    is_public: true,
    is_accepting_bookings: true,
    is_universal: false,
    is_banned: false,
    ban_reason: "",
    has_documents: true,
    rating_avg: null,
    rating_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    user_email: "mentor@example.com",
    telegram_username: "",
    telegram_id: "",
    ...overrides,
  }
}

describe("CRMMentorsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads every mentor (no filter param) and defaults to the 'Все' tab", async () => {
    const approved = makeMentor({ id: 1, is_submitted: false, is_approved: true })
    const pending = makeMentor({ id: 2, full_name: "Бекзат Смагулов", is_submitted: true, is_approved: false })
    vi.mocked(fetchAdminMentors).mockResolvedValue([approved, pending])

    render(<CRMMentorsPage />)

    expect(await screen.findByText("Айгерим Ержанова")).toBeInTheDocument()
    expect(screen.getByText("Бекзат Смагулов")).toBeInTheDocument()
    expect(fetchAdminMentors).toHaveBeenCalledWith()
  })

  it("shows an error banner when the fetch fails", async () => {
    vi.mocked(fetchAdminMentors).mockRejectedValue(new Error("boom"))
    render(<CRMMentorsPage />)

    expect(await screen.findByText("Не удалось загрузить менторов")).toBeInTheDocument()
  })

  it("flags a pending mentor with a review badge even on the 'Все' tab", async () => {
    vi.mocked(fetchAdminMentors).mockResolvedValue([
      makeMentor({ id: 1, is_submitted: true, is_approved: false }),
    ])
    render(<CRMMentorsPage />)

    expect(await screen.findByText("⏳ на проверке")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Одобрить" })).toBeInTheDocument()
  })

  it("switches tabs client-side without re-fetching", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminMentors).mockResolvedValue([
      makeMentor({ id: 1, full_name: "На проверке Мент", is_submitted: true, is_approved: false }),
      makeMentor({ id: 2, full_name: "Забаненный Мент", is_banned: true, is_submitted: false, is_approved: true }),
    ])
    render(<CRMMentorsPage />)
    await screen.findByText("На проверке Мент")

    await user.click(screen.getByRole("button", { name: /^На проверку/ }))
    expect(screen.getByText("На проверке Мент")).toBeInTheDocument()
    expect(screen.queryByText("Забаненный Мент")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /^Заблокированные/ }))
    expect(screen.getByText("Забаненный Мент")).toBeInTheDocument()
    expect(screen.queryByText("На проверке Мент")).not.toBeInTheDocument()

    // Only the initial mount fetch — tab switches are pure client filtering.
    expect(fetchAdminMentors).toHaveBeenCalledTimes(1)
  })

  it("shows an amber dot on the 'На проверку' tab when something is pending", async () => {
    vi.mocked(fetchAdminMentors).mockResolvedValue([
      makeMentor({ id: 1, is_submitted: true, is_approved: false }),
    ])
    render(<CRMMentorsPage />)

    const tab = await screen.findByRole("button", { name: /^На проверку/ })
    expect(tab.querySelector(".bg-amber-500")).not.toBeNull()
  })

  it("approves a mentor and refetches the list", async () => {
    const user = userEvent.setup()
    const pending = makeMentor({ id: 1, is_submitted: true, is_approved: false })
    vi.mocked(fetchAdminMentors)
      .mockResolvedValueOnce([pending])
      .mockResolvedValueOnce([{ ...pending, is_approved: true }])
    vi.mocked(approveMentor).mockResolvedValue(undefined)

    render(<CRMMentorsPage />)
    await screen.findByText("Айгерим Ержанова")

    await user.click(screen.getByRole("button", { name: "Одобрить" }))

    expect(approveMentor).toHaveBeenCalledWith(1)
    await waitFor(() => expect(fetchAdminMentors).toHaveBeenCalledTimes(2))
    expect(await screen.findByText("одобрен")).toBeInTheDocument()
    expect(screen.queryByText("⏳ на проверке")).not.toBeInTheDocument()
  })

  it("rejects a mentor and refetches the list", async () => {
    const user = userEvent.setup()
    const pending = makeMentor({ id: 1, is_submitted: true, is_approved: false })
    vi.mocked(fetchAdminMentors)
      .mockResolvedValueOnce([pending])
      .mockResolvedValueOnce([])
    vi.mocked(rejectMentor).mockResolvedValue(undefined)

    render(<CRMMentorsPage />)
    await screen.findByText("Айгерим Ержанова")

    await user.click(screen.getByRole("button", { name: "Отклонить" }))

    expect(rejectMentor).toHaveBeenCalledWith(1)
    expect(await screen.findByText("Нет менторов в этой категории")).toBeInTheDocument()
  })

  it("bans a mentor after entering a reason and flips the badge to blocked", async () => {
    const user = userEvent.setup()
    const mentor = makeMentor({ id: 1, is_submitted: false, is_approved: true })
    vi.mocked(fetchAdminMentors)
      .mockResolvedValueOnce([mentor])
      .mockResolvedValueOnce([{ ...mentor, is_banned: true }])
    vi.mocked(banMentor).mockResolvedValue(undefined)

    render(<CRMMentorsPage />)
    await screen.findByText("Айгерим Ержанова")

    await user.click(screen.getByRole("button", { name: "Забанить" }))
    await user.type(screen.getByPlaceholderText("Причина..."), "Спам")
    await user.click(screen.getByRole("button", { name: "Забанить" }))

    expect(banMentor).toHaveBeenCalledWith(1, "Спам")
    expect(await screen.findByText("заблокирован")).toBeInTheDocument()
  })

  it("shows the empty state for the current category, not a global empty state", async () => {
    vi.mocked(fetchAdminMentors).mockResolvedValue([
      makeMentor({ id: 1, is_submitted: false, is_approved: true }),
    ])
    render(<CRMMentorsPage />)
    await screen.findByText("Айгерим Ержанова")

    await userEvent.setup().click(screen.getByRole("button", { name: /^На проверку/ }))

    expect(await screen.findByText("Нет менторов в этой категории")).toBeInTheDocument()
  })

  it("unbans a banned mentor and refetches the list", async () => {
    const user = userEvent.setup()
    const banned = makeMentor({ id: 1, is_banned: true, is_submitted: false, is_approved: true })
    vi.mocked(fetchAdminMentors)
      .mockResolvedValueOnce([banned])
      .mockResolvedValueOnce([{ ...banned, is_banned: false }])
    vi.mocked(unbanMentor).mockResolvedValue(undefined)

    render(<CRMMentorsPage />)
    await screen.findByText("заблокирован")

    await user.click(screen.getByRole("button", { name: "Разблокировать" }))

    expect(unbanMentor).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.queryByText("заблокирован")).not.toBeInTheDocument())
  })
})
