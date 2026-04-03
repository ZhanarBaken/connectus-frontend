"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { register, login } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"mentor" | "student">("student")
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
        router.push("/mentors/profile")
      } else {
        router.push("/students/dashboard")
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message)
      } else {
        setError("Ошибка при регистрации. Проверьте данные.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold mb-6">Регистрация</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 py-2 rounded-lg border transition ${
              role === "student" ? "bg-black text-white" : "text-gray-600"
            }`}
          >
            Студент
          </button>
          <button
            type="button"
            onClick={() => setRole("mentor")}
            className={`flex-1 py-2 rounded-lg border transition ${
              role === "mentor" ? "bg-black text-white" : "text-gray-600"
            }`}
          >
            Ментор
          </button>
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          required
        />
        <div>
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
          <p className="text-xs text-gray-400 mt-1">Минимум 12 символов</p>
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 shrink-0"
          />
          <span className="text-sm text-gray-600">
            Я принимаю условия использования и политику конфиденциальности
          </span>
        </label>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !agreedToTerms}
          className="bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading ? "Создаём аккаунт..." : "Создать аккаунт"}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4 text-center">
        Уже есть аккаунт?{" "}
        <Link href="/auth/login" className="underline text-black">
          Войти
        </Link>
      </p>
    </main>
  )
}
