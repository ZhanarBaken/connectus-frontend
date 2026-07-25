import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "@/i18n/navigation"
import StudentProfilePage from "./page"
import type { StudentProfile } from "@/types"

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api")
  return {
    ...actual,
    fetchStudentProfile: vi.fn(),
    updateStudentProfile: vi.fn(),
  }
})

import { fetchStudentProfile, updateStudentProfile } from "@/lib/api"

function makeStudentProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    id: 1,
    full_name: "Данияр Сериков",
    date_of_birth: null,
    age: 17,
    current_school_or_university: "НИШ Алматы",
    contacts: "",
    school_grade: "11 класс",
    city: "Алматы",
    school_graduation_year: 2026,
    desired_major: "",
    desired_countries: "",
    exam_results: "",
    gpa: "",
    profile_photo: null,
    is_public: true,
    welcome_bonus_available: false,
    welcome_bonus_expires_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
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

describe("StudentProfilePage (app/students/profile)", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("redirects to /auth/login when there is no access token", async () => {
    const { replace } = mockRouter()
    render(<StudentProfilePage />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/auth/login"))
    expect(fetchStudentProfile).not.toHaveBeenCalled()
  })

  it("redirects to /mentor/dashboard when role is mentor", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    render(<StudentProfilePage />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/mentor/dashboard"))
    expect(fetchStudentProfile).not.toHaveBeenCalled()
  })

  describe("authenticated student", () => {
    beforeEach(() => {
      localStorage.setItem("access_token", "fake-token")
      localStorage.setItem("role", "student")
      mockRouter()
    })

    it("prefills the form fields from the fetched profile", async () => {
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())
      render(<StudentProfilePage />)

      expect(await screen.findByDisplayValue("Данияр Сериков")).toBeInTheDocument()
      expect(screen.getByDisplayValue("17")).toBeInTheDocument()
      expect(screen.getByDisplayValue("НИШ Алматы")).toBeInTheDocument()
      expect(screen.getByDisplayValue("Алматы")).toBeInTheDocument()
      expect(screen.getByDisplayValue("2026")).toBeInTheDocument()
    })

    it("shows an error banner when the profile fails to load", async () => {
      vi.mocked(fetchStudentProfile).mockRejectedValue(new Error("network"))
      render(<StudentProfilePage />)
      expect(await screen.findByText("Не удалось загрузить профиль")).toBeInTheDocument()
    })

    it("disables submit until the required fields (name, grade, city, graduation year) are filled", async () => {
      vi.mocked(fetchStudentProfile).mockResolvedValue(
        makeStudentProfile({ full_name: "", school_grade: "", city: "", school_graduation_year: null }),
      )
      render(<StudentProfilePage />)

      const submit = await screen.findByRole("button", { name: "Сохранить" })
      expect(submit).toBeDisabled()
    })

    it("saves the profile and shows a success confirmation", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())
      vi.mocked(updateStudentProfile).mockResolvedValue(makeStudentProfile({ full_name: "Данияр Ахметов" }))
      render(<StudentProfilePage />)

      const nameInput = await screen.findByDisplayValue("Данияр Сериков")
      await user.clear(nameInput)
      await user.type(nameInput, "Данияр Ахметов")

      const submit = screen.getByRole("button", { name: "Сохранить" })
      await user.click(submit)

      expect(updateStudentProfile).toHaveBeenCalledWith(
        expect.objectContaining({ full_name: "Данияр Ахметов" }),
      )
      expect(await screen.findByText("Сохранено")).toBeInTheDocument()
    })

    it("shows an error message when saving fails", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())
      vi.mocked(updateStudentProfile).mockRejectedValue(new Error("Город обязателен"))
      render(<StudentProfilePage />)

      const submit = await screen.findByRole("button", { name: "Сохранить" })
      await user.click(submit)

      expect(await screen.findByText("Город обязателен")).toBeInTheDocument()
    })

    it("rejects a photo file larger than 5MB without uploading", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())
      render(<StudentProfilePage />)

      await screen.findByDisplayValue("Данияр Сериков")
      const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(fileInput, bigFile)

      expect(await screen.findByText("Фото не должно превышать 5 МБ")).toBeInTheDocument()
    })
  })
})
