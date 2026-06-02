// ─── API client ──────────────────────────────────────────────────────────────
// Switch USE_MOCKS to false when backend is ready

import { MOCK_MENTORS, getMockMentor, getMockServices, MOCK_ORDERS, MOCK_STUDENT_PROFILE } from "./mocks"
import { Dispute, Mentor, MentorCard, MentorProfile, Order, StudentProfile } from "@/types"

const USE_MOCKS = false
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

// ─── Cooldown / rate-limit error ────────────────────────────────────────────
// Backend returns 429 in two situations: the per-user verification-email
// cooldown (60s) and the per-IP / per-user DRF throttle. Both set a
// `Retry-After` header (seconds). We surface this as a typed error so
// the UI can show a countdown instead of a generic toast.
export class CooldownError extends Error {
  retryAfter: number
  constructor(message: string, retryAfter: number) {
    super(message)
    this.name = "CooldownError"
    this.retryAfter = retryAfter
  }
}

// Render N seconds as a Russian-friendly duration:
// 47    → "47 секунд"
// 90    → "1 минуту 30 секунд"
// 2574  → "43 минуты"
// 7200  → "2 часа"
export function formatCooldown(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const plural = (n: number, forms: [string, string, string]) => {
    const mod10 = n % 10, mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return forms[0]
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
    return forms[2]
  }
  const sec = (n: number) => `${n} ${plural(n, ["секунду", "секунды", "секунд"])}`
  const min = (n: number) => `${n} ${plural(n, ["минуту", "минуты", "минут"])}`
  const hr  = (n: number) => `${n} ${plural(n, ["час", "часа", "часов"])}`

  if (s < 60) return sec(s)
  if (s < 3600) {
    const m = Math.floor(s / 60)
    const rem = s % 60
    return rem && m < 5 ? `${min(m)} ${sec(rem)}` : min(m)
  }
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return m ? `${hr(h)} ${min(m)}` : hr(h)
}

// Compact form for tight UI like a button label: "47с", "1м 30с", "43м", "2ч"
export function formatCooldownShort(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  if (s < 60) return `${s}с`
  if (s < 3600) {
    const m = Math.floor(s / 60)
    const rem = s % 60
    return rem ? `${m}м ${rem}с` : `${m}м`
  }
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return m ? `${h}ч ${m}м` : `${h}ч`
}

async function readCooldown(res: Response, fallbackMessage: string): Promise<CooldownError> {
  const body = await res.json().catch(() => ({} as Record<string, unknown>))
  const detail = typeof body.detail === "string" ? body.detail : ""
  // Source priority for retry seconds, falling back if each source is
  // missing or unreadable:
  //   1. `Retry-After` HTTP header — preferred. Requires the backend
  //      to expose it via CORS_EXPOSE_HEADERS, otherwise the browser
  //      hides it from JS and `headers.get` returns null.
  //   2. `retry_after` field — set by our custom 429 body
  //      (apps/users/views.py:_cooldown_response). Not present on
  //      DRF's standard throttle response.
  //   3. Number scraped from DRF's "Expected available in N seconds."
  //      message. Defensive — survives a misconfigured CORS or a
  //      future DRF wording change as long as the seconds digits stay.
  //   4. 60s fallback so the user is never stuck with no countdown.
  const headerValue = res.headers.get("Retry-After")
  const bodyRetry = (body.retry_after as string | number | undefined)?.toString()
  // `seconds?` so we also match DRF's singular form "in 1 second." —
  // emitted via ngettext when `wait == 1`.
  const detailMatch = detail.match(/\bin (\d+) seconds?\b/)
  const retryAfter = parseInt(
    headerValue || bodyRetry || (detailMatch ? detailMatch[1] : "") || "60",
    10,
  )
  const seconds = isNaN(retryAfter) ? 60 : retryAfter

  // Map known backend / DRF / Cloudflare messages to friendly Russian.
  // We never show the raw English `Request was throttled. Expected available in N seconds.`
  let message: string
  if (detail.startsWith("A verification email was sent recently")) {
    message = `Письмо отправлено недавно. Попробуйте снова через ${formatCooldown(seconds)}.`
  } else if (/throttled/i.test(detail)) {
    message = `Слишком много попыток. Попробуйте снова через ${formatCooldown(seconds)}.`
  } else {
    message = detail || fallbackMessage
  }
  return new CooldownError(message, seconds)
}

