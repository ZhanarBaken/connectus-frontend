"use client"

import { useState } from "react"
import Link from "next/link"
import { register, resendVerification } from "@/lib/api"

type Role = "student" | "mentor"

const ROLES = [
  {
    value: "student" as Role,
    icon: "🎓",
    title: "Я студент или родитель",
    desc: "Ищу ментора для поступления за рубеж",
  },
  {
    value: "mentor" as Role,
    icon: "⭐",
    title: "Я ментор",
    desc: "Хочу помогать студентам с поступлением",
  },
]

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role>("student")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [resendError, setResendError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await register(email, password, role)
      // Save role so login can route correctly later (also returned by /auth/me)
      localStorage.setItem("pending_role", role)
      setRegistered(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при регистрации. Проверьте данные.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setResendError("")
    try {
      await resendVerification(email)
      setResent(true)
    } catch (e: unknown) {
      setResendError(e instanceof Error ? e.message : "Не удалось отправить письмо")
    } finally {
      setResending(false)
    }
  }

  // ─── Post-registration screen ──────────────────────────────────
  if (registered) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 justify-center">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">C</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Connectus</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📬</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Проверь почту</h1>
            <p className="text-gray-500 text-sm mb-1">
              Мы отправили ссылку для подтверждения на
            </p>
            <p className="font-semibold text-gray-900 mb-6 break-all">{email}</p>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              Перейди по ссылке из письма, чтобы активировать аккаунт. После этого ты сможешь войти и заполнить профиль.
            </p>

            {resent ? (
              <p className="text-sm text-green-600 font-medium">Письмо отправлено повторно ✓</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 transition-colors"
              >
                {resending ? "Отправляем..." : "Отправить письмо повторно"}
              </button>
            )}
            {resendError && (
              <p className="text-xs text-red-500 mt-2">{resendError}</p>
            )}
          </div>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Письмо не приходит? Проверь папку «Спам».
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
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

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step === s
                  ? "bg-indigo-600 text-white"
                  : step > s
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-gray-100 text-gray-400"
              }`}>
                {step > s ? "✓" : s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? "bg-indigo-200" : "bg-gray-100"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {/* Step 1 — Role selection */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Кто ты?</h1>
              <p className="text-gray-500 text-sm mb-6">Выбери роль чтобы мы настроили аккаунт под тебя</p>

              <div className="flex flex-col gap-3 mb-8">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
                      role === r.value
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <span className="text-3xl">{r.icon}</span>
                    <div>
                      <div className={`font-semibold text-sm ${role === r.value ? "text-indigo-700" : "text-gray-900"}`}>
                        {r.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
                    </div>
                    {role === r.value && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm"
              >
                Продолжить →
              </button>
            </div>
          )}

          {/* Step 2 — Email + password */}
          {step === 2 && (
            <div>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"
              >
                ← Назад
              </button>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Создай аккаунт</h1>
              <p className="text-gray-500 text-sm mb-6">
                Регистрируешься как{" "}
                <span className="font-medium text-indigo-600">
                  {role === "mentor" ? "ментор" : "студент"}
                </span>
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Минимум 12 символов"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-1 [-webkit-tap-highlight-color:transparent]"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 flex-shrink-0 accent-indigo-600"
                  />
                  <span className="text-sm text-gray-500 leading-relaxed">
                    Я принимаю{" "}
                    <span className="text-indigo-600 font-medium">условия использования</span>
                    {" "}и{" "}
                    <span className="text-indigo-600 font-medium">политику конфиденциальности</span>
                  </span>
                </label>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !agreedToTerms}
                  className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? "Создаём аккаунт..." : "Создать аккаунт"}
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Уже есть аккаунт?{" "}
          <Link href="/auth/login" className="text-indigo-600 font-medium hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}
