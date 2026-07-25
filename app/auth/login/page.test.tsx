import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { useSearchParams } from "next/navigation"
import LoginPage from "./page"

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>)
  })

  it("does not show the session-expired notice by default", () => {
    render(<LoginPage />)
    expect(screen.queryByText(/Сессия истекла/)).not.toBeInTheDocument()
  })

  it("shows the session-expired notice when redirected with session_expired=1", () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("session_expired=1") as ReturnType<typeof useSearchParams>,
    )
    render(<LoginPage />)
    expect(screen.getByText(/Сессия истекла/)).toBeInTheDocument()
  })

  it("renders the email/password form", () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("••••••••••••")).toBeInTheDocument()
  })
})
