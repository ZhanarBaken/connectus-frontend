"use client"

import { useState } from "react"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: подключить к api.ts login()
    alert(`Вход: ${email}`)
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
        <button
          type="submit"
          className="bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
        >
          Войти
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
