// ─── API client ──────────────────────────────────────────────────────────────
// Switch USE_MOCKS to false when backend is ready

import { MOCK_MENTORS, getMockMentor, getMockServices, MOCK_ORDERS, MOCK_STUDENT_PROFILE } from "./mocks"
import { Dispute, Mentor, MentorCard, MentorProfile, Order, StudentProfile } from "@/types"

const USE_MOCKS = false
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

// ─── Mentors ─────────────────────────────────────────────────────────────────

export async function fetchMentors(): Promise<MentorCard[]> {
  if (USE_MOCKS) return MOCK_MENTORS

  const res = await fetch(`${BASE_URL}/mentors/`)
  if (!res.ok) throw new Error("Failed to fetch mentors")
  return res.json()
}

export async function fetchMentor(id: number): Promise<Mentor> {
  if (USE_MOCKS) {
    const card = getMockMentor(id)
    if (!card) throw new Error("Mentor not found")
    const services = getMockServices(id)
    return {
      ...card,
      gpa: "",
      exam_results: "",
      linkedin_url: "",
      consultation: null,
      is_public: true,
      services,
    }
  }

  const res = await authFetch(`${BASE_URL}/mentors/${id}/`)
  if (!res.ok) throw new Error("Failed to fetch mentor")
  return res.json()
}

// ─── Auth: current user ───────────────────────────────────────────────────────

export async function fetchMe(token?: string): Promise<import("@/types").User> {
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  } else {
    const stored = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (stored) headers.Authorization = `Bearer ${stored}`
  }
  const res = await fetch(`${BASE_URL}/auth/me/`, { headers })
  if (!res.ok) throw new Error("Failed to fetch user")
  return res.json()
}

// ─── Mentor own profile ───────────────────────────────────────────────────────

export async function fetchMentorProfile(): Promise<MentorProfile> {
  const res = await authFetch(`${BASE_URL}/mentors/profile/me/`)
  if (!res.ok) throw new Error("Failed to fetch mentor profile")
  return res.json()
}

export async function updateMentorProfile(data: Partial<MentorProfile>): Promise<MentorProfile> {
  const res = await authFetch(`${BASE_URL}/mentors/profile/me/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    const first = Object.values(err)[0]
    throw new Error(Array.isArray(first) ? first[0] : String(first))
  }
  return res.json()
}

export async function submitMentorProfile(): Promise<void> {
  const res = await authFetch(`${BASE_URL}/mentors/profile/submit/`, {
    method: "POST",
  })
  if (!res.ok) {
    const err = await res.json()
    // Throw raw JSON so the dashboard can show field-level errors
    throw new Error(JSON.stringify(err))
  }
}

// ─── Mentor services ─────────────────────────────────────────────────────────

export async function fetchMentorServices(): Promise<import("@/types").MentorService[]> {
  const res = await authFetch(`${BASE_URL}/mentors/services/`)
  if (!res.ok) throw new Error("Failed to fetch services")
  const data = await res.json()
  return Array.isArray(data) ? data : data.results
}

export async function createMentorService(data: Partial<import("@/types").MentorService>): Promise<import("@/types").MentorService> {
  const res = await authFetch(`${BASE_URL}/mentors/services/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    const first = Object.values(err)[0]
    throw new Error(Array.isArray(first) ? first[0] : String(first))
  }
  return res.json()
}

export async function updateMentorService(id: number, data: Partial<import("@/types").MentorService>): Promise<import("@/types").MentorService> {
  const res = await authFetch(`${BASE_URL}/mentors/services/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    const first = Object.values(err)[0]
    throw new Error(Array.isArray(first) ? first[0] : String(first))
  }
  return res.json()
}

export async function deleteMentorService(id: number): Promise<void> {
  const res = await authFetch(`${BASE_URL}/mentors/services/${id}/`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("Failed to delete service")
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function fetchOrders(): Promise<Order[]> {
  if (USE_MOCKS) return MOCK_ORDERS

  const res = await authFetch(`${BASE_URL}/orders/`)
  if (!res.ok) throw new Error("Failed to fetch orders")
  const data = await res.json()
  return data.results
}

export async function createOrder(
  mentorServiceId: number,
  scheduledAt?: string,
): Promise<import("@/types").Order> {
  const body: Record<string, unknown> = { mentor_service: mentorServiceId }
  if (scheduledAt) body.scheduled_at = scheduledAt
  const res = await authFetch(`${BASE_URL}/orders/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json()
    const first = Object.values(err)[0]
    throw new Error(Array.isArray(first) ? first[0] : String(first))
  }
  return res.json()
}

