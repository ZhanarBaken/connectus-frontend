import { authFetch } from "./api"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export interface Review {
  id: number
  mentor: number
  order: number
  rating: number
  text: string
  mentor_reply: string | null
  mentor_reply_at: string | null
  student_full_name: string
  created_at: string
}

export async function fetchMentorReviews(mentorId: number): Promise<Review[]> {
  const res = await authFetch(`${BASE_URL}/reviews/?mentor=${mentorId}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.results ?? data
}

export async function fetchAllReviews(): Promise<Review[]> {
  const res = await authFetch(`${BASE_URL}/reviews/`)
  if (!res.ok) return []
  const data = await res.json()
  return data.results ?? data
}

export async function createReview(orderId: number, rating: number, text: string): Promise<Review> {
  const res = await authFetch(`${BASE_URL}/reviews/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order: orderId, rating, text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    // Empty fallback on purpose — forward backend detail when given,
    // otherwise let the caller show its own translated message.
    const detail = err.detail || (err.order && Array.isArray(err.order) ? err.order[0] : null) || ""
    throw new Error(detail)
  }
  return res.json()
}

export async function replyToReview(reviewId: number, mentorReply: string): Promise<Review> {
  const res = await authFetch(`${BASE_URL}/reviews/${reviewId}/reply/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mentor_reply: mentorReply }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    // Empty fallback on purpose — forward backend detail when given,
    // otherwise let the caller show its own translated message.
    throw new Error(err.detail || "")
  }
  return res.json()
}

export async function hasReviewForOrder(orderId: number): Promise<boolean> {
  const res = await authFetch(`${BASE_URL}/reviews/`)
  if (!res.ok) return false
  const data = await res.json()
  const reviews: Review[] = data.results ?? data
  return reviews.some((r) => r.order === orderId)
}
