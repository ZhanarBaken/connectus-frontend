"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { fetchAdminMentors, fetchAdminDisputes, fetchOrders } from "@/lib/api"
import Icon from "@/components/Icon"

interface Stats {
  pendingMentors: number
  pendingPayments: number
  openDisputes: number
  totalOrders: number
}

export default function CRMDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([
      fetchAdminMentors("submitted"),
      fetchAdminDisputes(),
      fetchOrders(),
    ])
      .then(([mentors, disputes, orders]) => {
        setStats({
          pendingMentors: mentors.length,
          pendingPayments: orders.filter((o) => o.order_status === "pending_payment").length,
          openDisputes: disputes.filter((d) => !d.resolution).length,
          totalOrders: orders.length,
        })
      })
      .catch(() => setError("Не удалось загрузить статистику"))
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    {
      label: "Ожидают апрува",
      value: stats?.pendingMentors,
      href: "/crm/mentors",
      icon: "school",
      color: "bg-amber-50 text-amber-600",
      urgent: (stats?.pendingMentors ?? 0) > 0,
    },
    {
      label: "Ожидают оплаты",
      value: stats?.pendingPayments,
      href: "/crm/payments",
      icon: "payments",
      color: "bg-blue-50 text-blue-600",
      urgent: (stats?.pendingPayments ?? 0) > 0,
    },
    {
      label: "Открытые споры",
      value: stats?.openDisputes,
      href: "/crm/disputes",
      icon: "gavel",
      color: "bg-red-50 text-red-600",
      urgent: (stats?.openDisputes ?? 0) > 0,
    },
    {
      label: "Всего заказов",
      value: stats?.totalOrders,
      href: "/crm/orders",
      icon: "receipt_long",
      color: "bg-gray-50 text-gray-600",
      urgent: false,
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Дашборд</h1>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse">
              <div className="h-8 bg-gray-100 rounded mb-2" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`bg-white border rounded-2xl p-6 hover:shadow-md transition-shadow ${
                card.urgent ? "border-amber-200" : "border-gray-200"
              }`}
            >
              <div className={`inline-flex p-2 rounded-xl mb-3 ${card.color}`}>
                <Icon name={card.icon} size={20} />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{card.value ?? "—"}</div>
              <div className="text-sm text-gray-500">{card.label}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/crm/mentors", label: "Модерация менторов", icon: "school" },
          { href: "/crm/payments", label: "Подтвердить оплату", icon: "check_circle" },
          { href: "/crm/chats", label: "Анализ чатов", icon: "chat" },
          { href: "/crm/settings", label: "Настройки сайта", icon: "settings" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
