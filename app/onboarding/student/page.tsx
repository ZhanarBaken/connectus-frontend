"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateStudentProfile } from "@/lib/api"

const STEPS = ["Основное", "Учёба"]

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

export default function StudentOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Step 1
  const [fullName, setFullName] = useState("")
  const [age, setAge] = useState("")

  // Step 2
  const [school, setSchool] = useState("")

  const handleFinish = async () => {
    setSaving(true)
    setError("")
    try {
      await updateStudentProfile({
        full_name: fullName,
        age: Number(age) || 0,
        current_school_or_university: school,
      })
      router.push("/student/dashboard")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при сохранении")
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 justify-center mb-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </div>
          <p className="text-gray-500 text-sm">Расскажи о себе — это займёт минуту</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => {
            const s = i + 1
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                  step === s ? "bg-gray-900 text-white" : step > s ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-400"
                }`}>
                  {step > s ? "✓" : s}. {label}
                </div>
                {i < STEPS.length - 1 && <div className={`w-6 h-0.5 ${step > s ? "bg-gray-300" : "bg-gray-100"}`} />}
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Как тебя зовут?</h1>
              <p className="text-gray-400 text-sm mb-6">Эту информацию увидит твой ментор</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Полное имя</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
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
                    placeholder="17"
                    min={10}
                    max={60}
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!fullName.trim()}
                className="w-full mt-6 bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
              >
                Продолжить →
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Где ты учишься?</h1>
              <p className="text-gray-400 text-sm mb-6">Школа, колледж или университет</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Учебное заведение</label>
                <input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="НИШ Алматы, школа №1..."
                  className={inputClass}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mt-4">{error}</div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3.5 rounded-xl font-medium hover:border-gray-300 transition-colors text-sm"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving || !school.trim()}
                  className="flex-1 bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
                >
                  {saving ? "Сохраняем..." : "Готово →"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-300 mt-4">
          Можно изменить позже в профиле
        </p>
      </div>
    </div>
  )
}
