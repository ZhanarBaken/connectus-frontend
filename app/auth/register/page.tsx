"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { register, login } from "@/lib/api"

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
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role>("student")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await register(email, password, role)
      const data = await login(email, password)
      localStorage.setItem("access_token", data.access)
      localStorage.setItem("refresh_token", data.refresh)
      localStorage.setItem("role", role)
      if (role === "mentor") {
        router.push("/onboarding/mentor")
      } else {
        router.push("/onboarding/student")
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при регистрации. Проверьте данные.")
    } finally {
      setLoading(false)
    }
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
                  <input
                    type="password"
                    placeholder="Минимум 12 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                    required
                  />
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
