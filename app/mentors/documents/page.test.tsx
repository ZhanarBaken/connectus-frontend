import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { useRouter } from "next/navigation"
import MentorDocumentsPage from "./page"
import { authFetch, fetchMentorProfile } from "@/lib/api"
import type { MentorProfile } from "@/types"

vi.mock("@/lib/api")

interface MentorDocument {
  id: number
  kind: string
  original_filename: string
  content_type: string
  size_bytes: number
  status: "pending" | "approved" | "rejected"
  review_note: string
  uploaded_at: string
  download_url: string
}

function makeDoc(overrides: Partial<MentorDocument> = {}): MentorDocument {
  return {
    id: 1,
    kind: "diploma",
    original_filename: "diploma.pdf",
    content_type: "application/pdf",
    size_bytes: 1024,
    status: "pending",
    review_note: "",
    uploaded_at: "2026-07-01T10:00:00Z",
    download_url: "https://example.com/diploma.pdf",
    ...overrides,
  }
}

function jsonResponse(data: unknown, ok = true): Response {
  return { ok, json: async () => data } as Response
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

describe("MentorDocumentsPage — auth gate", () => {
  it("redirects to /auth/login when there is no access token", async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    render(<MentorDocumentsPage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"))
  })

  it("redirects students to /student/dashboard", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "student")
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    })

    render(<MentorDocumentsPage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/student/dashboard"))
  })
})

describe("MentorDocumentsPage — mentor view", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
  })

  it("shows an empty state when there are no documents", async () => {
    vi.mocked(authFetch).mockResolvedValue(jsonResponse([]))

    render(<MentorDocumentsPage />)

    expect(await screen.findByText("Документов пока нет")).toBeInTheDocument()
  })

  it("renders the document list with status badges", async () => {
    vi.mocked(authFetch).mockResolvedValue(
      jsonResponse([makeDoc({ status: "approved" }), makeDoc({ id: 2, status: "rejected", review_note: "Плохое качество скана" })]),
    )

    render(<MentorDocumentsPage />)

    expect(await screen.findAllByText("diploma.pdf")).toHaveLength(2)
    expect(screen.getByText("Одобрен")).toBeInTheDocument()
    expect(screen.getByText("Отклонён")).toBeInTheDocument()
    expect(screen.getByText("Плохое качество скана", { exact: false })).toBeInTheDocument()
  })

  it("uploads a new document and prepends it to the list", async () => {
    vi.mocked(authFetch).mockImplementation((url, init) => {
      if (!init || !init.method) return Promise.resolve(jsonResponse([]))
      if (init.method === "POST") return Promise.resolve(jsonResponse(makeDoc({ id: 5, original_filename: "new-doc.pdf" })))
      return Promise.resolve(jsonResponse([]))
    })

    render(<MentorDocumentsPage />)

    await screen.findByText("Документов пока нет")

    const file = new File(["content"], "new-doc.pdf", { type: "application/pdf" })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })

    const uploadButton = screen.getByRole("button", { name: "Загрузить" })
    fireEvent.click(uploadButton)

    expect(await screen.findByText("new-doc.pdf")).toBeInTheDocument()
  })

  it("rejects a file larger than 15MB without calling authFetch to upload", async () => {
    vi.mocked(authFetch).mockResolvedValue(jsonResponse([]))

    render(<MentorDocumentsPage />)
    await screen.findByText("Документов пока нет")

    const bigFile = new File([new ArrayBuffer(16 * 1024 * 1024)], "huge.pdf", { type: "application/pdf" })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [bigFile] } })

    fireEvent.click(screen.getByRole("button", { name: "Загрузить" }))

    expect(await screen.findByText("Файл слишком большой. Максимум 15 MB.")).toBeInTheDocument()
    // Only the initial GET happened — no POST for the oversized file.
    expect(authFetch).toHaveBeenCalledTimes(1)
  })

  it("shows an upload error returned by the backend", async () => {
    vi.mocked(authFetch).mockImplementation((url, init) => {
      if (init?.method === "POST") {
        return Promise.resolve(jsonResponse({ detail: "Неверный формат файла" }, false))
      }
      return Promise.resolve(jsonResponse([]))
    })

    render(<MentorDocumentsPage />)
    await screen.findByText("Документов пока нет")

    const file = new File(["content"], "bad.pdf", { type: "application/pdf" })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })
    fireEvent.click(screen.getByRole("button", { name: "Загрузить" }))

    expect(await screen.findByText("Неверный формат файла")).toBeInTheDocument()
  })

  it("deletes a document after confirming", async () => {
    vi.mocked(authFetch).mockImplementation((url, init) => {
      if (init?.method === "DELETE") return Promise.resolve(jsonResponse({}))
      return Promise.resolve(jsonResponse([makeDoc()]))
    })
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)

    render(<MentorDocumentsPage />)

    await screen.findByText("diploma.pdf")
    // The delete button has no aria-label; select it via the Icon name
    // ("delete") rendered as its (aria-hidden) text content.
    const buttons = screen.getAllByRole("button")
    const deleteBtn = buttons.find((b) => b.textContent === "delete")
    expect(deleteBtn).toBeTruthy()
    fireEvent.click(deleteBtn!)

    await waitFor(() => expect(screen.queryByText("diploma.pdf")).not.toBeInTheDocument())
    confirmSpy.mockRestore()
  })

  it("hides the upload form and delete actions when the mentor is banned", async () => {
    vi.mocked(fetchMentorProfile).mockResolvedValue(makeMentorProfile({ is_banned: true }))
    vi.mocked(authFetch).mockResolvedValue(jsonResponse([makeDoc()]))

    render(<MentorDocumentsPage />)

    expect(await screen.findByText("Аккаунт заблокирован")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Загрузить" })).not.toBeInTheDocument()
  })
})
