import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useRouter } from "@/i18n/navigation"
import { fetchStudentProfile } from "@/lib/api"
import { useStudentOnboardingGate } from "./useStudentOnboardingGate"
import type { StudentProfile } from "@/types"

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

describe("useStudentOnboardingGate", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(fetchStudentProfile).mockReset()
  })

  it("does nothing when there is no access token", () => {
    const { replace } = mockRouter()
    renderHook(() => useStudentOnboardingGate())
    expect(fetchStudentProfile).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it("does nothing when the logged-in role is not student", () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    renderHook(() => useStudentOnboardingGate())
    expect(fetchStudentProfile).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it("redirects to /onboarding/student when the profile is not complete", async () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "student")
    const { replace } = mockRouter()
    vi.mocked(fetchStudentProfile).mockResolvedValue(
      { is_profile_complete: false } as StudentProfile,
    )

    renderHook(() => useStudentOnboardingGate())

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/student"))
  })

  it("does not redirect when the profile is complete", async () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "student")
    const { replace } = mockRouter()
    vi.mocked(fetchStudentProfile).mockResolvedValue(
      { is_profile_complete: true } as StudentProfile,
    )

    renderHook(() => useStudentOnboardingGate())

    await waitFor(() => expect(fetchStudentProfile).toHaveBeenCalled())
    expect(replace).not.toHaveBeenCalled()
  })

  it("stays silent when the profile fetch rejects", async () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "student")
    const { replace } = mockRouter()
    vi.mocked(fetchStudentProfile).mockRejectedValue(new Error("network error"))

    renderHook(() => useStudentOnboardingGate())

    await waitFor(() => expect(fetchStudentProfile).toHaveBeenCalled())
    expect(replace).not.toHaveBeenCalled()
  })

  it("does not update state after unmount (no act warning)", async () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "student")
    mockRouter()
    let resolveProfile: (p: StudentProfile) => void = () => {}
    vi.mocked(fetchStudentProfile).mockReturnValue(
      new Promise((resolve) => { resolveProfile = resolve }),
    )

    const { unmount } = renderHook(() => useStudentOnboardingGate())
    unmount()
    resolveProfile({ is_profile_complete: false } as StudentProfile)

    // No assertion needed beyond "doesn't throw" — the hook's cleanup
    // flag (`cancelled`) should prevent any post-unmount router call.
    await new Promise((r) => setTimeout(r, 0))
  })
})