export async function fetchOrder(id: number): Promise<Order> {
  const res = await authFetch(`${BASE_URL}/orders/${id}/`)
  if (!res.ok) throw new Error("Failed to fetch order")
  return res.json()
}

export async function cancelOrder(id: number): Promise<Order> {
  const res = await authFetch(`${BASE_URL}/orders/${id}/cancel/`, { method: "POST" })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || "Failed to cancel order")
  }
  return res.json()
}

export async function confirmOrderPayment(id: number): Promise<Order> {
  const res = await authFetch(`${BASE_URL}/orders/${id}/confirm_payment/`, { method: "POST" })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || "Failed to confirm payment")
  }
  return res.json()
}

export async function confirmConsultation(id: number): Promise<Order> {
  const res = await authFetch(`${BASE_URL}/orders/${id}/confirm_consultation/`, { method: "POST" })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || "Failed to confirm consultation")
  }
  return res.json()
}

export async function completeOrder(id: number): Promise<Order> {
  const res = await authFetch(`${BASE_URL}/orders/${id}/complete/`, { method: "POST" })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || "Failed to complete order")
  }
  return res.json()
}

// ─── Order Documents ────────────────────────────────────────────────────────

export async function fetchOrderDocuments(orderId: number): Promise<import("@/types").OrderDocument[]> {
  const res = await authFetch(`${BASE_URL}/orders/${orderId}/documents/`)
  if (!res.ok) return []
  const data = await res.json()
  return data.results ?? data
}

export type OrderDocumentKind = "general" | "payment_receipt"

export async function uploadOrderDocument(
  orderId: number,
  file: File,
  description?: string,
  kind: OrderDocumentKind = "general",
): Promise<import("@/types").OrderDocument> {
  const formData = new FormData()
  formData.append("file", file)
  if (description) formData.append("description", description)
  formData.append("kind", kind)
  const res = await authFetch(`${BASE_URL}/orders/${orderId}/documents/`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось загрузить документ")
  }
  return res.json()
}

export async function deleteOrderDocument(orderId: number, docId: number): Promise<void> {
  const res = await authFetch(`${BASE_URL}/orders/${orderId}/documents/${docId}/`, {
    method: "DELETE",
  })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось удалить документ")
  }
}

// ─── Disputes ───────────────────────────────────────────────────────────────

export async function createDispute(orderId: number, reason: string): Promise<Dispute> {
  const res = await authFetch(`${BASE_URL}/orders/${orderId}/dispute/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const reasonErr = Array.isArray(err.reason) ? err.reason[0] : undefined
    throw new Error(err.detail || reasonErr || "Failed to open dispute")
  }
  return res.json()
}

// ─── Student profile ──────────────────────────────────────────────────────────

export async function fetchStudentProfile(): Promise<StudentProfile> {
  if (USE_MOCKS) {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("student_profile")
      if (saved) return JSON.parse(saved)
    }
    return MOCK_STUDENT_PROFILE
  }

  const res = await authFetch(`${BASE_URL}/students/profile/me/`)
  if (!res.ok) throw new Error("Failed to fetch profile")
  return res.json()
}

export async function updateStudentProfile(data: Partial<StudentProfile>): Promise<StudentProfile> {
  if (USE_MOCKS) {
    const profile = { ...MOCK_STUDENT_PROFILE, ...data }
    if (typeof window !== "undefined") {
      localStorage.setItem("student_profile", JSON.stringify(profile))
    }
    return profile
  }

  const res = await authFetch(`${BASE_URL}/students/profile/me/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to update profile")
  return res.json()
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  if (USE_MOCKS) {
    return { access: "mock_token", refresh: "mock_refresh" }
  }

  const res = await fetch(`${BASE_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    let msg = "Login failed"
    try {
      const data = await res.json()
      const first =
        data.non_field_errors?.[0] ??
        data.detail ??
        Object.values(data)[0]
      if (first) msg = Array.isArray(first) ? first[0] : String(first)
    } catch {
      // ignore parse errors, fall back to default message
    }
    throw new Error(msg)
  }
  return res.json()
}

export async function verifyEmail(token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/verify-email/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.token?.[0] || err.detail || "Не удалось подтвердить email")
  }
}

export async function resendVerification(email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/resend-verification/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.email?.[0] || err.detail || "Не удалось отправить письмо")
  }
}

export async function register(email: string, password: string, role: string, agreedToTerms: boolean) {
  if (USE_MOCKS) {
    return { id: 1, email, role }
  }

  const res = await fetch(`${BASE_URL}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role, agreed_to_terms: agreedToTerms }),
  })
  if (!res.ok) {
    const data = await res.json()
    const first = Object.values(data)[0]
    const msg = Array.isArray(first) ? first[0] : String(first)
    throw new Error(msg)
  }
  return res.json()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToken(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("access_token") ?? ""
}

