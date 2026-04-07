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
  const isStudent = role === "student"
  const isAuthed = isMentor || isStudent
  const homeHref = isMentor ? "/mentor/dashboard" : "/"

  interface NavLink {
    href: string
    label: string
    icon?: string
    matchPrefixes?: string[]  // additional pathname prefixes considered "active"
  }

  const mentorNav: NavLink[] = [
    { href: "/mentor/dashboard", label: "Кабинет", icon: "📊" },
    { href: "/mentors/profile", label: "Профиль", icon: "👤" },
    { href: "/mentors/services", label: "Услуги", icon: "📋" },
    { href: "/orders", label: "Заказы", icon: "📥", matchPrefixes: ["/orders"] },
    { href: "/messages", label: "Сообщения", icon: "💬" },
  ]

  const studentNav: NavLink[] = [
    { href: "/student/dashboard", label: "Кабинет", icon: "📊" },
    { href: "/mentors", label: "Найти ментора", icon: "🔍" },
    { href: "/orders", label: "Мои заказы", icon: "📋", matchPrefixes: ["/orders"] },
    { href: "/messages", label: "Сообщения", icon: "💬" },
    { href: "/students/profile", label: "Профиль", icon: "👤" },
  ]

  const guestNav: NavLink[] = [
    { href: "/mentors", label: "Менторы" },
    { href: "/#how-it-works", label: "Как это работает" },
    { href: "/#categories", label: "Направления" },
    { href: "/become-mentor", label: "Стать ментором" },
  ]

  const navLinks: NavLink[] = isMentor ? mentorNav : isStudent ? studentNav : guestNav

  const isActive = (link: NavLink) => {
    if (pathname === link.href) return true
    if (link.matchPrefixes?.some((p) => pathname.startsWith(p))) return true
    return false
  }

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
        {isAuthed ? (
          <nav className="hidden md:flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-2xl p-1">
            {navLinks.map((link) => {
              const active = isActive(link)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transform-gpu transition-[background-color,color,box-shadow] duration-200 ease-out [-webkit-tap-highlight-color:transparent] ${
                    active
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-600 hover:text-indigo-600 hover:bg-white/60"
                  }`}
                >
                  {link.icon && (
                    <span className={`text-base leading-none transition-transform duration-200 ${active ? "" : "group-hover:scale-110"}`}>
                      {link.icon}
                    </span>
                  )}
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-indigo-600 transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Auth buttons */}
        <div className="hidden md:flex items-center gap-3">
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
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-1">
          {navLinks.map((link) => {
            const active = isAuthed && isActive(link)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                }`}
              >
                {link.icon && <span className="text-base leading-none">{link.icon}</span>}
                <span>{link.label}</span>
              </Link>
            )
          })}
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
