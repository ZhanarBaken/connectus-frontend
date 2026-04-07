// ─── Reviews (localStorage stopgap) ─────────────────────────────────────────
// TODO: replace with real API calls when backend reviews endpoint is ready.
// All public functions are SSR-safe — they return [] / null on server.

export interface Review {
  id: string
  orderId: number
  mentorId: number
  mentorName: string
  target: "platform" | "mentor"
  rating: number
  text: string
  authorName: string
  createdAt: string
}

const STORAGE_KEY = "reviews"

function readAll(): Review[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(reviews: Review[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
}

export function getPlatformReviews(): Review[] {
  return readAll()
    .filter((r) => r.target === "platform")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getMentorReviews(mentorId: number): Review[] {
  return readAll()
    .filter((r) => r.target === "mentor" && r.mentorId === mentorId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getMentorReviewCount(mentorId: number): number {
  return readAll().filter((r) => r.target === "mentor" && r.mentorId === mentorId).length
}

export function getMentorAverageRating(mentorId: number): number | null {
  const reviews = readAll().filter((r) => r.target === "mentor" && r.mentorId === mentorId)
  if (reviews.length === 0) return null
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
  return sum / reviews.length
}

export function hasReviewForOrder(orderId: number, target: "platform" | "mentor"): boolean {
  return readAll().some((r) => r.orderId === orderId && r.target === target)
}

export function addReview(input: Omit<Review, "id" | "createdAt">): Review {
  const review: Review = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  const all = readAll()
  all.push(review)
  writeAll(all)
  return review
}
