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
    authFetch: vi.fn(),
  }
})

import { fetchStudentProfile, authFetch } from "@/lib/api"

// jsdom doesn't implement Element.scrollIntoView — the field-error path
// calls it to bring the first invalid field into view after a failed
// save, which would otherwise throw and abort the state update mid-catch.
Element.prototype.scrollIntoView = vi.fn()

function jsonResponse(data: unknown, ok = true): Response {
  return { ok, json: async () => data } as Response
}

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
    // Default to "complete" so tests that don't care about the
    // onboarding gate aren't silently redirected in the background.
    is_profile_complete: true,
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

  it("redirects a student with an incomplete profile to the onboarding wizard (useStudentOnboardingGate)", async () => {
    localStorage.setItem("access_token", "fake-token")
    localStorage.setItem("role", "student")
    const { replace } = mockRouter()
    vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile({ is_profile_complete: false }))

    render(<StudentProfilePage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/student"))
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
      vi.mocked(authFetch).mockResolvedValue(
        jsonResponse(makeStudentProfile({ full_name: "Данияр Ахметов" })),
      )
      render(<StudentProfilePage />)

      const nameInput = await screen.findByDisplayValue("Данияр Сериков")
      await user.clear(nameInput)
      await user.type(nameInput, "Данияр Ахметов")

      const submit = screen.getByRole("button", { name: "Сохранить" })
      await user.click(submit)

      await waitFor(() => {
        const patchCall = vi.mocked(authFetch).mock.calls.find(([, init]) => init?.method === "PATCH")
        expect(patchCall).toBeDefined()
        const body = JSON.parse(String(patchCall?.[1]?.body))
        expect(body.full_name).toBe("Данияр Ахметов")
      })
      expect(await screen.findByText("Сохранено")).toBeInTheDocument()
    })

    it("shows a generic error banner when saving fails with a non-field error", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())
      // A network-level failure (not a 400 with a field-keyed body) — the
      // message isn't JSON, so it falls through to the generic banner
      // instead of being parsed as a field-errors dict.
      vi.mocked(authFetch).mockRejectedValue(new Error("Ошибка сервера"))
      render(<StudentProfilePage />)

      const submit = await screen.findByRole("button", { name: "Сохранить" })
      await user.click(submit)

      expect(await screen.findByText("Ошибка сервера")).toBeInTheDocument()
    })

    it("shows a field-level error returned by the backend under the offending field", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())
      vi.mocked(authFetch).mockResolvedValue(
        jsonResponse({ city: ["Город обязателен"] }, false),
      )
      render(<StudentProfilePage />)

      const submit = await screen.findByRole("button", { name: "Сохранить" })
      await user.click(submit)

      expect(await screen.findByText("Город обязателен")).toBeInTheDocument()
      expect(screen.getByText("Исправь поля, отмеченные красным")).toBeInTheDocument()
    })

    it("translates a known backend validation message instead of showing raw text", async () => {
      const user = userEvent.setup()
      vi.mocked(fetchStudentProfile).mockResolvedValue(makeStudentProfile())
      vi.mocked(authFetch).mockResolvedValue(
        jsonResponse(
          { school_graduation_year: ["Ensure this value is greater than or equal to 1990."] },
          false,
        ),
      )
      render(<StudentProfilePage />)

      const submit = await screen.findByRole("button", { name: "Сохранить" })
      await user.click(submit)

      expect(await screen.findByText("Год должен быть не раньше 1990.")).toBeInTheDocument()
      expect(
        screen.queryByText("Ensure this value is greater than or equal to 1990."),
      ).not.toBeInTheDocument()
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
