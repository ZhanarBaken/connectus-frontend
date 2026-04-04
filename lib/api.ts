// ─── API client ──────────────────────────────────────────────────────────────
// Switch USE_MOCKS to false when backend is ready

import { MOCK_MENTORS, getMockMentor, getMockServices, MOCK_ORDERS, MOCK_STUDENT_PROFILE } from "./mocks"
import { Mentor, MentorCard, MentorProfile, Order, StudentProfile } from "@/types"

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
      is_active: true,
      services,
    }
  }

  const res = await fetch(`${BASE_URL}/mentors/${id}/`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error("Failed to fetch mentor")
  return res.json()
}

// ─── Auth: current user ───────────────────────────────────────────────────────

export async function fetchMe(token: string): Promise<{ id: number; email: string; role: string }> {
  const res = await fetch(`${BASE_URL}/auth/me/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Failed to fetch user")
  return res.json()
}

// ─── Mentor own profile ───────────────────────────────────────────────────────

export async function fetchMentorProfile(): Promise<MentorProfile> {
  const res = await fetch(`${BASE_URL}/mentors/profile/me/`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error("Failed to fetch mentor profile")
  return res.json()
}

export async function updateMentorProfile(data: Partial<MentorProfile>): Promise<MentorProfile> {
  const res = await fetch(`${BASE_URL}/mentors/profile/me/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
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
  const res = await fetch(`${BASE_URL}/mentors/profile/submit/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) {
    const err = await res.json()
    const first = Object.values(err)[0]
    throw new Error(Array.isArray(first) ? first[0] : String(first))
  }
}

// ─── Mentor services ─────────────────────────────────────────────────────────

export async function fetchMentorServices(): Promise<import("@/types").MentorService[]> {
  const res = await fetch(`${BASE_URL}/mentors/services/`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error("Failed to fetch services")
  const data = await res.json()
  return Array.isArray(data) ? data : data.results
}

export async function createMentorService(data: Partial<import("@/types").MentorService>): Promise<import("@/types").MentorService> {
  const res = await fetch(`${BASE_URL}/mentors/services/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
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
  const res = await fetch(`${BASE_URL}/mentors/services/${id}/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error("Failed to delete service")
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function fetchOrders(): Promise<Order[]> {
  if (USE_MOCKS) return MOCK_ORDERS

  const res = await fetch(`${BASE_URL}/orders/`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) throw new Error("Failed to fetch orders")
  const data = await res.json()
  return data.results
}

export async function createOrder(mentorServiceId: number): Promise<import("@/types").Order> {
  const res = await fetch(`${BASE_URL}/orders/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ mentor_service: mentorServiceId }),
  })
  if (!res.ok) {
    const err = await res.json()
    const first = Object.values(err)[0]
    throw new Error(Array.isArray(first) ? first[0] : String(first))
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

  const res = await fetch(`${BASE_URL}/students/profile/me/`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
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

  const res = await fetch(`${BASE_URL}/students/profile/me/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
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
  if (!res.ok) throw new Error("Login failed")
  return res.json()
}

export async function register(email: string, password: string, role: string) {
  if (USE_MOCKS) {
    return { id: 1, email, role }
  }

  const res = await fetch(`${BASE_URL}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role, agreed_to_terms: true }),
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
