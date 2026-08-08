import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { useRouter } from "@/i18n/navigation"
import MentorServicesPage from "./page"
import {
  fetchMentorServices,
  fetchMentorProfile,
  createMentorService,
  updateMentorService,
  deleteMentorService,
} from "@/lib/api"
import type { MentorProfile, MentorService } from "@/types"

vi.mock("@/lib/api")

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

function makeService(overrides: Partial<MentorService> = {}): MentorService {
  return {
    id: 1,
    title: "Первичная консультация",
    description: "Разбираем ситуацию абитуриента",
    price: "5000",
    client_price: "5000",
    currency: "KZT",
    duration_minutes: 60,
    payout_category: "paid_consultation",
    grade_min: null,
    grade_max: null,
    meetings_min: null,
    meetings_max: null,
    duration_months_min: null,
    duration_months_max: null,
    is_price_negotiable: false,
    intro_call_enabled: false,
    is_active: true,
    ...overrides,
  }
}

function makeMentorProfile(overrides: Partial<MentorProfile> = {}): MentorProfile {
  return {
    id: 1,
    full_name: "Данияр Сериков",
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
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile())
})

describe("MentorServicesPage — empty state", () => {
  it("shows an empty-state card per category when there are no services", async () => {
    vi.mocked(fetchMentorServices).mockResolvedValue([])

    render(<MentorServicesPage />)

    expect(await screen.findByText("Пока нет ни одной консультации")).toBeInTheDocument()
    expect(screen.getByText("Пока нет программ сопровождения")).toBeInTheDocument()
  })
})

describe("MentorServicesPage — onboarding gate", () => {
  it("redirects a not-yet-submitted mentor to the onboarding wizard (useMentorOnboardingGate)", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      makeMentorProfile({ is_submitted: false, is_approved: false }),
    )
    vi.mocked(fetchMentorServices).mockResolvedValue([])

    render(<MentorServicesPage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/mentor"))
  })
})

describe("MentorServicesPage — listing", () => {
  it("renders existing services grouped by category", async () => {
    vi.mocked(fetchMentorServices).mockResolvedValue([
      makeService(),
      makeService({
        id: 2,
        title: "Сопровождение — 3 вуза",
        payout_category: "support",
        price: "500000",
        client_price: "500000",
        meetings_min: 4,
        meetings_max: 8,
        duration_months_min: 6,
        duration_months_max: 12,
      }),
    ])

    render(<MentorServicesPage />)

    expect(await screen.findByText("Первичная консультация")).toBeInTheDocument()
    expect(screen.getByText("Сопровождение — 3 вуза")).toBeInTheDocument()
    expect(screen.getByText("5 000 ₸", { exact: false })).toBeInTheDocument()
  })

  it("shows an error banner when fetchMentorServices fails", async () => {
    vi.mocked(fetchMentorServices).mockRejectedValue(new Error("network error"))

    render(<MentorServicesPage />)

    expect(await screen.findByText("Не удалось загрузить услуги")).toBeInTheDocument()
  })

  it("shows what the client pays (with commission) alongside the mentor's own price", async () => {
    vi.mocked(fetchMentorServices).mockResolvedValue([
      makeService({ price: "15000", client_price: "18750" }),
    ])

    render(<MentorServicesPage />)

    expect(await screen.findByText("15 000 ₸", { exact: false })).toBeInTheDocument()
    expect(screen.getByText("Клиент платит 18 750 ₸")).toBeInTheDocument()
  })

  it("does not show a second price when the mentor's price already equals what the client pays", async () => {
    vi.mocked(fetchMentorServices).mockResolvedValue([
      makeService({ price: "15000", client_price: "15000" }),
    ])

    render(<MentorServicesPage />)

    await screen.findByText("15 000 ₸", { exact: false })
    expect(screen.queryByText(/Клиент платит/)).not.toBeInTheDocument()
  })

  it("does not show a second price for a negotiable service", async () => {
    vi.mocked(fetchMentorServices).mockResolvedValue([
      makeService({ is_price_negotiable: true, price: null, client_price: null }),
    ])

    render(<MentorServicesPage />)

    await screen.findByText("Договорная")
    expect(screen.queryByText(/Клиент платит/)).not.toBeInTheDocument()
  })
})

