"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Redirects logged-in mentors away from public landing pages
 * straight to their dashboard. Renders nothing.
 */
export default function MentorRedirect() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (localStorage.getItem("role") === "mentor") {
      router.replace("/mentor/dashboard")
    }
  }, [router])

  return null
}
