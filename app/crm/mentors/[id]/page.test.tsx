import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useParams, useRouter } from "next/navigation"
import { fetchAdminMentors, approveMentor, rejectMentor, banMentor, unbanMentor } from "@/lib/api"
import { AdminMentorProfile } from "@/types"
import CRMMentorDetailPage from "./page"

vi.mock("@/lib/api")

function makeMentor(overrides: Partial<AdminMentorProfile> = {}): AdminMentorProfile {
  return {
    id: 5,
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

const push = vi.fn()
const back = vi.fn()

describe("CRMMentorDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ id: "5" })
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      back,
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
  })

  it("shows a loading spinner then the mentor once fetched", async () => {
    vi.mocked(fetchAdminMentors).mockResolvedValue([makeMentor()])
    render(<CRMMentorDetailPage />)

    expect(await screen.findByText("Айгерим Ержанова")).toBeInTheDocument()
    expect(fetchAdminMentors).toHaveBeenCalledWith("all")
  })

  it("shows a not-found message when the mentor id isn't in the list", async () => {
    vi.mocked(fetchAdminMentors).mockResolvedValue([makeMentor({ id: 999 })])
    render(<CRMMentorDetailPage />)

    expect(await screen.findByText("Ментор не найден")).toBeInTheDocument()
  })

  it("shows the fetch-failure message instead of the not-found message when the fetch fails", async () => {
    vi.mocked(fetchAdminMentors).mockRejectedValue(new Error("boom"))
    render(<CRMMentorDetailPage />)

    expect(await screen.findByText("Не удалось загрузить профиль")).toBeInTheDocument()
    expect(screen.queryByText("Ментор не найден")).not.toBeInTheDocument()
  })

  it("approves a submitted, unapproved mentor and navigates back to the list", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminMentors).mockResolvedValue([makeMentor({ is_submitted: true, is_approved: false })])
    vi.mocked(approveMentor).mockResolvedValue(undefined)

    render(<CRMMentorDetailPage />)
    await screen.findByText("Айгерим Ержанова")

    await user.click(screen.getByRole("button", { name: "Одобрить" }))

    expect(approveMentor).toHaveBeenCalledWith(5)
    expect(await screen.findByText("Ментор одобрен")).toBeInTheDocument()

    await waitFor(() => expect(push).toHaveBeenCalledWith("/crm/mentors"), { timeout: 2000 })
  })

  it("rejects a submitted, unapproved mentor", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminMentors).mockResolvedValue([makeMentor({ is_submitted: true, is_approved: false })])
    vi.mocked(rejectMentor).mockResolvedValue(undefined)

    render(<CRMMentorDetailPage />)
    await screen.findByText("Айгерим Ержанова")

    await user.click(screen.getByRole("button", { name: "Отклонить" }))

    expect(rejectMentor).toHaveBeenCalledWith(5)
    expect(await screen.findByText("Отклонено")).toBeInTheDocument()
  })

  it("requires opening the ban form and typing a reason before banning, then reflects banned state", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminMentors).mockResolvedValue([
      makeMentor({ is_submitted: false, is_approved: true, is_banned: false }),
    ])
    vi.mocked(banMentor).mockResolvedValue(undefined)

    render(<CRMMentorDetailPage />)
    await screen.findByText("Айгерим Ержанова")

    // Ban button not yet visible input form
    expect(screen.queryByPlaceholderText("Причина блокировки...")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Заблокировать" }))
    const reasonInput = screen.getByPlaceholderText("Причина блокировки...")
    await user.type(reasonInput, "Нарушение правил платформы")

    await user.click(screen.getByRole("button", { name: "Заблокировать" }))

    expect(banMentor).toHaveBeenCalledWith(5, "Нарушение правил платформы")
    expect(await screen.findByText("Ментор заблокирован")).toBeInTheDocument()
  })

  it("shows an unban button and ban reason for an already-banned mentor, and calls unbanMentor", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminMentors).mockResolvedValue([
      makeMentor({ is_banned: true, ban_reason: "Мошенничество", is_submitted: false, is_approved: true }),
    ])
    vi.mocked(unbanMentor).mockResolvedValue(undefined)

    render(<CRMMentorDetailPage />)
    await screen.findByText("Айгерим Ержанова")

    expect(screen.getByText("Мошенничество")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Заблокировать" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Разблокировать" }))

    expect(unbanMentor).toHaveBeenCalledWith(5)
    expect(await screen.findByText("Ментор разблокирован")).toBeInTheDocument()
  })

  it("shows an error message and stays on the page when an action fails", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminMentors).mockResolvedValue([makeMentor({ is_submitted: true, is_approved: false })])
    vi.mocked(approveMentor).mockRejectedValue(new Error("Сетевая ошибка"))

    render(<CRMMentorDetailPage />)
    await screen.findByText("Айгерим Ержанова")

    await user.click(screen.getByRole("button", { name: "Одобрить" }))

    expect(await screen.findByText("Сетевая ошибка")).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it("navigates back when clicking the back button", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminMentors).mockResolvedValue([makeMentor()])
    render(<CRMMentorDetailPage />)
    await screen.findByText("Айгерим Ержанова")

    await user.click(screen.getByRole("button", { name: /Назад/ }))
    expect(back).toHaveBeenCalled()
  })
})
