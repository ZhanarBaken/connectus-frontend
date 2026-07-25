import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRouter } from "@/i18n/navigation"
import BecomeMentorPage from "./page"

describe("BecomeMentorPage", () => {
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

  it("renders the hero heading and primary CTA", () => {
    render(<BecomeMentorPage />)
    expect(screen.getByText(/Помогай абитуриентам\./)).toBeInTheDocument()
    const ctas = screen.getAllByRole("link", { name: /Стать ментором/ })
    expect(ctas.length).toBeGreaterThan(0)
    for (const cta of ctas) {
      expect(cta).toHaveAttribute("href", "/auth/register")
    }
  })

  it("links the login CTA to the login page", () => {
    render(<BecomeMentorPage />)
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/auth/login")
  })

  it("does not redirect a logged-out visitor away from the page", () => {
    render(<BecomeMentorPage />)
    expect(replace).not.toHaveBeenCalled()
  })

  it("redirects an already-logged-in mentor straight to their dashboard", () => {
    localStorage.setItem("role", "mentor")
    localStorage.setItem("access_token", "tok")
    render(<BecomeMentorPage />)
    expect(replace).toHaveBeenCalledWith("/mentor/dashboard")
  })

  it("renders the FAQ questions", () => {
    render(<BecomeMentorPage />)
    expect(screen.getByText("Кто может стать ментором?")).toBeInTheDocument()
    expect(screen.getByText("Какая комиссия платформы?")).toBeInTheDocument()
  })
})
