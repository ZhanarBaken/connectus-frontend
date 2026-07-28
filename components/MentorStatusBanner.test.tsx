import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { fetchMentorProfile } from "@/lib/api"
import MentorStatusBanner from "@/components/MentorStatusBanner"

vi.mock("@/lib/api")

describe("MentorStatusBanner", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(fetchMentorProfile).mockReset()
  })

  describe("with explicit props (no fetch)", () => {
    it("renders nothing when approved", () => {
      const { container } = render(<MentorStatusBanner isApproved />)
      expect(container).toBeEmptyDOMElement()
      expect(fetchMentorProfile).not.toHaveBeenCalled()
    })

    it("renders the indigo 'under review' banner when not approved", () => {
      render(<MentorStatusBanner isApproved={false} />)
      expect(screen.getByText(/Профиль на проверке/)).toBeInTheDocument()
      expect(fetchMentorProfile).not.toHaveBeenCalled()
    })
  })

  describe("without props (self-fetching)", () => {
    it("renders nothing when there is no access token", () => {
      const { container } = render(<MentorStatusBanner />)
      expect(container).toBeEmptyDOMElement()
      expect(fetchMentorProfile).not.toHaveBeenCalled()
    })

    it("renders nothing while the fetch is in flight, then shows the banner once resolved", async () => {
      localStorage.setItem("access_token", "tok")
      vi.mocked(fetchMentorProfile).mockResolvedValue({
        is_approved: false,
      } as Awaited<ReturnType<typeof fetchMentorProfile>>)

      render(<MentorStatusBanner />)

      await waitFor(() => {
        expect(screen.getByText(/Профиль на проверке/)).toBeInTheDocument()
      })
    })

    it("stays silent (no banner) when the fetch rejects — e.g. a non-mentor 403", async () => {
      localStorage.setItem("access_token", "tok")
      vi.mocked(fetchMentorProfile).mockRejectedValue(new Error("403"))

      const { container } = render(<MentorStatusBanner />)

      await waitFor(() => {
        expect(fetchMentorProfile).toHaveBeenCalled()
      })
      expect(container).toBeEmptyDOMElement()
    })

    it("renders nothing once the fetch resolves approved", async () => {
      localStorage.setItem("access_token", "tok")
      vi.mocked(fetchMentorProfile).mockResolvedValue({
        is_approved: true,
      } as Awaited<ReturnType<typeof fetchMentorProfile>>)

      const { container } = render(<MentorStatusBanner />)

      await waitFor(() => {
        expect(fetchMentorProfile).toHaveBeenCalled()
      })
      expect(container).toBeEmptyDOMElement()
    })
  })
})
