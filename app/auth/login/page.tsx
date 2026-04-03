"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { login, fetchMe } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await login(email, password)
      localStorage.setItem("access_token", data.access)
      localStorage.setItem("refresh_token", data.refresh)
      const me = await fetchMe(data.access)
      localStorage.setItem("role", me.role)
      const next = searchParams.get("next")
      if (next) {
        router.push(next)
      } else if (me.role === "mentor") {
        router.push("/mentors/dashboard")
      } else {
        router.push("/students/dashboard")
      }
    } catch {
      setError("Неверный email или пароль")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold mb-6">Войти</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4 text-center">
        Нет аккаунта?{" "}
        <Link href="/auth/register" className="underline text-black">
          Зарегистрироваться
        </Link>
      </p>
    </main>
  )
}