// ─── Public settings ────────────────────────────────────────────────────────

export interface PublicSettings {
  dispute_window_hours: number
  support_url: string
  terms_text: string
  platform_rules_text: string
  data_consent_text: string
  privacy_policy_text: string
}

export async function fetchPublicSettings(): Promise<PublicSettings> {
  const res = await fetch(`${BASE_URL}/settings/public/`)
  if (!res.ok) throw new Error("Failed to fetch public settings")
  return res.json()
}

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

// ─── Primary consultation (the auto-created "первичная" service) ─────────────
// Has its own endpoint because the regular /services/ ViewSet excludes
// consultation categories — backend invariants forbid creating a second
// consultation or deleting the one auto-created on registration. Mentor
// can only edit price / duration / description / title.

export async function fetchPrimaryConsultation(): Promise<import("@/types").MentorService> {
  const res = await authFetch(`${BASE_URL}/mentors/me/consultation/`)
  if (!res.ok) throw new Error("Failed to fetch primary consultation")
  return res.json()
}

export interface MentorEarnings {
  pending_amount: string
  earned_unpaid_amount: string
  earned_paid_amount: string
  payouts: Array<{
    id: number
    amount: string
    paid_at: string
    method: "kaspi" | "bank" | "cash" | "other"
    note: string
  }>
}

export async function fetchMentorEarnings(): Promise<MentorEarnings> {
  const res = await authFetch(`${BASE_URL}/mentors/me/earnings/`)
  if (!res.ok) throw new Error("Не удалось загрузить финансы")
  return res.json()
}

