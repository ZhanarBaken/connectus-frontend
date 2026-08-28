import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { usePathname, useRouter } from "@/i18n/navigation"
import { fetchMentorProfile } from "@/lib/api"
import MentorAreaGuard from "@/components/MentorAreaGuard"

vi.mock("@/lib/api")

function setPathname(path: string) {
  vi.mocked(usePathname).mockReturnValue(path)
}

describe("MentorAreaGuard", () => {
  const replace = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    replace.mockClear()
    vi.mocked(fetchMentorProfile).mockReset()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
  })

  it("renders nothing", () => {
    setPathname("/")
    const { container } = render(<MentorAreaGuard />)
    expect(container).toBeEmptyDOMElement()
  })

  it("is a no-op for a logged-out visitor", () => {
    setPathname("/mentors")
    render(<MentorAreaGuard />)
    expect(replace).not.toHaveBeenCalled()
  })

  it("is a no-op for a student", () => {
    localStorage.setItem("role", "student")
    localStorage.setItem("access_token", "tok")
    setPathname("/mentors")
    render(<MentorAreaGuard />)
    expect(replace).not.toHaveBeenCalled()
  })

  it("is a no-op for role=mentor with no token (stale localStorage)", () => {
    localStorage.setItem("role", "mentor")
    setPathname("/mentors")
    render(<MentorAreaGuard />)
    expect(replace).not.toHaveBeenCalled()
  })

  describe("logged in as mentor", () => {
    beforeEach(() => {
      localStorage.setItem("role", "mentor")
      localStorage.setItem("access_token", "tok")
    })

    it.each([
      "/",
      "/mentors",
      "/become-mentor",
      "/students/profile",
      "/onboarding/student",
    ])("blocks %s and redirects to the dashboard", (path) => {
      setPathname(path)
      render(<MentorAreaGuard />)
      expect(replace).toHaveBeenCalledWith("/mentor/dashboard")
    })

    it.each([
      "/mentor/dashboard",
      "/mentor/clients",
      "/mentor/clients/7",
      "/mentor/earnings",
      "/mentor/guide",
      "/mentors/profile",
      "/mentors/schedule",
      "/mentors/services",
      "/orders",
      "/orders/42",
      "/messages",
      "/messages/9",
      "/settings",
      "/onboarding/mentor",
      "/onboarding/mentor/identity",
      "/terms",
      "/privacy",
      "/platform-rules",
      "/auth/login",
    ])("allows %s", (path) => {
      setPathname(path)
      render(<MentorAreaGuard />)
      expect(replace).not.toHaveBeenCalled()
    })

    it("allows /mentors/<id> when it is the mentor's own profile", async () => {
      setPathname("/mentors/5")
      vi.mocked(fetchMentorProfile).mockResolvedValue({ id: 5 } as Awaited<ReturnType<typeof fetchMentorProfile>>)
      render(<MentorAreaGuard />)

      await waitFor(() => expect(fetchMentorProfile).toHaveBeenCalled())
      expect(replace).not.toHaveBeenCalled()
    })

    it("blocks /mentors/<id> when it belongs to a different mentor", async () => {
      setPathname("/mentors/5")
      vi.mocked(fetchMentorProfile).mockResolvedValue({ id: 99 } as Awaited<ReturnType<typeof fetchMentorProfile>>)
      render(<MentorAreaGuard />)

      await waitFor(() => expect(replace).toHaveBeenCalledWith("/mentor/dashboard"))
    })

    it("fails closed and redirects if the own-profile fetch errors", async () => {
      setPathname("/mentors/5")
      vi.mocked(fetchMentorProfile).mockRejectedValue(new Error("network error"))
      render(<MentorAreaGuard />)

      await waitFor(() => expect(replace).toHaveBeenCalledWith("/mentor/dashboard"))
    })
  })
})
