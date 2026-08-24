import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"
import { describe, it, expect, vi, beforeEach } from "vitest"
import CRMShell from "./CRMShell"

describe("CRMShell", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("redirects non-admins away and never renders the sidebar", async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    localStorage.setItem("role", "mentor")

    render(<CRMShell>content</CRMShell>)

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"))
    expect(screen.queryByText("Выйти")).not.toBeInTheDocument()
  })

  it("clears the session and redirects home when 'Выйти' is clicked", async () => {
    const replace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
    localStorage.setItem("role", "admin")
    localStorage.setItem("access_token", "tok")
    localStorage.setItem("refresh_token", "reftok")
    localStorage.setItem("support_chat_session_id", "acct-session")

    render(<CRMShell>content</CRMShell>)

    const logoutButton = await screen.findByText("Выйти")
    await userEvent.click(logoutButton)

    expect(localStorage.getItem("access_token")).toBeNull()
    expect(localStorage.getItem("refresh_token")).toBeNull()
    expect(localStorage.getItem("role")).toBeNull()
    expect(localStorage.getItem("support_chat_session_id")).toBeNull()
    expect(replace).toHaveBeenCalledWith("/")
  })
})