export async function updatePrimaryConsultation(
  data: Partial<import("@/types").MentorService>,
): Promise<import("@/types").MentorService> {
  const res = await authFetch(`${BASE_URL}/mentors/me/consultation/`, {
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

export async function verifyEmail(
  token: string,
): Promise<{ access: string; refresh: string; role: string }> {
  const res = await fetch(`${BASE_URL}/auth/verify-email/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.token?.[0] || err.detail || "Не удалось подтвердить email")
  }
  return res.json()
}

export async function resendVerification(email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/resend-verification/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (res.status === 429) {
    throw await readCooldown(res, "Не удалось отправить письмо")
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.email?.[0] || err.detail || "Не удалось отправить письмо")
  }
}

// Always 200 — backend never reveals whether the address exists.
export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/password/forgot/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (res.status === 429) {
    throw await readCooldown(res, "Слишком много попыток. Попробуйте позже.")
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.email?.[0] || err.detail || "Не удалось отправить письмо")
  }
}

export async function confirmPasswordReset(token: string, password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/password/reset/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      err.token?.[0] || err.password?.[0] || err.detail || "Не удалось обновить пароль",
    )
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


// Decode the JWT's `exp` claim without verifying — we trust the
// signature was checked on the last refresh; this read is purely to
// know if the token is about to expire on our side. Returns the
// numeric `exp` (epoch seconds) or null if we couldn't parse it.
function _jwtExp(token: string): number | null {
  try {
    const part = token.split(".")[1]
    if (!part) return null
    // base64url → base64
    const padded = part.replace(/-/g, "+").replace(/_/g, "/")
      .padEnd(part.length + ((4 - part.length % 4) % 4), "=")
    const payload = JSON.parse(atob(padded))
    return typeof payload.exp === "number" ? payload.exp : null
  } catch {
    return null
  }
}


// Skew so we refresh just before the server would reject the token.
// 60s is a balance: long enough to cover network latency on the WS
// handshake, short enough that we don't refresh on every page load.
const _ACCESS_TOKEN_REFRESH_SKEW_S = 60

/**
 * Return an access token guaranteed to be valid for at least the next
 * `_ACCESS_TOKEN_REFRESH_SKEW_S` seconds. Used at WebSocket open time
 * because WS connections aren't covered by `authFetch`'s 401-retry
 * loop — once a WS handshake is rejected, the browser closes the
 * socket and the call site has to reconnect from scratch.
 *
 * Returns null when the user has no token at all (anonymous tab).
 * Throws and bubbles up when refresh itself fails — the existing
 * refreshAccessToken redirects to /auth/login in that case, matching
 * authFetch's hard-401 behavior.
 */
export async function getFreshAccessToken(): Promise<string | null> {
  const current = getToken()
  if (!current) return null

  const exp = _jwtExp(current)
  if (exp === null) {
    // Can't read exp — let the WS attempt with the current token; if
    // it's bad, the consumer rejects with 4001 and the caller falls
    // back to polling, same as today.
    return current
  }

  const now = Math.floor(Date.now() / 1000)
  if (exp - now > _ACCESS_TOKEN_REFRESH_SKEW_S) return current

  return await refreshAccessToken()
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

export async function telegramLogin(token: string): Promise<{
  user_id: number
  access: string
  refresh: string
}> {
  const res = await fetch(`${BASE_URL}/auth/telegram/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось войти через Telegram")
  }
  return res.json()
}

export type TelegramMiniAppLoginResult =
  | { ok: true; access: string; refresh: string; user_id: number; created: boolean }
  | { ok: false; reason: "role_required" }

export async function telegramMiniAppLogin(
  initData: string,
  role?: "student" | "mentor",
): Promise<TelegramMiniAppLoginResult> {
  const res = await fetch(`${BASE_URL}/auth/telegram/miniapp/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(role ? { init_data: initData, role } : { init_data: initData }),
  })
  if (res.status === 400) {
    const err = await res.json().catch(() => ({}))
    if (err.detail === "role_required") {
      return { ok: false, reason: "role_required" }
    }
    throw new Error(err.detail || "Не удалось войти через Telegram")
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось войти через Telegram")
  }
  const data = await res.json()
  return { ok: true, ...data }
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

export class EmailTakenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EmailTakenError"
  }
}

export class MergeRequiresSupportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MergeRequiresSupportError"
  }
}

export async function telegramLinkFinalize(token: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/auth/telegram/link/finalize/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 409 && err.code === "merge_requires_support") {
      throw new MergeRequiresSupportError(err.detail || "Требуется помощь поддержки")
    }
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

// Carried out of googleAuth when the backend tells us the email
// has no account yet — the login page shows a "К регистрации"
// button alongside the message instead of a dead-end error.
export class AccountNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AccountNotFoundError"
  }
}

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
    if (err.code === "account_not_found") {
      throw new AccountNotFoundError(err.detail || "Аккаунт не найден. Сначала зарегистрируйтесь.")
    }
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
  if (res.status === 429) {
    throw await readCooldown(res, "Не удалось установить email")
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (err.code === "email_taken_link_telegram") {
      throw new EmailTakenError(err.email || err.detail || "Эта почта уже привязана к другому аккаунту")
    }
    throw new Error(err.email?.[0] || err.email || err.detail || "Не удалось установить email")
  }
}

export async function changeEmail(email: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/auth/email/change/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (res.status === 429) {
    throw await readCooldown(res, "Не удалось сменить email")
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.email?.[0] || err.detail || "Не удалось сменить email")
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

export interface AvailabilityOverviewResponse {
  timezone: string
  duration_minutes: number
  dates: Record<string, boolean>
}

// Returns a {date: has_free_slots} map for the visible calendar window.
// Used to render a dot indicator under date cells so students don't
// have to cold-tap every day to discover availability.
export async function fetchMentorAvailabilityOverview(
  mentorId: number,
  fromDate: string,
  toDate: string,
  durationMinutes: number,
): Promise<AvailabilityOverviewResponse> {
  const params = new URLSearchParams({
    from: fromDate,
    to: toDate,
    duration_minutes: String(durationMinutes),
  })
  const res = await authFetch(
    `${BASE_URL}/mentors/${mentorId}/availability/overview/?${params.toString()}`,
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const first = Object.values(err)[0]
    throw new Error(
      err.detail ||
        (Array.isArray(first) ? String(first[0]) : String(first ?? "Не удалось загрузить календарь")),
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
