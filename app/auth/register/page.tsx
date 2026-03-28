"use client"

import { useState } from "react"
import Link from "next/link"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"mentor" | "student">("student")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: подключить к api.ts register()
    alert(`Регистрация: ${email} как ${role}`)
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
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          required
        />
        <button
          type="submit"
          className="bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
        >
          Создать аккаунт
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
