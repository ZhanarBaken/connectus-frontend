import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("./api", () => ({
  authFetch: vi.fn(),
}))

import { authFetch } from "./api"
import {
  fetchMentorReviews,
  fetchAllReviews,
  createReview,
  replyToReview,
  hasReviewForOrder,
  type Review,
} from "./reviews"

const mockedAuthFetch = vi.mocked(authFetch)

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

const sampleReview: Review = {
  id: 1,
  mentor: 10,
  order: 100,
  rating: 5,
  text: "Great mentor",
  mentor_reply: null,
  mentor_reply_at: null,
  student_full_name: "Aigerim",
  created_at: "2026-01-01T00:00:00Z",
}

beforeEach(() => {
  mockedAuthFetch.mockReset()
})

describe("fetchMentorReviews", () => {
  it("returns data.results when present", async () => {
    mockedAuthFetch.mockResolvedValue(jsonResponse({ results: [sampleReview] }))
    const reviews = await fetchMentorReviews(10)
    expect(reviews).toEqual([sampleReview])
    expect(mockedAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining("/reviews/?mentor=10")
    )
  })

  it("falls back to the raw array when data.results is absent", async () => {
    mockedAuthFetch.mockResolvedValue(jsonResponse([sampleReview]))
    const reviews = await fetchMentorReviews(10)
    expect(reviews).toEqual([sampleReview])
  })

  it("returns an empty array when the response is not ok", async () => {
    mockedAuthFetch.mockResolvedValue(jsonResponse({}, false))
    const reviews = await fetchMentorReviews(10)
    expect(reviews).toEqual([])
  })
})

describe("fetchAllReviews", () => {
  it("returns data.results when present", async () => {
    mockedAuthFetch.mockResolvedValue(jsonResponse({ results: [sampleReview] }))
    const reviews = await fetchAllReviews()
    expect(reviews).toEqual([sampleReview])
  })

  it("returns an empty array on failure", async () => {
    mockedAuthFetch.mockResolvedValue(jsonResponse({}, false))
    const reviews = await fetchAllReviews()
    expect(reviews).toEqual([])
  })
})

describe("createReview", () => {
  it("POSTs order/rating/text and returns the created review", async () => {
    mockedAuthFetch.mockResolvedValue(jsonResponse(sampleReview))
    const review = await createReview(100, 5, "Great mentor")
    expect(review).toEqual(sampleReview)
    const [, init] = mockedAuthFetch.mock.calls[0]
    expect(init?.method).toBe("POST")
    expect(JSON.parse(init?.body as string)).toEqual({
      order: 100,
      rating: 5,
      text: "Great mentor",
    })
  })

  it("throws with the backend detail message on failure", async () => {
    mockedAuthFetch.mockResolvedValue(
      jsonResponse({ detail: "Order already reviewed" }, false)
    )
    await expect(createReview(100, 5, "text")).rejects.toThrow("Order already reviewed")
  })

  it("throws with the first order-field error when detail is absent", async () => {
    mockedAuthFetch.mockResolvedValue(
      jsonResponse({ order: ["Order must be completed first"] }, false)
    )
    await expect(createReview(100, 5, "text")).rejects.toThrow(
      "Order must be completed first"
    )
  })

  it("throws with an empty message when the error body is unparsable — callers must supply their own translated fallback", async () => {
    mockedAuthFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response)
    await expect(createReview(100, 5, "text")).rejects.toThrow("")
  })
})

describe("replyToReview", () => {
  it("PATCHes mentor_reply and returns the updated review", async () => {
    const replied = { ...sampleReview, mentor_reply: "Thanks!" }
    mockedAuthFetch.mockResolvedValue(jsonResponse(replied))
    const review = await replyToReview(1, "Thanks!")
    expect(review).toEqual(replied)
    const [url, init] = mockedAuthFetch.mock.calls[0]
    expect(url).toContain("/reviews/1/reply/")
    expect(init?.method).toBe("PATCH")
    expect(JSON.parse(init?.body as string)).toEqual({ mentor_reply: "Thanks!" })
  })

  it("throws with the backend detail message on failure", async () => {
    mockedAuthFetch.mockResolvedValue(jsonResponse({ detail: "Not your review" }, false))
    await expect(replyToReview(1, "Thanks!")).rejects.toThrow("Not your review")
  })

  it("throws with an empty message when detail is absent — callers must supply their own translated fallback", async () => {
    mockedAuthFetch.mockResolvedValue(jsonResponse({}, false))
    await expect(replyToReview(1, "Thanks!")).rejects.toThrow("")
  })
})

describe("hasReviewForOrder", () => {
  it("returns true when a review exists for the order", async () => {
    mockedAuthFetch.mockResolvedValue(jsonResponse({ results: [sampleReview] }))
    expect(await hasReviewForOrder(100)).toBe(true)
  })

  it("returns false when no review matches the order", async () => {
    mockedAuthFetch.mockResolvedValue(jsonResponse({ results: [sampleReview] }))
    expect(await hasReviewForOrder(999)).toBe(false)
  })

  it("returns false when the response is not ok", async () => {
    mockedAuthFetch.mockResolvedValue(jsonResponse({}, false))
    expect(await hasReviewForOrder(100)).toBe(false)
  })
})
