import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { useRouter } from "@/i18n/navigation"
import MentorSchedulePage from "./page"
import { fetchMyMentorSchedule, saveMyMentorSchedule, fetchMentorProfile, fetchMentorUpcomingBookings } from "@/lib/api"
import type { MentorSchedule } from "@/lib/schedule"
import type { MentorProfile } from "@/types"

vi.mock("@/lib/api")

function makeSchedule(overrides: Partial<MentorSchedule> = {}): MentorSchedule {
  return {
    timezone: "Asia/Almaty",
    weekly: [{ weekday: 0, start_time: "10:00", end_time: "18:00" }],
    blocks: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(fetchMentorProfile).mockRejectedValue(new Error("403"))
  vi.mocked(fetchMentorUpcomingBookings).mockResolvedValue([])
})

describe("MentorSchedulePage — auth gate", () => {
  it("redirects to /auth/login when there is no access token", async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    render(<MentorSchedulePage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"))
  })

  it("redirects a non-mentor (student) role to /mentor/dashboard", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "student")
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    render(<MentorSchedulePage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/mentor/dashboard"))
  })

  it("redirects a not-yet-submitted mentor to the onboarding wizard (useMentorOnboardingGate)", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      { is_submitted: false, is_approved: false } as MentorProfile,
    )
    vi.mocked(fetchMyMentorSchedule).mockResolvedValue(makeSchedule())

    render(<MentorSchedulePage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/mentor"))
  })
})

describe("MentorSchedulePage — mentor view", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
  })

  it("renders the loaded weekly schedule and timezone", async () => {
    vi.mocked(fetchMyMentorSchedule).mockResolvedValue(makeSchedule())

    render(<MentorSchedulePage />)

    expect(await screen.findByText("Часовой пояс: Asia/Almaty")).toBeInTheDocument()
    expect(screen.getByText("Понедельник")).toBeInTheDocument()
  })

  it("shows an error banner when the schedule fails to load", async () => {
    vi.mocked(fetchMyMentorSchedule).mockRejectedValue(new Error("Не удалось загрузить расписание"))

    render(<MentorSchedulePage />)

    expect(await screen.findByText("Не удалось загрузить расписание")).toBeInTheDocument()
  })

  it("toggles a day on and adds a default 10:00-18:00 slot", async () => {
    vi.mocked(fetchMyMentorSchedule).mockResolvedValue(makeSchedule({ weekly: [] }))

    render(<MentorSchedulePage />)

    await screen.findByText("Понедельник")
    const tuesdayToggle = screen.getAllByRole("button", { pressed: false })[0]
    fireEvent.click(tuesdayToggle)

    expect(await screen.findByText("Добавить окно")).toBeInTheDocument()
  })

  it("adds a blocked date and lists it", async () => {
    vi.mocked(fetchMyMentorSchedule).mockResolvedValue(makeSchedule())

    render(<MentorSchedulePage />)

    await screen.findByText("Заблокированные даты")
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 10)
    const iso = futureDate.toISOString().split("T")[0]
    fireEvent.change(dateInput, { target: { value: iso } })
    fireEvent.change(screen.getByPlaceholderText("Отпуск, экзамен..."), { target: { value: "Отпуск" } })
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }))

    expect(await screen.findByText(iso)).toBeInTheDocument()
    expect(screen.getByText("Отпуск")).toBeInTheDocument()
  })

  it("saves the schedule and shows a success banner", async () => {
    vi.mocked(fetchMyMentorSchedule).mockResolvedValue(makeSchedule())
    vi.mocked(saveMyMentorSchedule).mockResolvedValue(makeSchedule())

    render(<MentorSchedulePage />)

    const saveButton = await screen.findByRole("button", { name: "Сохранить расписание" })
    fireEvent.click(saveButton)

    await waitFor(() => expect(saveMyMentorSchedule).toHaveBeenCalledWith({
      weekly: [{ weekday: 0, start_time: "10:00", end_time: "18:00" }],
      blocks: [],
    }))
    expect(await screen.findByText("Расписание сохранено")).toBeInTheDocument()
  })

  it("shows an error banner when saving fails", async () => {
    vi.mocked(fetchMyMentorSchedule).mockResolvedValue(makeSchedule())
    vi.mocked(saveMyMentorSchedule).mockRejectedValue(new Error("Пересекающиеся окна"))

    render(<MentorSchedulePage />)

    const saveButton = await screen.findByRole("button", { name: "Сохранить расписание" })
    fireEvent.click(saveButton)

    expect(await screen.findByText("Пересекающиеся окна")).toBeInTheDocument()
  })
})

describe("MentorSchedulePage — upcoming bookings", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    vi.mocked(fetchMyMentorSchedule).mockResolvedValue(makeSchedule())
  })

  it("shows the empty state when nobody is booked", async () => {
    vi.mocked(fetchMentorUpcomingBookings).mockResolvedValue([])

    render(<MentorSchedulePage />)

    expect(await screen.findByText("Пока никто не записан")).toBeInTheDocument()
  })

  it("lists an upcoming booking with student name, service and time", async () => {
    vi.mocked(fetchMentorUpcomingBookings).mockResolvedValue([{
      order_id: 42,
      scheduled_at: "2026-08-10T06:00:00Z",
      service_title: "Полное сопровождение поступления в США",
      student_id: 51,
      student_name: "Тестовый Клиент",
      order_status: "draft",
      payout_category: "support",
    }])

    render(<MentorSchedulePage />)

    expect(await screen.findByText("Тестовый Клиент")).toBeInTheDocument()
    expect(screen.getByText("Полное сопровождение поступления в США")).toBeInTheDocument()
    const link = screen.getByRole("link", { name: /Тестовый Клиент/ })
    expect(link).toHaveAttribute("href", "/orders/42")
  })

  it("shows an error message when the bookings fail to load", async () => {
    vi.mocked(fetchMentorUpcomingBookings).mockRejectedValue(new Error("network error"))

    render(<MentorSchedulePage />)

    expect(await screen.findByText("Не удалось загрузить список записей")).toBeInTheDocument()
  })
})
