"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchOrders } from "@/lib/api"
import { Order } from "@/types"
import { Avatar } from "@/components/Avatar"

interface StudentRow {
  id: number
  full_name: string
  school: string
  photo: string | null
  orderCount: number
  lastOrder: string
  statuses: string[]
}

export default function CRMUsersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    fetchOrders()
      .then(setOrders)
      .catch(() => setError("Не удалось загрузить данные"))
      .finally(() => setLoading(false))
  }, [])

  const students = useMemo<StudentRow[]>(() => {
    const map = new Map<number, StudentRow>()
    for (const o of orders) {
      const sid = o.student
      if (!map.has(sid)) {
        map.set(sid, {
          id: sid,
          full_name: o.student_info?.full_name || `Студент #${sid}`,
          school: o.student_info?.current_school_or_university || "",
          photo: o.student_info?.profile_photo || null,
          orderCount: 0,
          lastOrder: o.created_at,
          statuses: [],
        })
      }
      const row = map.get(sid)!
      row.orderCount++
      if (o.created_at > row.lastOrder) row.lastOrder = o.created_at
      if (!row.statuses.includes(o.order_status)) row.statuses.push(o.order_status)
    }
    return Array.from(map.values()).sort((a, b) => b.lastOrder.localeCompare(a.lastOrder))
  }, [orders])

  const filtered = useMemo(() => {
    if (!search.trim()) return students
    const q = search.toLowerCase()
    return students.filter(
      (s) => s.full_name.toLowerCase().includes(q) || s.school.toLowerCase().includes(q),
    )
  }, [students, search])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Студенты</h1>
        <span className="text-sm text-gray-400">{students.length} всего</span>
      </div>

      <input
        type="text"
        placeholder="Поиск по имени или школе..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 mb-4"
      />

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Нет студентов</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Студент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Школа/вуз</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Заказы</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Статусы</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Последний заказ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={s.full_name} src={s.photo} className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700" />
                      <span className="font-medium text-gray-900">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.school || "—"}</td>
                  <td className="px-4 py-3 font-medium">{s.orderCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {s.statuses.map((st) => (
                        <span key={st} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {st}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(s.lastOrder).toLocaleDateString("ru-RU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
