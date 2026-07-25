import { describe, it, expect, vi, beforeEach } from "vitest"
import { render } from "@testing-library/react"
import { useRouter } from "next/navigation"
import MentorRedirect from "@/components/MentorRedirect"

describe("MentorRedirect", () => {
  const replace = vi.fn()

  beforeEach(() => {
    localStorage.clear()
    replace.mockClear()
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
    const { container } = render(<MentorRedirect />)
    expect(container).toBeEmptyDOMElement()
  })

  it("does not redirect when there is no role or token", () => {
    render(<MentorRedirect />)
    expect(replace).not.toHaveBeenCalled()
  })

  it("does not redirect when role=mentor but no access token", () => {
    localStorage.setItem("role", "mentor")
    render(<MentorRedirect />)
    expect(replace).not.toHaveBeenCalled()
  })

  it("does not redirect when there is a token but role is student", () => {
    localStorage.setItem("role", "student")
    localStorage.setItem("access_token", "tok")
    render(<MentorRedirect />)
    expect(replace).not.toHaveBeenCalled()
  })

  it("redirects to /mentor/dashboard when role=mentor and a token is present", () => {
    localStorage.setItem("role", "mentor")
    localStorage.setItem("access_token", "tok")
    render(<MentorRedirect />)
    expect(replace).toHaveBeenCalledWith("/mentor/dashboard")
  })
})
