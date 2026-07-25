import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { fetchAllReviews, type Review } from "@/lib/reviews"
import PlatformReviews from "@/components/PlatformReviews"

vi.mock("@/lib/reviews")

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 1,
    mentor: 1,
    order: 1,
    rating: 5,
    text: "Great mentor, helped a lot!",
    mentor_reply: null,
    mentor_reply_at: null,
    student_full_name: "Aigerim",
    created_at: "2026-01-15T00:00:00Z",
    ...overrides,
  }
}

describe("PlatformReviews", () => {
  beforeEach(() => {
    vi.mocked(fetchAllReviews).mockReset()
  })

  it("renders nothing while the initial fetch is in flight", () => {
    vi.mocked(fetchAllReviews).mockReturnValue(new Promise(() => {}))
    const { container } = render(<PlatformReviews />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the empty state when there are no reviews", async () => {
    vi.mocked(fetchAllReviews).mockResolvedValue([])
    render(<PlatformReviews />)
    await waitFor(() => {
      expect(screen.getByText("Отзывов пока нет")).toBeInTheDocument()
    })
  })

  it("renders a populated list of reviews", async () => {
    vi.mocked(fetchAllReviews).mockResolvedValue([
      makeReview({ id: 1, student_full_name: "Aigerim", text: "Amazing help", rating: 5 }),
      makeReview({ id: 2, student_full_name: "Yerlan", text: "Very useful", rating: 3 }),
    ])
    render(<PlatformReviews />)

    await waitFor(() => {
      expect(screen.getByText(/Amazing help/)).toBeInTheDocument()
    })
    expect(screen.getByText("Aigerim")).toBeInTheDocument()
    expect(screen.getByText(/Very useful/)).toBeInTheDocument()
    expect(screen.getByText("Yerlan")).toBeInTheDocument()
  })

  it("caps the rendered list at 6 reviews", async () => {
    const reviews = Array.from({ length: 9 }, (_, i) =>
      makeReview({ id: i + 1, student_full_name: `Student ${i + 1}` }),
    )
    vi.mocked(fetchAllReviews).mockResolvedValue(reviews)
    render(<PlatformReviews />)

    await waitFor(() => {
      expect(screen.getByText("Student 1")).toBeInTheDocument()
    })
    expect(screen.getByText("Student 6")).toBeInTheDocument()
    expect(screen.queryByText("Student 7")).not.toBeInTheDocument()
  })

  it("shows the empty state if the fetch rejects (fetchAllReviews resolves [] on !res.ok, but is defensive here too)", async () => {
    vi.mocked(fetchAllReviews).mockResolvedValue([])
    render(<PlatformReviews />)
    await waitFor(() => {
      expect(screen.getByText("Отзывов пока нет")).toBeInTheDocument()
    })
  })
})
