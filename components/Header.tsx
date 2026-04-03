"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function Header() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    setRole(localStorage.getItem("role"))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("role")
    setRole(null)
    router.push("/")
  }

  return (
    <header className="border-b">
      <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">Connectus</Link>
        <div className="flex gap-4 text-sm items-center">
          {role === "mentor" && (
            <Link href="/mentors/dashboard" className="text-gray-600 hover:text-black">
              Мой кабинет
            </Link>
          )}
          {role === "student" && (
            <Link href="/students/dashboard" className="text-gray-600 hover:text-black">
              Мой кабинет
            </Link>
          )}
          {role ? (
            <button onClick={handleLogout} className="text-gray-500 hover:text-black">
              Выйти
            </button>
          ) : (
            <>
              <Link href="/auth/login" className="text-gray-600 hover:text-black">Войти</Link>
              <Link href="/auth/register" className="bg-black text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 transition">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
