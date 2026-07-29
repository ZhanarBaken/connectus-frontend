import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createReview, hasReviewForOrder } from "@/lib/reviews"
import ReviewForm from "@/components/ReviewForm"

vi.mock("@/lib/reviews")

describe("ReviewForm", () => {
  beforeEach(() => {
    vi.mocked(createReview).mockReset()
    vi.mocked(hasReviewForOrder).mockReset()
  })

  it("shows a loading spinner while checking whether a review already exists", () => {
    vi.mocked(hasReviewForOrder).mockReturnValue(new Promise(() => {}))
    const { container } = render(
      <ReviewForm orderId={1} mentorId={1} mentorName="Mentor" authorName="Student" />,
    )
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("shows the thank-you state immediately when a review already exists for this order", async () => {
    vi.mocked(hasReviewForOrder).mockResolvedValue(true)
    render(<ReviewForm orderId={1} mentorId={1} mentorName="Mentor" authorName="Student" />)

    await waitFor(() => {
      expect(screen.getByText("Спасибо за отзыв!")).toBeInTheDocument()
    })
    expect(screen.queryByRole("button", { name: /Опубликовать отзыв/ })).not.toBeInTheDocument()
  })

  it("shows a retryable error instead of spinning forever when the initial check fails", async () => {
    // Regression: hasReviewForOrder().then(...) used to have no .catch at
    // all — a rejection left the component stuck in the loading state
    // forever, with zero feedback.
    vi.mocked(hasReviewForOrder).mockRejectedValueOnce(new Error("network"))
    const user = userEvent.setup()
    render(<ReviewForm orderId={1} mentorId={1} mentorName="Mentor" authorName="Student" />)

    await waitFor(() => {
      expect(screen.getByText("Не удалось проверить, оставлен ли уже отзыв")).toBeInTheDocument()
    })

    vi.mocked(hasReviewForOrder).mockResolvedValueOnce(false)
    await user.click(screen.getByRole("button", { name: "Повторить" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Опубликовать отзыв/ })).toBeInTheDocument()
    })
  })

  it("renders the form once loading resolves with no existing review", async () => {
    vi.mocked(hasReviewForOrder).mockResolvedValue(false)
    render(<ReviewForm orderId={1} mentorId={1} mentorName="Mentor" authorName="Student" />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Опубликовать отзыв/ })).toBeInTheDocument()
    })
  })

  it("defaults the rating to 5 stars (all five highlighted)", async () => {
    vi.mocked(hasReviewForOrder).mockResolvedValue(false)
    render(<ReviewForm orderId={1} mentorId={1} mentorName="Mentor" authorName="Student" />)

    await waitFor(() => screen.getByLabelText("5 звёзд"))
    for (let s = 1; s <= 5; s++) {
      expect(screen.getByLabelText(`${s} звёзд`)).toHaveClass("text-yellow-400")
    }
  })

  it("lets the user change the star rating", async () => {
    vi.mocked(hasReviewForOrder).mockResolvedValue(false)
    const user = userEvent.setup()
    render(<ReviewForm orderId={1} mentorId={1} mentorName="Mentor" authorName="Student" />)

    await waitFor(() => screen.getByLabelText("3 звёзд"))
    await user.click(screen.getByLabelText("3 звёзд"))

    expect(screen.getByLabelText("3 звёзд")).toHaveClass("text-yellow-400")
    expect(screen.getByLabelText("4 звёзд")).not.toHaveClass("text-yellow-400")
  })

  it("rejects a submission with fewer than 10 characters", async () => {
    vi.mocked(hasReviewForOrder).mockResolvedValue(false)
    const user = userEvent.setup()
    render(<ReviewForm orderId={5} mentorId={1} mentorName="Mentor" authorName="Student" />)

    await waitFor(() => screen.getByRole("button", { name: /Опубликовать отзыв/ }))
    const textarea = screen.getByPlaceholderText(/Например: помог с эссе/)
    await user.type(textarea, "too short")
    await user.click(screen.getByRole("button", { name: /Опубликовать отзыв/ }))

    expect(screen.getByText("Минимум 10 символов")).toBeInTheDocument()
    expect(createReview).not.toHaveBeenCalled()
  })

  it("submits a valid review and shows the thank-you state", async () => {
    vi.mocked(hasReviewForOrder).mockResolvedValue(false)
    vi.mocked(createReview).mockResolvedValue({
      id: 1,
      mentor: 1,
      order: 5,
      rating: 5,
      text: "Really helpful sessions overall",
      mentor_reply: null,
      mentor_reply_at: null,
      student_full_name: "Student",
      created_at: "2026-01-01T00:00:00Z",
    })
    const onSubmitted = vi.fn()
    const user = userEvent.setup()
    render(
      <ReviewForm
        orderId={5}
        mentorId={1}
        mentorName="Mentor"
        authorName="Student"
        onSubmitted={onSubmitted}
      />,
    )

    await waitFor(() => screen.getByRole("button", { name: /Опубликовать отзыв/ }))
    const textarea = screen.getByPlaceholderText(/Например: помог с эссе/)
    await user.type(textarea, "Really helpful sessions overall")
    await user.click(screen.getByRole("button", { name: /Опубликовать отзыв/ }))

    await waitFor(() => {
      expect(createReview).toHaveBeenCalledWith(5, 5, "Really helpful sessions overall")
    })
    await waitFor(() => {
      expect(screen.getByText("Спасибо за отзыв!")).toBeInTheDocument()
    })
    expect(onSubmitted).toHaveBeenCalledTimes(1)
  })

  it("shows the server error message and stays on the form when submission fails", async () => {
    vi.mocked(hasReviewForOrder).mockResolvedValue(false)
    vi.mocked(createReview).mockRejectedValue(new Error("Не удалось оставить отзыв"))
    const user = userEvent.setup()
    render(<ReviewForm orderId={5} mentorId={1} mentorName="Mentor" authorName="Student" />)

    await waitFor(() => screen.getByRole("button", { name: /Опубликовать отзыв/ }))
    const textarea = screen.getByPlaceholderText(/Например: помог с эссе/)
    await user.type(textarea, "Really helpful sessions overall")
    await user.click(screen.getByRole("button", { name: /Опубликовать отзыв/ }))

    await waitFor(() => {
      expect(screen.getByText("Не удалось оставить отзыв")).toBeInTheDocument()
    })
    expect(screen.queryByText("Спасибо за отзыв!")).not.toBeInTheDocument()
  })
})
