"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Icon from "@/components/Icon"
import { clearStoredSupportChatSessionId } from "@/lib/supportChat"

const NAV = [
  { href: "/crm", label: "Дашборд", icon: "dashboard", exact: true },
  { href: "/crm/mentors", label: "Менторы", icon: "school" },
  { href: "/crm/payments", label: "Платежи", icon: "payments" },
  { href: "/crm/orders", label: "Заказы", icon: "receipt_long" },
  { href: "/crm/disputes", label: "Споры", icon: "gavel" },
  { href: "/crm/users", label: "Пользователи", icon: "people" },
  { href: "/crm/chats", label: "Чаты", icon: "chat" },
  { href: "/crm/support-chat", label: "Чат поддержки", icon: "support_agent" },
  { href: "/crm/settings", label: "Настройки", icon: "settings" },
]

// Everything app/crm/layout.tsx used to do directly, before the
// multi-root-layout split required that file to become a thin server
// component (root layouts can't be "use client" and export metadata at
// the same time). CRM is outside the locale-routing tree entirely, so
// this stays on plain next/navigation — no next-intl involvement.
export default function CRMShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const role = localStorage.getItem("role")
    if (role !== "admin") {
      router.replace("/")
      return
    }
    setReady(true)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("role")
    // Same account-bound-session cleanup as Header.tsx's handleLogout —
    // an admin may have browsed the public site (and the widget) under
    // this account before landing in CRM.
    clearStoredSupportChatSessionId()
    router.replace("/")
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col py-4">
        <div className="px-4 pb-4 border-b border-gray-100 mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">CRM</span>
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon name={item.icon} size={18} filled={active} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto flex items-center gap-2.5 px-3 py-2 mx-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Icon name="logout" size={18} />
          Выйти
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
