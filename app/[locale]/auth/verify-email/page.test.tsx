import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import * as api from "@/lib/api"
import VerifyEmailPage from "./page"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    verifyEmail: vi.fn(),
    fetchMentorProfile: vi.fn(),
    fetchStudentProfile: vi.fn(),
  }
})

describe("VerifyEmailPage", () => {
  const push = vi.fn()
  const replace = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    push.mockClear()
    replace.mockClear()
    vi.mocked(api.verifyEmail).mockReset()
    vi.mocked(api.fetchMentorProfile).mockReset()
    vi.mocked(api.fetchStudentProfile).mockReset()
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>)
  })

  it("shows an error when there is no token in the URL", async () => {
    render(<VerifyEmailPage />)
    expect(await screen.findByText("Не удалось подтвердить")).toBeInTheDocument()
    expect(screen.getByText("Токен не найден в ссылке")).toBeInTheDocument()
  })

  it("shows the loading state before the verification call resolves", () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.verifyEmail).mockReturnValue(new Promise(() => {}))
    render(<VerifyEmailPage />)
    expect(screen.getByText("Подтверждаем email...")).toBeInTheDocument()
  })

  it("stores tokens and redirects a new (not-yet-onboarded) student to onboarding", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.verifyEmail).mockResolvedValue({ access: "acc", refresh: "ref", role: "student" })
    vi.mocked(api.fetchStudentProfile).mockResolvedValue({ full_name: "" } as never)

    render(<VerifyEmailPage />)

    await screen.findByText("Email подтверждён")
    expect(localStorage.getItem("access_token")).toBe("acc")
    expect(localStorage.getItem("refresh_token")).toBe("ref")
    expect(localStorage.getItem("role")).toBe("student")
    expect(replace).toHaveBeenCalledWith("/onboarding/student")
  })

  it("redirects an already-onboarded mentor straight to their dashboard", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.verifyEmail).mockResolvedValue({ access: "acc", refresh: "ref", role: "mentor" })
    vi.mocked(api.fetchMentorProfile).mockResolvedValue({ full_name: "Aigerim" } as never)

    render(<VerifyEmailPage />)

    await screen.findByText("Email подтверждён")
    expect(replace).toHaveBeenCalledWith("/mentor/dashboard")
  })

  it("falls back to onboarding when the profile fetch fails", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=abc") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.verifyEmail).mockResolvedValue({ access: "acc", refresh: "ref", role: "mentor" })
    vi.mocked(api.fetchMentorProfile).mockRejectedValue(new Error("not found"))

    render(<VerifyEmailPage />)

    await screen.findByText("Email подтверждён")
    expect(replace).toHaveBeenCalledWith("/onboarding/mentor/identity")
  })

  it("shows an error state with the message when verification fails", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("token=expired") as ReturnType<typeof useSearchParams>,
    )
    vi.mocked(api.verifyEmail).mockRejectedValue(new Error("Ссылка устарела"))

    render(<VerifyEmailPage />)

    expect(await screen.findByText("Не удалось подтвердить")).toBeInTheDocument()
    expect(screen.getByText("Ссылка устарела")).toBeInTheDocument()
  })
})
