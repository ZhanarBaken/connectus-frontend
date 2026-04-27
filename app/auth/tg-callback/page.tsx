"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { telegramFinalize, fetchMe } from "@/lib/api"
import Icon from "@/components/Icon"

type Status = "loading" | "success" | "error"

function TgCallbackContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<Status>("loading")
  const [error, setError] = useState("")

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

        const me = await fetchMe(data.access)
        localStorage.setItem("role", me.role)

        setStatus("success")

        setTimeout(() => {
          if (data.created) {
            if (me.role === "mentor") {
              router.push("/onboarding/mentor")
            } else {
              router.push("/onboarding/student")
            }
          } else {
            if (me.role === "mentor") {
              router.push("/mentor/dashboard")
            } else {
              router.push("/student/dashboard")
            }
          }
        }, 1500)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Не удалось подключить Telegram")
        setStatus("error")
      })
  }, [params, router])

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
          {status === "loading" && (
            <>
              <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Подключаем Telegram...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <Icon name="check_circle" size={36} className="text-emerald-600" filled />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Вход выполнен!</h1>
              <p className="text-gray-500 text-sm mb-6">
                Перенаправляем в личный кабинет...
              </p>
            </>
          )}

          {status === "error" && (
            <>
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
            </>
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
