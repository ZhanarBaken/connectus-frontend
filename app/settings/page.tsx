"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { fetchMentorProfile, updateMentorProfile, fetchStudentProfile, updateStudentProfile } from "@/lib/api"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"

interface ToggleProps {
  label: string
  description: string
  icon: string
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
}

function Toggle({ label, description, icon, checked, onChange, disabled }: ToggleProps) {
  return (
    <div className="flex items-start gap-4 py-4">
      <Icon name={icon} size={22} className={checked ? "text-indigo-600 mt-0.5" : "text-gray-400 mt-0.5"} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        aria-pressed={checked}
        className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? "bg-indigo-600" : "bg-gray-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block w-5 h-5 rounded-full bg-white shadow transform-gpu transition-transform duration-200 mt-0.5 ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  // Mentor settings
  const [isPublic, setIsPublic] = useState(true)
  const [isAcceptingBookings, setIsAcceptingBookings] = useState(true)

  // Student settings
  const [studentIsPublic, setStudentIsPublic] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const r = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    setRole(r)

    if (r === "mentor") {
      fetchMentorProfile()
        .then((p) => {
          setIsPublic(p.is_public)
          setIsAcceptingBookings(p.is_accepting_bookings)
        })
        .catch(() => setError("Не удалось загрузить настройки"))
        .finally(() => setLoading(false))
    } else if (r === "student") {
      fetchStudentProfile()
        .then((p) => {
          setStudentIsPublic(p.is_public ?? true)
        })
        .catch(() => setError("Не удалось загрузить настройки"))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [router])

  const handleSaveMentor = async (field: string, value: boolean) => {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const updated = await updateMentorProfile({ [field]: value })
      setIsPublic(updated.is_public)
      setIsAcceptingBookings(updated.is_accepting_bookings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить")
      // Revert on error
      if (field === "is_public") setIsPublic(!value)
      if (field === "is_accepting_bookings") setIsAcceptingBookings(!value)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStudent = async (value: boolean) => {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      await updateStudentProfile({ is_public: value })
      setStudentIsPublic(value)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить")
      setStudentIsPublic(!value)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-4 transition-colors group [-webkit-tap-highlight-color:transparent]" />
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Настройки</h1>
        <p className="text-sm text-gray-500 mb-8">Управляй видимостью и параметрами аккаунта</p>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-6 flex items-center gap-2">
            <Icon name="error" size={16} className="text-red-500" />
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700 mb-6 flex items-center gap-2">
            <Icon name="check_circle" size={16} className="text-green-600" filled />
            Сохранено
          </div>
        )}

        {role === "mentor" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 divide-y divide-gray-50">
            <Toggle
              label="Видимость профиля"
              description="Когда включено, студенты видят тебя в каталоге менторов и могут зайти на твою страницу."
              icon="visibility"
              checked={isPublic}
              onChange={(val) => {
                setIsPublic(val)
                handleSaveMentor("is_public", val)
              }}
              disabled={saving}
            />
            <Toggle
              label="Приём заявок"
              description="Когда включено, студенты могут отправлять запросы на консультацию и заказывать услуги."
              icon="event_available"
              checked={isAcceptingBookings}
              onChange={(val) => {
                setIsAcceptingBookings(val)
                handleSaveMentor("is_accepting_bookings", val)
              }}
              disabled={saving}
            />
          </div>
        )}

        {role === "student" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <Toggle
              label="Видимость профиля"
              description="Когда включено, менторы видят твоё имя и учебное заведение в информации о заказе."
              icon="visibility"
              checked={studentIsPublic}
              onChange={(val) => {
                setStudentIsPublic(val)
                handleSaveStudent(val)
              }}
              disabled={saving}
            />
          </div>
        )}
      </div>
    </div>
  )
}
