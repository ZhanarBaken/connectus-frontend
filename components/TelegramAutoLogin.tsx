"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { telegramMiniAppLogin, fetchMe } from "@/lib/api"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import type { Role } from "@/types"

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

  const [needsRole, setNeedsRole] = useState(false)
  const [submittingRole, setSubmittingRole] = useState<Role | null>(null)
  const [error, setError] = useState("")
  // Guard against re-running auto-login when state updates trigger a
  // re-render mid-flight. A ref instead of state because nothing in
  // the UI depends on this flag.
  const attempted = useRef(false)

  useEffect(() => {
    if (!isInTelegram || !initData || attempted.current) return
    if (typeof window !== "undefined" && localStorage.getItem("access_token")) return

    attempted.current = true
    void runLogin()

    async function runLogin(role?: Role) {
      try {
        const result = await telegramMiniAppLogin(initData, role)
        if (!result.ok && result.reason === "role_required") {
          setNeedsRole(true)
          return
        }
        if (result.ok) {
          localStorage.setItem("access_token", result.access)
          localStorage.setItem("refresh_token", result.refresh)
          const me = await fetchMe(result.access)
          localStorage.setItem("role", me.role)
          if (result.created) {
            router.push(me.role === "mentor" ? "/onboarding/mentor" : "/onboarding/student")
          } else {
            // Returning user — refresh so server components and any
            // auth-dependent UI re-render with the new token.
            router.refresh()
          }
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка входа через Telegram")
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
        router.push(role === "mentor" ? "/onboarding/mentor" : "/onboarding/student")
      } else {
        setError("Не удалось создать аккаунт")
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка регистрации")
    } finally {
      setSubmittingRole(null)
    }
  }

  if (!needsRole) return null

  // Full-screen role picker — covers the page until the new user has
  // chosen their role. Mini App context only, so we can be aggressive
  // about owning the viewport.
  return (
    <div className="fixed inset-0 z-50 bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
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
      </div>
    </div>
  )
}
