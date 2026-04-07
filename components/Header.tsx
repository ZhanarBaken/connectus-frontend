"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setRole(localStorage.getItem("role"))
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("role")
    setRole(null)
    router.push("/")
  }

  const isMentor = role === "mentor"
  const homeHref = isMentor ? "/mentor/dashboard" : "/"

  const mentorNav = [
    { href: "/mentor/dashboard", label: "Кабинет" },
    { href: "/mentors/profile", label: "Профиль" },
    { href: "/mentors/services", label: "Услуги" },
    { href: "/orders", label: "Заказы" },
  ]

  const studentNav = [
    { href: "/mentors", label: "Найти ментора" },
    { href: "/orders", label: "Мои заказы" },
  ]

  const guestNav = [
    { href: "/mentors", label: "Менторы" },
    { href: "/#how-it-works", label: "Как это работает" },
    { href: "/#categories", label: "Направления" },
  ]

  const navLinks = isMentor ? mentorNav : role === "student" ? studentNav : guestNav

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href={homeHref} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Connectus</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-indigo-600 transition-colors font-medium">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          {role === "student" && (
            <Link href="/student/dashboard" className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              Мой кабинет
            </Link>
          )}
          {role ? (
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Выйти
            </button>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors px-3 py-2"
              >
                Войти
              </Link>
              <Link
                href="/auth/register"
                className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <div className="w-5 h-0.5 bg-gray-600 mb-1" />
          <div className="w-5 h-0.5 bg-gray-600 mb-1" />
          <div className="w-5 h-0.5 bg-gray-600" />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-gray-600 hover:text-indigo-600 font-medium py-1">
              {link.label}
            </Link>
          ))}
          {role ? (
            <button onClick={handleLogout} className="text-sm text-gray-500 text-left py-1">
              Выйти
            </button>
          ) : (
            <div className="flex gap-3 pt-2">
              <Link href="/auth/login" className="text-sm text-gray-600 font-medium px-4 py-2 border border-gray-200 rounded-xl">
                Войти
              </Link>
              <Link href="/auth/register" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium">
                Регистрация
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
