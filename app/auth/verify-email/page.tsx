"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { verifyEmail } from "@/lib/api"
import Icon from "@/components/Icon"
import Logo from "@/components/Logo"

type Status = "loading" | "success" | "error"

function VerifyEmailContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<Status>("loading")
  const [error, setError] = useState("")

  useEffect(() => {
    const token = params.get("token")
    if (!token) {
      setError("Токен не найден в ссылке")
      setStatus("error")
      return
    }
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Не удалось подтвердить email")
        setStatus("error")
      })
  }, [params])

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <Logo size={32} className="text-gray-900" />
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
          {status === "loading" && (
            <>
              <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Подтверждаем email...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <Icon name="check_circle" size={36} className="text-emerald-600" filled />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Email подтверждён</h1>
              <p className="text-gray-500 text-sm mb-6">
                Теперь ты можешь войти в свой аккаунт.
              </p>
              <button
                onClick={() => router.push("/auth/login")}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm"
              >
                Войти в аккаунт
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="error" size={36} className="text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Не удалось подтвердить</h1>
              <p className="text-gray-500 text-sm mb-6">{error}</p>
              <button
                onClick={() => router.push("/auth/login")}
                className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:border-gray-300 transition-colors text-sm"
              >
                На страницу входа
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
