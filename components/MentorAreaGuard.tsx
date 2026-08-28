"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "@/i18n/navigation"
import { fetchMentorProfile } from "@/lib/api"

// Path prefixes a logged-in mentor may freely visit — everything else
// bounces to /mentor/dashboard. Deliberately an allowlist, not a
// blocklist: a new public/student-facing page defaults to BLOCKED for a
// mentor until someone explicitly adds it here, rather than silently
// leaking through. /mentors/<id> is handled separately below (own
// profile only) since it can't be expressed as a static prefix.
const ALLOWED_PREFIXES = [
  "/mentor/dashboard",
  "/mentor/clients",
  "/mentor/earnings",
  "/mentor/guide",
  "/mentors/profile",
  "/mentors/schedule",
  "/mentors/services",
  "/orders",
  "/messages",
  "/settings",
  "/onboarding/mentor",
  "/terms",
  "/privacy",
  "/platform-rules",
  "/auth",
]

function isAllowedPrefix(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Confines a logged-in mentor to their own operational area — mounted
 * once in the locale layout so it runs on every navigation. Renders
 * nothing. No-op for students, admins, and logged-out visitors; each
 * page's own auth check still handles those.
 */
export default function MentorAreaGuard() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (
      localStorage.getItem("role") !== "mentor" ||
      !localStorage.getItem("access_token")
    ) {
      return
    }

    const ownProfileMatch = /^\/mentors\/(\d+)$/.exec(pathname)
    if (ownProfileMatch) {
      let cancelled = false
      fetchMentorProfile()
        .then((profile) => {
          if (!cancelled && String(profile.id) !== ownProfileMatch[1]) {
            router.replace("/mentor/dashboard")
          }
        })
        .catch(() => {
          // Fail closed — an unreachable profile fetch shouldn't leave a
          // mentor able to browse someone else's page unchecked.
          if (!cancelled) router.replace("/mentor/dashboard")
        })
      return () => { cancelled = true }
    }

    if (!isAllowedPrefix(pathname)) {
      router.replace("/mentor/dashboard")
    }
  }, [pathname, router])

  return null
}