function getRefreshToken(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("refresh_token") ?? ""
}

function clearAuth() {
  if (typeof window === "undefined") return
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("role")
}

// Single in-flight refresh promise so concurrent 401s share one refresh call.
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  const refresh = getRefreshToken()
  if (!refresh) throw new Error("No refresh token")

  refreshPromise = (async () => {
    const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) {
      clearAuth()
      if (typeof window !== "undefined") window.location.href = "/auth/login"
      throw new Error("Refresh failed")
    }
    const data = await res.json()
    localStorage.setItem("access_token", data.access)
    if (data.refresh) localStorage.setItem("refresh_token", data.refresh)
    return data.access as string
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

/**
 * fetch wrapper that injects Bearer token and transparently retries on 401
 * via refresh token flow.
 */
// ─── Telegram auth ──────────────────────────────────────────────────────────

export async function telegramStart(role: string): Promise<{ token: string; bot_url: string }> {
  const res = await fetch(`${BASE_URL}/auth/telegram/start/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось начать авторизацию через Telegram")
  }
  return res.json()
}

export async function telegramFinalize(token: string): Promise<{ user_id: number; created: boolean; access: string; refresh: string }> {
  const res = await fetch(`${BASE_URL}/auth/telegram/finalize/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось завершить авторизацию через Telegram")
  }
  return res.json()
}

export async function telegramLinkStart(): Promise<{ token: string; bot_url: string }> {
  const res = await authFetch(`${BASE_URL}/auth/telegram/link/start/`, { method: "POST" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось начать привязку Telegram")
  }
  return res.json()
}

export async function telegramLinkFinalize(token: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/auth/telegram/link/finalize/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось завершить привязку Telegram")
  }
}

export async function telegramUnlink(): Promise<void> {
  const res = await authFetch(`${BASE_URL}/auth/telegram/unlink/`, { method: "POST" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || err.non_field_errors?.[0] || "Не удалось отвязать Telegram")
  }
}

// ─── Google auth ────────────────────────────────────────────────────────────

export async function googleAuth(idToken: string, role?: string): Promise<{ access: string; refresh: string; created?: boolean }> {
  const body: Record<string, string> = { id_token: idToken }
  if (role) body.role = role
  const res = await fetch(`${BASE_URL}/auth/google/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (res.status === 409) {
    throw new Error("Этот email уже зарегистрирован. Подтвердите email и войдите через пароль.")
  }
  if (res.status === 503) {
    throw new Error("Google авторизация не настроена на сервере")
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось войти через Google")
  }
  return res.json()
}

export async function googleLink(idToken: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/auth/google/link/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось привязать Google")
  }
}

export async function googleUnlink(): Promise<void> {
  const res = await authFetch(`${BASE_URL}/auth/google/unlink/`, { method: "POST" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || err.non_field_errors?.[0] || "Не удалось отвязать Google")
  }
}

// ─── Email management ───────────────────────────────────────────────────────

export async function setEmail(email: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/auth/email/set/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.email?.[0] || err.detail || "Не удалось установить email")
  }
}

export async function changeEmail(email: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/auth/email/change/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.email?.[0] || err.detail || "Не удалось сменить email")
  }
}

export async function unlinkEmail(): Promise<void> {
  const res = await authFetch(`${BASE_URL}/auth/email/unlink/`, { method: "POST" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || err.non_field_errors?.[0] || "Не удалось отвязать email")
  }
}

export async function setPassword(password: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/auth/password/set/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  })
  if (res.status === 403) {
    // Re-auth required — refresh token and retry
    const newToken = await refreshAccessToken()
    const retry = await fetch(`${BASE_URL}/auth/password/set/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
      },
      body: JSON.stringify({ password }),
    })
    if (!retry.ok) {
      const err = await retry.json().catch(() => ({}))
      throw new Error(err.detail || "Не удалось установить пароль")
    }
    return
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.password?.[0] || err.detail || "Не удалось установить пароль")
  }
}

