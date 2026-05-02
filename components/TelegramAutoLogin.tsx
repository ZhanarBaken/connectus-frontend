"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { telegramMiniAppLogin, fetchMe } from "@/lib/api"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import type { Role } from "@/types"

// What stage of Mini App auto-login we're at. Drives whether we render
// a covering overlay (loading or role picker) or step out of the way.
//   - "idle":      not in a Mini App context (or SDK not yet detected).
//                  Render nothing — the regular site UI shows through.
//   - "checking":  in a Mini App, hitting the backend right now. Cover
//                  the page so the user doesn't see the public
//                  homepage flash before being redirected/picker-prompted.
//   - "needsRole": new user — show role picker.
//   - "done":      logged in (or skipping login because token cached).
//                  Render nothing.
type AuthStage = "idle" | "checking" | "needsRole" | "done"

// Mounts globally inside <RootLayout>. Outside Telegram it is a no-op.
// Inside a Mini App and without a stored access token, it:
//   1. Posts initData to the backend.
//   2. On success — saves tokens and routes by role.
//   3. On `role_required` (first-ever Mini App visit) — surfaces a
//      role picker so the new user can pick student/mentor without
//      ever seeing the email/password form.
export default function TelegramAutoLogin() {
  const router = useRouter()
  const { isInTelegram, initData } = useTelegramWebApp()

  // Initial stage: synchronously detect Mini App context via URL hash
  // (Telegram sets `#tgWebAppData=...` before any JS runs, well before
  // the WebApp SDK script finishes loading async). If the hash is
  // present we immediately show the loading overlay on first paint —
  // no public-homepage flash before the role picker / redirect.
  const [stage, setStage] = useState<AuthStage>(() => {
    if (typeof window === "undefined") return "idle"
    const looksLikeMiniApp = window.location.hash.includes("tgWebApp")
    if (!looksLikeMiniApp) return "idle"
    if (localStorage.getItem("access_token")) return "done"
    return "checking"
  })
  const [submittingRole, setSubmittingRole] = useState<Role | null>(null)
  const [error, setError] = useState("")
  // Guard against re-running auto-login when state updates trigger a
  // re-render mid-flight. A ref instead of state because nothing in
  // the UI depends on this flag.
  const attempted = useRef(false)

  useEffect(() => {
    if (!isInTelegram || !initData || attempted.current) return
    if (typeof window !== "undefined" && localStorage.getItem("access_token")) {
      // Returning user with cached token — skip the network round-trip
      // and let the underlying page render.
      setStage("done")
      return
    }

    attempted.current = true
    setStage("checking")
    void runLogin()

    async function runLogin(role?: Role) {
      try {
        const result = await telegramMiniAppLogin(initData, role)
        if (!result.ok && result.reason === "role_required") {
          setStage("needsRole")
          return
        }
        if (result.ok) {
          localStorage.setItem("access_token", result.access)
          localStorage.setItem("refresh_token", result.refresh)
          const me = await fetchMe(result.access)
          localStorage.setItem("role", me.role)
          setStage("done")
          if (result.created) {
            router.push(me.role === "mentor" ? "/onboarding/mentor" : "/onboarding/student")
          } else {
            router.refresh()
          }
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка входа через Telegram")
        setStage("done")
      }
    }
  }, [isInTelegram, initData, router])

  const handlePickRole = async (role: Role) => {
    setSubmittingRole(role)
    setError("")
    try {
      const result = await telegramMiniAppLogin(initData, role)
      if (result.ok) {
        localStorage.setItem("access_token", result.access)
        localStorage.setItem("refresh_token", result.refresh)
        localStorage.setItem("role", role)
        // Swap to checking spinner BEFORE navigating so the overlay
        // stays up while /onboarding/<role> mounts — otherwise the
        // destination page flashes its own auth-check skeleton.
        // Cleared shortly after navigation by a layout effect (below).
        setStage("checking")
        router.push(role === "mentor" ? "/onboarding/mentor" : "/onboarding/student")
        // Hide the overlay after the next tick so the destination has
        // had a chance to read localStorage and render with auth.
        window.setTimeout(() => setStage("done"), 600)
      } else {
        setError("Не удалось создать аккаунт")
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка регистрации")
    } finally {
      setSubmittingRole(null)
    }
  }

  if (stage === "idle" || stage === "done") return null

  // Both checking and needsRole share the same full-screen frame so
  // there is no flash between them — only the inner content swaps.
  return (
    <div className="fixed inset-0 z-50 bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {stage === "checking" ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Входим в Connectus...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Добро пожаловать в Connectus
            </h1>
            <p className="text-gray-500 text-sm mb-8 text-center">
              Выбери роль чтобы продолжить
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handlePickRole("student")}
                disabled={submittingRole !== null}
                className="bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {submittingRole === "student" ? "Создаём..." : "Я студент или родитель"}
              </button>
              <button
                onClick={() => handlePickRole("mentor")}
                disabled={submittingRole !== null}
                className="border border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {submittingRole === "mentor" ? "Создаём..." : "Я ментор"}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 mt-4 text-center">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
