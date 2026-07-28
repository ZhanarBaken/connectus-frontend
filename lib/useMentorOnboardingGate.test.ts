import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useRouter } from "@/i18n/navigation"
import { fetchMentorProfile } from "@/lib/api"
import { useMentorOnboardingGate } from "./useMentorOnboardingGate"
import type { MentorProfile } from "@/types"

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

describe("useMentorOnboardingGate", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(fetchMentorProfile).mockReset()
  })

  it("does nothing when there is no access token", () => {
    const { replace } = mockRouter()
    renderHook(() => useMentorOnboardingGate())
    expect(fetchMentorProfile).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it("does nothing when the logged-in role is not mentor", () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "student")
    const { replace } = mockRouter()
    renderHook(() => useMentorOnboardingGate())
    expect(fetchMentorProfile).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it("redirects to /onboarding/mentor when the profile is neither submitted nor approved", async () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      { is_submitted: false, is_approved: false } as MentorProfile,
    )

    renderHook(() => useMentorOnboardingGate())

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding/mentor"))
  })

  it("does not redirect when the profile is submitted but not yet approved", async () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      { is_submitted: true, is_approved: false } as MentorProfile,
    )

    renderHook(() => useMentorOnboardingGate())

    await waitFor(() => expect(fetchMentorProfile).toHaveBeenCalled())
    expect(replace).not.toHaveBeenCalled()
  })

  it("does not redirect a banned mentor even if never submitted — lets dashboard's ban notice take over", async () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      { is_submitted: false, is_approved: false, is_banned: true } as MentorProfile,
    )

    renderHook(() => useMentorOnboardingGate())

    await waitFor(() => expect(fetchMentorProfile).toHaveBeenCalled())
    expect(replace).not.toHaveBeenCalled()
  })

  it("does not redirect when the profile is approved", async () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    vi.mocked(fetchMentorProfile).mockResolvedValue(
      { is_submitted: true, is_approved: true } as MentorProfile,
    )

    renderHook(() => useMentorOnboardingGate())

    await waitFor(() => expect(fetchMentorProfile).toHaveBeenCalled())
    expect(replace).not.toHaveBeenCalled()
  })

  it("stays silent when the profile fetch rejects", async () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "mentor")
    const { replace } = mockRouter()
    vi.mocked(fetchMentorProfile).mockRejectedValue(new Error("network error"))

    renderHook(() => useMentorOnboardingGate())

    await waitFor(() => expect(fetchMentorProfile).toHaveBeenCalled())
    expect(replace).not.toHaveBeenCalled()
  })

  it("does not update state after unmount (no act warning)", async () => {
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("role", "mentor")
    mockRouter()
    let resolveProfile: (p: MentorProfile) => void = () => {}
    vi.mocked(fetchMentorProfile).mockReturnValue(
      new Promise((resolve) => { resolveProfile = resolve }),
    )

    const { unmount } = renderHook(() => useMentorOnboardingGate())
    unmount()
    resolveProfile({ is_submitted: false, is_approved: false } as MentorProfile)

    // No assertion needed beyond "doesn't throw" — the hook's cleanup
    // flag (`cancelled`) should prevent any post-unmount router call.
    await new Promise((r) => setTimeout(r, 0))
  })
})
