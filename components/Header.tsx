"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { fetchChatUnread } from "@/lib/api"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import { TG_AUTH_EVENT } from "./TelegramAutoLogin"
import Icon from "./Icon"
import Logo from "./Logo"
import NotificationBell from "./NotificationBell"
import LocaleSwitcher from "./LocaleSwitcher"
import { useT } from "@/lib/i18n/LocaleProvider"

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const t = useT()
  const [role, setRole] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)
  const { isInTelegram } = useTelegramWebApp()

  useEffect(() => {
    setRole(localStorage.getItem("role"))
  }, [pathname])

  // Poll chat unread count
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (!token) return
    let active = true
    const poll = () => {
      fetchChatUnread()
        .then((d) => { if (active) setChatUnread(d.total) })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, 30_000)
    return () => { active = false; clearInterval(id) }
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("role")
    setRole(null)
    router.push("/")
  }

  // In a Telegram Mini App, "Войти" / "Регистрация" don't open the
  // email/password form — they trigger telegramMiniAppLogin(initData)
  // via the global overlay. Backend recognises the user by telegram_id;
  // for first-time visitors it returns role_required and the overlay
  // shows a role picker.
  const triggerTgAuth = () => {
    setMenuOpen(false)
    window.dispatchEvent(new Event(TG_AUTH_EVENT))
  }

  const isMentor = role === "mentor"
  const isStudent = role === "student"
  const isAdmin = role === "admin"
  const isAuthed = isMentor || isStudent || isAdmin
  const homeHref = isMentor ? "/mentor/dashboard" : isAdmin ? "/crm" : "/"

  interface NavLink {
    href: string
    label: string
    icon?: string
    matchPrefixes?: string[]
    badge?: number
  }

  const mentorNav: NavLink[] = [
    { href: "/mentor/dashboard", label: t("nav.dashboard"), icon: "dashboard" },
    { href: "/mentors/profile", label: t("nav.profile"), icon: "person" },
    { href: "/mentors/schedule", label: t("nav.schedule"), icon: "calendar_month" },
    { href: "/mentors/services", label: t("nav.services"), icon: "description" },
    { href: "/orders", label: t("nav.clients"), icon: "people", matchPrefixes: ["/orders"], badge: chatUnread || undefined },
    { href: "/settings", label: t("nav.settings"), icon: "settings" },
  ]

  const studentNav: NavLink[] = [
    { href: "/student/dashboard", label: t("nav.dashboard"), icon: "dashboard" },
    { href: "/mentors", label: t("nav.find_mentor"), icon: "search" },
    { href: "/messages", label: t("nav.messages"), icon: "chat", badge: chatUnread || undefined },
    { href: "/students/profile", label: t("nav.profile"), icon: "person" },
    { href: "/settings", label: t("nav.settings"), icon: "settings" },
  ]

  const guestNav: NavLink[] = [
    { href: "/mentors", label: t("nav.mentors") },
    { href: "/#how-it-works", label: t("nav.how_it_works") },
    { href: "/#categories", label: t("nav.categories") },
    { href: "/become-mentor", label: t("nav.become_mentor") },
  ]

  const adminNav: NavLink[] = [
    { href: "/crm", label: "CRM", icon: "admin_panel_settings" },
  ]

  const navLinks: NavLink[] = isMentor ? mentorNav : isStudent ? studentNav : isAdmin ? adminNav : guestNav

  const isActive = (link: NavLink) => {
    if (pathname === link.href) return true
    if (link.matchPrefixes?.some((p) => pathname.startsWith(p))) return true
    return false
  }

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href={homeHref} className="flex items-center gap-2">
          <Logo size={32} className="text-gray-900" />
          <span className="text-xl font-bold text-gray-900">Connectus</span>
        </Link>

        {/* Nav links */}
        {isAuthed ? (
          <nav className="hidden md:flex items-center gap-1 bg-[#fafafa] border border-gray-200/60 rounded-2xl p-1">
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
                    <Icon
                      name={link.icon}
                      size={18}
                      filled={active}
                      className={`transition-transform duration-200 ${active ? "" : "group-hover:scale-110"}`}
                    />
                  )}
                  <span>{link.label}</span>
                  {link.badge != null && link.badge > 0 && (
                    <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {link.badge > 99 ? "99+" : link.badge}
                    </span>
                  )}
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
        <div className="hidden md:flex items-center gap-2">
          <LocaleSwitcher />
          {role ? (
            <>
              <NotificationBell />
              {!isInTelegram && (
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors px-2 py-2"
                >
                  {t("header.logout")}
                </button>
              )}
            </>
          ) : isInTelegram ? (
            // Only "Регистрация" in Mini App. The single TG entry calls
            // telegramMiniAppLogin(initData), which logs in existing
            // users by telegram_id and creates an account for new ones
            // — covers both login and signup. A separate "Войти" would
            // either lead to the email form (which can't link telegram
            // safely) or duplicate the same TG flow.
            <button
              onClick={triggerTgAuth}
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors font-medium"
            >
              {t("header.signup")}
            </button>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors px-3 py-2"
              >
                {t("header.login")}
              </Link>
              <Link
                href="/auth/register"
                className="text-sm bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors font-medium"
              >
                {t("header.signup")}
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
        <div className="md:hidden border-t border-gray-200/60 bg-white px-4 py-4 flex flex-col gap-1">
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
                {link.icon && <Icon name={link.icon} size={18} filled={active} />}
                <span className="flex-1">{link.label}</span>
                {link.badge != null && link.badge > 0 && (
                  <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {link.badge > 99 ? "99+" : link.badge}
                  </span>
                )}
              </Link>
            )
          })}
          {role ? (
            !isInTelegram && (
              <button onClick={handleLogout} className="text-sm text-gray-500 text-left py-1">
                {t("header.logout")}
              </button>
            )
          ) : isInTelegram ? (
            <div className="flex gap-3 pt-2">
              <button onClick={triggerTgAuth} className="text-sm bg-gray-900 text-white px-4 py-2 rounded-xl font-medium">
                {t("header.signup")}
              </button>
            </div>
          ) : (
            <div className="flex gap-3 pt-2">
              <Link href="/auth/login" className="text-sm text-gray-600 font-medium px-4 py-2 border border-gray-200 rounded-xl">
                {t("header.login")}
              </Link>
              <Link href="/auth/register" className="text-sm bg-gray-900 text-white px-4 py-2 rounded-xl font-medium">
                {t("header.signup")}
              </Link>
            </div>
          )}
          <div className="pt-3">
            <LocaleSwitcher />
          </div>
        </div>
      )}
    </header>
  )
}