describe("MentorServicesPage — create a consultation", () => {
  it("submits the create form and prepends the new service", async () => {
    vi.mocked(fetchMentorServices).mockResolvedValue([])
    const created = makeService({ id: 42, title: "Новая консультация" })
    vi.mocked(createMentorService).mockResolvedValue(created)

    render(<MentorServicesPage />)

    await screen.findByText("Пока нет ни одной консультации")
    fireEvent.click(screen.getAllByRole("button", { name: "+ Добавить" })[0])
    fireEvent.click(screen.getByRole("button", { name: /Консультация/ }))

    fireEvent.change(screen.getByPlaceholderText("Первичная консультация"), {
      target: { value: "Новая консультация" },
    })
    fireEvent.change(screen.getByPlaceholderText("5000"), { target: { value: "5000" } })

    fireEvent.click(screen.getByRole("button", { name: "Добавить услугу" }))

    await waitFor(() => expect(createMentorService).toHaveBeenCalled())
    expect(await screen.findByText("Новая консультация")).toBeInTheDocument()
  })

  it("shows a form error when createMentorService rejects", async () => {
    vi.mocked(fetchMentorServices).mockResolvedValue([])
    vi.mocked(createMentorService).mockRejectedValue(new Error("Описание слишком короткое"))

    render(<MentorServicesPage />)

    await screen.findByText("Пока нет ни одной консультации")
    fireEvent.click(screen.getAllByRole("button", { name: "+ Добавить" })[0])
    fireEvent.click(screen.getByRole("button", { name: /Консультация/ }))
    fireEvent.change(screen.getByPlaceholderText("Первичная консультация"), {
      target: { value: "Консультация" },
    })
    fireEvent.change(screen.getByPlaceholderText("5000"), { target: { value: "5000" } })
    fireEvent.click(screen.getByRole("button", { name: "Добавить услугу" }))

    expect(await screen.findByText("Описание слишком короткое")).toBeInTheDocument()
  })
})

describe("MentorServicesPage — edit a service", () => {
  it("prefills the form and calls updateMentorService on submit", async () => {
    const service = makeService()
    vi.mocked(fetchMentorServices).mockResolvedValue([service])
    vi.mocked(updateMentorService).mockResolvedValue({ ...service, title: "Обновлённое название" })

    render(<MentorServicesPage />)

    fireEvent.click(await screen.findByRole("button", { name: "Изменить" }))

    const titleInput = screen.getByDisplayValue("Первичная консультация")
    fireEvent.change(titleInput, { target: { value: "Обновлённое название" } })
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }))

    await waitFor(() => expect(updateMentorService).toHaveBeenCalledWith(
      service.id, expect.objectContaining({ title: "Обновлённое название" }),
    ))
    expect(await screen.findByText("Обновлённое название")).toBeInTheDocument()
  })
})

describe("MentorServicesPage — delete a service", () => {
  it("removes the service from the list after confirming deletion", async () => {
    // The backend either hard-deletes (never ordered) or archives (ordered
    // before) — either way the mentor's catalog no longer shows it.
    const service = makeService()
    vi.mocked(fetchMentorServices).mockResolvedValue([service])
    vi.mocked(deleteMentorService).mockResolvedValue(undefined)
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)

    render(<MentorServicesPage />)

    await screen.findByText(service.title)
    fireEvent.click(screen.getByLabelText("Удалить"))

    await waitFor(() => expect(deleteMentorService).toHaveBeenCalledWith(service.id))
    await waitFor(() => expect(screen.queryByText(service.title)).not.toBeInTheDocument())
    confirmSpy.mockRestore()
  })

  it("shows a delete error banner when deleteMentorService rejects", async () => {
    const service = makeService()
    vi.mocked(fetchMentorServices).mockResolvedValue([service])
    vi.mocked(deleteMentorService).mockRejectedValue(new Error("Нельзя удалить последнюю активную услугу"))
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)

    render(<MentorServicesPage />)

    fireEvent.click(await screen.findByLabelText("Удалить"))

    expect(await screen.findByText("Нельзя удалить последнюю активную услугу")).toBeInTheDocument()
    confirmSpy.mockRestore()
  })
})

describe("MentorServicesPage — banned mentor", () => {
  it("hides the add button and edit/delete actions", async () => {
    vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile({ is_banned: true }))
    vi.mocked(fetchMentorServices).mockResolvedValue([makeService()])

    render(<MentorServicesPage />)

    expect(await screen.findByText("Аккаунт заблокирован")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "+ Добавить" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Изменить" })).not.toBeInTheDocument()
  })
})
