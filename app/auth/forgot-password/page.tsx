"use client"

import { useState } from "react"
import Link from "next/link"
import { requestPasswordReset, CooldownError, formatCooldownShort } from "@/lib/api"
import Logo from "@/components/Logo"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [cooldown, setCooldown] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError("")
    try {
      await requestPasswordReset(email.trim())
      setSubmitted(true)
    } catch (e: unknown) {
      if (e instanceof CooldownError) {
        setCooldown(e.retryAfter)
        setError(`Слишком много попыток. Подождите ${formatCooldownShort(e.retryAfter)}.`)
      } else {
        setError(e instanceof Error ? e.message : "Не удалось отправить письмо")
      }
    } finally {
      setLoading(false)
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

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {submitted ? (
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Проверь почту</h1>
              {/* Generic copy — we don't reveal whether the email is in
                  the DB. If a Google-only / TG-only user types their
                  address, the backend silently skips and the same UX
                  applies (no email arrives but no leak either). */}
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Если аккаунт с такой почтой существует и поддерживает вход по паролю, мы прислали ссылку для восстановления. Открой её в течение часа.
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Не пришло? Проверь папку «Спам». Если её там нет — зарегистрируйся заново или войди через Google / Telegram.
              </p>
              <Link
                href="/auth/login"
                className="inline-block w-full text-center border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:border-gray-300 transition-colors text-sm"
              >
                Вернуться ко входу
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Забыли пароль?</h1>
              <p className="text-sm text-gray-500 mb-6">
                Введите email — мы пришлём ссылку для восстановления.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || cooldown > 0}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm"
                >
                  {loading ? "Отправляем..." : "Отправить ссылку"}
                </button>
              </form>

              <p className="text-sm text-gray-500 mt-6 text-center">
                Вспомнили пароль?{" "}
                <Link href="/auth/login" className="text-indigo-600 font-medium hover:underline">
                  Войти
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