// ─── Notifications ──────────────────────────────────────────────────────────

export interface NotificationItem {
  id: number
  kind: string
  title: string
  url: string
  payload: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export async function fetchNotifications(unreadOnly = false): Promise<NotificationItem[]> {
  const url = unreadOnly
    ? `${BASE_URL}/notifications/?unread=true`
    : `${BASE_URL}/notifications/`
  const res = await authFetch(url)
  if (!res.ok) throw new Error("Failed to fetch notifications")
  const data = await res.json()
  return data.results ?? data
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await authFetch(`${BASE_URL}/notifications/unread_count/`)
  if (!res.ok) return 0
  const data = await res.json()
  return data.count ?? 0
}

export async function markNotificationsRead(ids?: number[]): Promise<void> {
  const body = ids ? { ids } : { all: true }
  await authFetch(`${BASE_URL}/notifications/mark_read/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ─── Chat unread ────────────────────────────────────────────────────────────

export interface ChatUnreadSummary {
  total: number
  conversations: Record<string, number>
}

export async function fetchChatUnread(): Promise<ChatUnreadSummary> {
  const res = await authFetch(`${BASE_URL}/chat/unread/`)
  if (!res.ok) return { total: 0, conversations: {} }
  return res.json()
}

export async function markChatRead(conversationId: number): Promise<void> {
  await authFetch(`${BASE_URL}/chat/${conversationId}/mark_read/`, {
    method: "POST",
  })
}

// ─── Mentor schedule + availability ─────────────────────────────────────────

import type { MentorSchedule, ScheduleBlock, ScheduleWindow } from "./schedule"

export async function fetchMyMentorSchedule(): Promise<MentorSchedule> {
  const res = await authFetch(`${BASE_URL}/mentors/me/schedule/`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось загрузить расписание")
  }
  return res.json()
}

export async function saveMyMentorSchedule(payload: {
  weekly: ScheduleWindow[]
  blocks: ScheduleBlock[]
}): Promise<MentorSchedule> {
  const res = await authFetch(`${BASE_URL}/mentors/me/schedule/`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    // Bubble up the first field-level message if present (overlap, etc.).
    const first = Object.values(err)[0]
    throw new Error(
      err.detail ||
        (Array.isArray(first) ? String(first[0]) : String(first ?? "Не удалось сохранить расписание")),
    )
  }
  return res.json()
}

export interface AvailabilityResponse {
  date: string
  timezone: string
  duration_minutes: number
  slots: string[]
}

export async function fetchMentorAvailability(
  mentorId: number,
  date: string,
  durationMinutes: number,
): Promise<AvailabilityResponse> {
  const params = new URLSearchParams({
    date,
    duration_minutes: String(durationMinutes),
  })
  const res = await authFetch(
    `${BASE_URL}/mentors/${mentorId}/availability/?${params.toString()}`,
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const first = Object.values(err)[0]
    throw new Error(
      err.detail ||
        (Array.isArray(first) ? String(first[0]) : String(first ?? "Не удалось загрузить слоты")),
    )
  }
  return res.json()
}

// ─── Auth helpers ───────────────────────────────────────────────────────────

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const buildHeaders = (token: string): HeadersInit => {
    const headers = new Headers(init.headers)
    if (token) headers.set("Authorization", `Bearer ${token}`)
    return headers
  }

  let res = await fetch(input, { ...init, headers: buildHeaders(getToken()) })
  if (res.status !== 401) return res

  const newToken = await refreshAccessToken()
  res = await fetch(input, { ...init, headers: buildHeaders(newToken) })
  return res
}
