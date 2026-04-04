"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchMentorProfile, submitMentorProfile } from "@/lib/api"
import { MentorProfile } from "@/types"

export default function MentorDashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<MentorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  useEffect(() => {
    const role = localStorage.getItem("role")
    if (!role) { router.replace("/auth/login"); return }
    if (role !== "mentor") { router.replace("/students/dashboard"); return }

    fetchMentorProfile()
      .then(setProfile)
      .finally(() => setLoading(false))
  }, [router])

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError("")
    try {
      await submitMentorProfile()
      const updated = await fetchMentorProfile()
      setProfile(updated)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Ошибка при отправке")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">
        Загрузка...
      </main>
    )
  }

  if (!profile) return null

  const statusBlock = () => {
    if (profile.is_approved) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="font-semibold text-green-800">Профиль одобрен</p>
          <p className="text-sm text-green-700 mt-1">Ты видна студентам на главной странице.</p>
        </div>
      )
    }
    if (profile.is_submitted) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="font-semibold text-amber-800">На проверке</p>
          <p className="text-sm text-amber-700 mt-1">Мы рассмотрим профиль и одобрим его в ближайшее время.</p>
        </div>
      )
    }
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <p className="font-semibold text-gray-800 mb-1">Профиль не отправлен</p>
        <p className="text-sm text-gray-600 mb-4">
          Заполни профиль и отправь на проверку — после одобрения студенты смогут тебя найти.
        </p>
        {submitError && <p className="text-red-500 text-sm mb-3">{submitError}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-black text-white text-sm px-5 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
        >
          {submitting ? "Отправляем..." : "Отправить на проверку"}
        </button>
      </div>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name || "Мой кабинет"}</h1>
          {profile.school_or_university && (
            <p className="text-gray-500 text-sm mt-1">{profile.school_or_university} · {profile.country}</p>
          )}
        </div>
        {profile.is_verified && (
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">Верифицирован</span>
        )}
      </div>

      <div className="mb-8">{statusBlock()}</div>

      <div className="grid grid-cols-1 gap-4">
        <Link href="/mentors/profile"
          className="border rounded-xl p-5 hover:shadow-md transition">
          <p className="font-semibold mb-1">Профиль</p>
          <p className="text-sm text-gray-500">Редактировать информацию о себе</p>
        </Link>
        <Link href="/mentors/services"
          className="border rounded-xl p-5 hover:shadow-md transition">
          <p className="font-semibold mb-1">Услуги</p>
          <p className="text-sm text-gray-500">Управлять каталогом услуг</p>
        </Link>
        <Link href="/orders"
          className="border rounded-xl p-5 hover:shadow-md transition">
          <p className="font-semibold mb-1">Заказы</p>
          <p className="text-sm text-gray-500">Смотреть входящие заказы</p>
        </Link>
      </div>
    </main>
  )
}
