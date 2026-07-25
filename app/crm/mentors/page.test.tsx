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

  it("loads the 'submitted' filter by default", async () => {
    vi.mocked(fetchAdminMentors).mockResolvedValue([])
    render(<CRMMentorsPage />)

    expect(await screen.findByText("Нет менторов в этой категории")).toBeInTheDocument()
    expect(fetchAdminMentors).toHaveBeenCalledWith("submitted")
  })

  it("shows an error banner when the fetch fails", async () => {
    vi.mocked(fetchAdminMentors).mockRejectedValue(new Error("boom"))
    render(<CRMMentorsPage />)

    expect(await screen.findByText("Не удалось загрузить менторов")).toBeInTheDocument()
  })

  it("re-fetches with the new filter when switching tabs", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminMentors).mockResolvedValue([])
    render(<CRMMentorsPage />)
    await screen.findByText("Нет менторов в этой категории")

    await user.click(screen.getByRole("button", { name: "Все" }))
    expect(fetchAdminMentors).toHaveBeenCalledWith("all")

    await user.click(screen.getByRole("button", { name: "Заблокированные" }))
    expect(fetchAdminMentors).toHaveBeenCalledWith("banned")
  })

  it("approves a mentor and removes them from the submitted list", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminMentors).mockResolvedValue([makeMentor({ id: 1 })])
    vi.mocked(approveMentor).mockResolvedValue(undefined)

    render(<CRMMentorsPage />)
    await screen.findByText("Айгерим Ержанова")

    await user.click(screen.getByRole("button", { name: "Одобрить" }))

    expect(approveMentor).toHaveBeenCalledWith(1)
    expect(await screen.findByText("Нет менторов в этой категории")).toBeInTheDocument()
  })

  it("rejects a mentor and removes them from the submitted list", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminMentors).mockResolvedValue([makeMentor({ id: 1 })])
    vi.mocked(rejectMentor).mockResolvedValue(undefined)

    render(<CRMMentorsPage />)
    await screen.findByText("Айгерим Ержанова")

    await user.click(screen.getByRole("button", { name: "Отклонить" }))

    expect(rejectMentor).toHaveBeenCalledWith(1)
    expect(await screen.findByText("Нет менторов в этой категории")).toBeInTheDocument()
  })

  it("bans a mentor after entering a reason and flips the badge to blocked", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminMentors).mockResolvedValue([makeMentor({ id: 1, is_submitted: false, is_approved: true })])
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
    vi.mocked(fetchAdminMentors).mockResolvedValue([])
    render(<CRMMentorsPage />)

    expect(await screen.findByText("Нет менторов в этой категории")).toBeInTheDocument()
  })

  it("unbans a banned mentor and flips the badge back to normal", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminMentors).mockResolvedValue([
      makeMentor({ id: 1, is_banned: true, is_submitted: false, is_approved: true }),
    ])
    vi.mocked(unbanMentor).mockResolvedValue(undefined)

    render(<CRMMentorsPage />)
    await screen.findByText("заблокирован")

    await user.click(screen.getByRole("button", { name: "Разблокировать" }))

    expect(unbanMentor).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.queryByText("заблокирован")).not.toBeInTheDocument())
  })
})
