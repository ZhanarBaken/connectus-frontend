// ─── API client ──────────────────────────────────────────────────────────────
// Switch USE_MOCKS to false when backend is ready

import { MOCK_MENTORS, getMockMentor } from "./mocks"
import { Mentor } from "@/types"

const USE_MOCKS = true
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

// ─── Mentors ─────────────────────────────────────────────────────────────────

export async function fetchMentors(): Promise<Mentor[]> {
  if (USE_MOCKS) return MOCK_MENTORS

  const res = await fetch(`${BASE_URL}/mentors/`)
  if (!res.ok) throw new Error("Failed to fetch mentors")
  const data = await res.json()
  return data.results
}

export async function fetchMentor(id: number): Promise<Mentor> {
  if (USE_MOCKS) {
    const mentor = getMockMentor(id)
    if (!mentor) throw new Error("Mentor not found")
    return mentor
  }

  const res = await fetch(`${BASE_URL}/mentors/${id}/`)
  if (!res.ok) throw new Error("Failed to fetch mentor")
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
    body: JSON.stringify({ email, password, role }),
  })
  if (!res.ok) throw new Error("Registration failed")
  return res.json()
}
