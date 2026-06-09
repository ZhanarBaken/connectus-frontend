"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { telegramFinalize, fetchMe, setUserRole } from "@/lib/api"
import Icon from "@/components/Icon"
import Logo from "@/components/Logo"

type Status = "loading" | "pick_role" | "success" | "error"
type Role = "student" | "mentor"

function TgCallbackContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<Status>("loading")
  const [error, setError] = useState("")
  const [submittingRole, setSubmittingRole] = useState<Role | null>(null)

  useEffect(() => {
    const urlToken = params.get("token")
    const savedToken = localStorage.getItem("tg_signup_token")
    const token = urlToken || savedToken

    if (!token) {
      setError("Токен не найден. Попробуйте войти заново.")
      setStatus("error")
      return
    }

    localStorage.removeItem("tg_signup_token")

    telegramFinalize(token)
      .then(async (data) => {
        localStorage.setItem("access_token", data.access)
        localStorage.setItem("refresh_token", data.refresh)

        if (data.created) {
          // New account — ask role before proceeding.
          // Role in DB defaults to "student" from telegramStart("student");
          // user may override to "mentor" via the picker below.
          localStorage.setItem("role", "student")
          setStatus("pick_role")
          return
        }

        const me = await fetchMe(data.access)
        localStorage.setItem("role", me.role)
        setStatus("success")
        setTimeout(() => {
          if (me.role === "mentor") {
            router.push("/mentor/dashboard")
          } else {
            router.push("/student/dashboard")
          }
        }, 1500)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Не удалось подключить Telegram")
        setStatus("error")
      })
  }, [params, router])

  const handlePickRole = async (role: Role) => {
    setSubmittingRole(role)
    setError("")
    try {
      if (role === "mentor") {
        await setUserRole("mentor")
        localStorage.setItem("role", "mentor")
      }
      setStatus("success")
      setTimeout(() => {
        router.push(role === "mentor" ? "/onboarding/mentor/identity" : "/onboarding/student")
      }, 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка. Попробуйте снова.")
      setSubmittingRole(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <Logo size={32} className="text-gray-900" />
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
          {status === "loading" && (
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Подключаем Telegram...</p>
            </div>
          )}

          {status === "pick_role" && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">Добро пожаловать!</h1>
              <p className="text-gray-500 text-sm mb-8 text-center">Кто вы?</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handlePickRole("student")}
                  disabled={submittingRole !== null}
                  className="w-full py-4 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {submittingRole === "student" ? "Создаём..." : "Я абитуриент или родитель"}
                </button>
                <button
                  onClick={() => handlePickRole("mentor")}
                  disabled={submittingRole !== null}
                  className="w-full py-4 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {submittingRole === "mentor" ? "Создаём..." : "Я ментор"}
                </button>
              </div>
              {error && <p className="text-sm text-red-600 mt-4 text-center">{error}</p>}
            </>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <Icon name="check_circle" size={36} className="text-emerald-600" filled />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Вход выполнен!</h1>
              <p className="text-gray-500 text-sm">
                Перенаправляем...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="error" size={36} className="text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Ошибка авторизации</h1>
              <p className="text-gray-500 text-sm mb-6">{error}</p>
              <button
                onClick={() => router.push("/auth/login")}
                className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:border-gray-300 transition-colors text-sm"
              >
                Попробовать снова
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TgCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TgCallbackContent />
    </Suspense>
  )
}
