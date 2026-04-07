"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { fetchStudentProfile, updateStudentProfile } from "@/lib/api"
import { StudentProfile } from "@/types"
import BackButton from "@/components/BackButton"

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

export default function StudentProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const [fullName, setFullName] = useState("")
  const [age, setAge] = useState("")
  const [school, setSchool] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const role = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    if (role === "mentor") { router.replace("/mentor/dashboard"); return }

    fetchStudentProfile()
      .then((p: StudentProfile) => {
        setFullName(p.full_name ?? "")
        setAge(p.age != null ? String(p.age) : "")
        setSchool(p.current_school_or_university ?? "")
      })
      .catch(() => setError("Не удалось загрузить профиль"))
      .finally(() => setLoading(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError("")
    try {
      await updateStudentProfile({
        full_name: fullName,
        age: Number(age) || 0,
        current_school_or_university: school,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при сохранении")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-2 transition-colors group [-webkit-tap-highlight-color:transparent]" />

          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Мой профиль</h1>
          <p className="text-sm text-gray-500 mt-1">Эту информацию увидит твой ментор</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 space-y-5">
          {/* Avatar preview */}
          <div className="flex items-center gap-4 pb-6 border-b border-gray-50">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-600 font-bold text-2xl">
                {fullName.trim().charAt(0).toUpperCase() || "?"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{fullName.trim() || "Без имени"}</p>
              <p className="text-xs text-gray-400">Так тебя увидят менторы</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Полное имя</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Айгерим Бекова"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Возраст</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min={10}
              max={60}
              placeholder="17"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Учебное заведение</label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="НИШ Алматы, школа №1..."
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Школа, колледж или университет где ты сейчас учишься</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !fullName.trim()}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-[10px]">✓</span>
                Сохранено
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
