"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { fetchMentor, createOrder, fetchOrders } from "@/lib/api"
import { Mentor } from "@/types"

interface Props {
  params: Promise<{ id: string }>
}

export default function MentorPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)
  const [bookError, setBookError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace(`/auth/login?next=/mentors/${id}`)
      return
    }

    Promise.all([fetchMentor(Number(id)), fetchOrders()])
      .then(([m, orders]) => {
        setMentor(m)
        const consultationIds = new Set(
          m.services.filter((s) => s.is_consultation).map((s) => s.id)
        )
        const alreadyBooked = orders.some((o) =>
          consultationIds.has(o.mentor_service) &&
          o.order_status !== "cancelled"
        )
        if (alreadyBooked) setBooked(true)
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading || !mentor) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">
        Загрузка...
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
          {mentor.full_name[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{mentor.full_name}</h1>
          <p className="text-gray-500">{mentor.school_or_university} · {mentor.country}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {mentor.expertise_areas.map((e) => (
          <span key={e.area} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
            {e.area}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-400">GPA</p>
          <p className="font-semibold">{mentor.gpa}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-400">Экзамены</p>
          <p className="font-semibold">{mentor.exam_results}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-400">Грант</p>
          <p className="font-semibold">{mentor.grant_or_scholarship}</p>
        </div>
      </div>

      {mentor.detailed_bio && (
        <p className="text-gray-700 mb-8">{mentor.detailed_bio}</p>
      )}

      <div className="mb-8">
        {booked ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <p className="font-semibold text-green-800">Заявка принята</p>
            <p className="text-sm text-green-700 mt-1">
              Ментор свяжется с тобой для согласования времени.
            </p>
          </div>
        ) : (
          <>
            {bookError && <p className="text-red-500 text-sm mb-2">{bookError}</p>}
            <button
              onClick={async () => {
                const consultation = mentor.services.find((s) => s.is_consultation)
                if (!consultation) {
                  setBookError("Услуга консультации недоступна")
                  return
                }
                setBooking(true)
                setBookError("")
                try {
                  await createOrder(consultation.id)
                  setBooked(true)
                } catch (e: unknown) {
                  setBookError(e instanceof Error ? e.message : "Ошибка при записи")
                } finally {
                  setBooking(false)
                }
              }}
              disabled={booking || !mentor.is_accepting_bookings}
              className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-50"
            >
              {booking ? "Отправляем..." : "Записаться на консультацию"}
            </button>
            {!mentor.is_accepting_bookings && (
              <p className="text-sm text-gray-400 mt-2 text-center">Ментор сейчас не принимает записи</p>
            )}
          </>
        )}
      </div>

      {mentor.services.filter((s) => !s.is_consultation).length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-4 mt-8">Услуги</h2>
          <div className="grid gap-3">
            {mentor.services.filter((s) => !s.is_consultation).map((service) => (
              <div key={service.id} className="border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{service.title}</p>
                  <p className="text-sm text-gray-500">{service.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{service.duration_minutes} мин</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">${service.price}</p>
                  <button className="mt-2 bg-black text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-800 transition">
                    Заказать
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
