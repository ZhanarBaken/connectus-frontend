import { render, screen } from "@testing-library/react"
import { describe, it, expect, beforeEach } from "vitest"
import BecomeMentorPage from "./page"

describe("BecomeMentorPage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("renders the hero heading and primary CTA", () => {
    render(<BecomeMentorPage />)
    expect(screen.getByText(/Помогай абитуриентам\./)).toBeInTheDocument()
    const ctas = screen.getAllByRole("link", { name: /Стать ментором/ })
    expect(ctas.length).toBeGreaterThan(0)
    for (const cta of ctas) {
      expect(cta).toHaveAttribute("href", "/auth/register?role=mentor")
    }
  })

  it("links the login CTA to the login page", () => {
    render(<BecomeMentorPage />)
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/auth/login")
  })

  it("renders the FAQ questions", () => {
    render(<BecomeMentorPage />)
    expect(screen.getByText("Кто может стать ментором?")).toBeInTheDocument()
    expect(screen.getByText("Какая комиссия платформы?")).toBeInTheDocument()
  })
})
