"use client"

import { useEffect } from "react"
import { useRouter } from "@/i18n/navigation"
import { fetchStudentProfile } from "@/lib/api"

// A student who hasn't finished the 5 required onboarding fields (full
// name, date of birth, grade, city, graduation year — see
// StudentProfile.is_profile_complete on the backend) gets redirected to
// /onboarding/student instead of reaching any other student-only page.
// Silent no-op for logged-out users and mentors — each page's own auth
// check handles those. Unlike mentors, students have no approval/ban
// concept, so there's no exemption to carve out here.
export function useStudentOnboardingGate() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!localStorage.getItem("access_token")) return
    if (localStorage.getItem("role") !== "student") return

    let cancelled = false
    fetchStudentProfile()
      .then((p) => {
        if (cancelled) return
        if (!p.is_profile_complete) {
          router.replace("/onboarding/student")
        }
      })
      .catch(() => {
        // Not this hook's job — the page's own fetches/auth check surface
        // real failures (expired token, network error, etc).
      })
    return () => { cancelled = true }
  }, [router])
}
