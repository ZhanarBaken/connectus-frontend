"use client"

import { useEffect } from "react"
import { useRouter } from "@/i18n/navigation"
import { fetchMentorProfile } from "@/lib/api"

// A mentor who hasn't submitted their profile for review yet must finish
// the onboarding wizard before reaching any other mentor-only page — this
// redirects them there instead of letting them browse a half-finished
// dashboard/services/schedule/etc. Submitted (pending review) and approved
// mentors are unaffected. Silent no-op for logged-out users and students —
// each page's own auth check handles those.
export function useMentorOnboardingGate() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!localStorage.getItem("access_token")) return
    if (localStorage.getItem("role") !== "mentor") return

    let cancelled = false
    fetchMentorProfile()
      .then((p) => {
        if (cancelled) return
        // A banned-before-ever-submitting mentor skips the wizard too —
        // /mentor/dashboard is the one page that actually shows the ban
        // notice, and the onboarding wizard has no ban handling at all.
        if (!p.is_banned && !p.is_submitted && !p.is_approved) {
          router.replace("/onboarding/mentor")
        }
      })
      .catch(() => {
        // Not this hook's job — the page's own fetches/auth check surface
        // real failures (expired token, network error, etc).
      })
    return () => { cancelled = true }
  }, [router])
}
