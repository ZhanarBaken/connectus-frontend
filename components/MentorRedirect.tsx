"use client"

import { useEffect } from "react"
import { useRouter } from "@/i18n/navigation"

/**
 * Redirects logged-in mentors away from public landing pages
 * straight to their dashboard. Renders nothing.
 */
export default function MentorRedirect() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    // Gate on BOTH role + token. A bare role with no token is a stale
    // remnant of a prior session — redirecting to /mentor/dashboard
    // would just bounce through /auth/login and (inside a Mini App)
    // surface the auto-login overlay the moment the user opens the
    // app, before they had a chance to see the public landing.
    if (
      localStorage.getItem("role") === "mentor" &&
      localStorage.getItem("access_token")
    ) {
      router.replace("/mentor/dashboard")
    }
  }, [router])

  return null
}
