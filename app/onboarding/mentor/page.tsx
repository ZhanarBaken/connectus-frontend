"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateMentorProfile } from "@/lib/api"
import { ExpertiseArea } from "@/types"

const STEPS = ["О себе", "Университет", "Экспертиза"]

const COUNTRIES = ["USA", "UK", "Germany", "Spain", "Italy", "France", "Netherlands", "Canada", "Australia"]
const COUNTRY_LABELS: Record<string, string> = {
  USA: "🇺🇸 США", UK: "🇬🇧 Великобритания", Germany: "🇩🇪 Германия",
  Spain: "🇪🇸 Испания", Italy: "🇮🇹 Италия", France: "🇫🇷 Франция",
  Netherlands: "🇳🇱 Нидерланды", Canada: "🇨🇦 Канада", Australia: "🇦🇺 Австралия",
}

const EXPERTISE_OPTIONS = [
  { value: "admission", label: "Поступление", icon: "🎯" },
  { value: "scholarships", label: "Стипендии", icon: "🏅" },
  { value: "documents", label: "Документы", icon: "📄" },
  { value: "visa", label: "Виза", icon: "🛂" },
]

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

export default function MentorOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Step 1
  const [fullName, setFullName] = useState("")
  const [bio, setBio] = useState("")

  // Step 2
  const [country, setCountry] = useState("")
  const [school, setSchool] = useState("")
  const [major, setMajor] = useState("")
  const [grant, setGrant] = useState("")
  const [gpa, setGpa] = useState("")
  const [examResults, setExamResults] = useState("")

  // Step 3
  const [expertise, setExpertise] = useState<string[]>([])

  const toggleExpertise = (val: string) => {
    setExpertise((prev) => prev.includes(val) ? prev.filter((e) => e !== val) : [...prev, val])
  }

  const handleFinish = async () => {
    setSaving(true)
    setError("")
    try {
      await updateMentorProfile({
        full_name: fullName,
        detailed_bio: bio,
        country,
        school_or_university: school,
        major,
        grant_or_scholarship: grant,
        gpa,
        exam_results: examResults,
        expertise_areas: expertise.map((area) => ({ area: area as ExpertiseArea })),
      })
      router.push("/mentor/dashboard")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при сохранении")
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 justify-center mb-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </div>
          <p className="text-gray-500 text-sm">Создай профиль — студенты увидят тебя после проверки</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => {
            const s = i + 1
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                  step === s ? "bg-indigo-600 text-white" : step > s ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"
                }`}>
                  {step > s ? "✓" : s}. {label}
                </div>
                {i < STEPS.length - 1 && <div className={`w-6 h-0.5 ${step > s ? "bg-indigo-200" : "bg-gray-100"}`} />}
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* Step 1 — Basic info */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Расскажи о себе</h1>
              <p className="text-gray-400 text-sm mb-6">Студенты увидят это на твоей странице</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Полное имя</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Назгуль Ахметова"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">О себе</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Я поступила в MIT из Алматы через стипендию Болашак. Помогаю студентам составить план поступления, написать эссе и подать заявки в топ университеты..."
                    className={`${inputClass} resize-none`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Минимум 2-3 предложения — это влияет на доверие студентов</p>
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!fullName.trim() || !bio.trim()}
                className="w-full mt-6 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 text-sm"
              >
                Продолжить →
              </button>
            </div>
          )}

          {/* Step 2 — University */}
          {step === 2 && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Твой университет</h1>
              <p className="text-gray-400 text-sm mb-6">Это главное доказательство твоей экспертизы</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Страна</label>
                  <div className="grid grid-cols-3 gap-2">
                    {COUNTRIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCountry(c)}
                        className={`px-2 py-2 rounded-xl text-xs border-2 font-medium transition-all text-left ${
                          country === c
                            ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                            : "border-gray-100 text-gray-600 hover:border-gray-200"
                        }`}
                      >
                        {COUNTRY_LABELS[c] || c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Университет</label>
                  <input
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="MIT, UCL, TU Munich..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Специальность</label>
                  <input
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="Computer Science, Economics..."
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Грант / стипендия</label>
                    <input
                      value={grant}
                      onChange={(e) => setGrant(e.target.value)}
                      placeholder="Болашак, Chevening..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">GPA</label>
                    <input
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      placeholder="3.8 / 4.0"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Результаты экзаменов</label>
                  <input
                    value={examResults}
                    onChange={(e) => setExamResults(e.target.value)}
                    placeholder="IELTS 7.5, SAT 1480..."
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3.5 rounded-xl font-medium hover:border-gray-300 transition-colors text-sm"
                >
                  ← Назад
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!school.trim() || !country}
                  className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 text-sm"
                >
                  Продолжить →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Expertise */}
          {step === 3 && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Чем ты помогаешь?</h1>
              <p className="text-gray-400 text-sm mb-6">Выбери свои направления — можно несколько</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {EXPERTISE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleExpertise(opt.value)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                      expertise.includes(opt.value)
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span className={`text-sm font-medium ${expertise.includes(opt.value) ? "text-indigo-700" : "text-gray-700"}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-indigo-700 leading-relaxed">
                  После заполнения профиль уйдёт на проверку. Мы верифицируем его в течение <strong>48 часов</strong> и опубликуем на платформе.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3.5 rounded-xl font-medium hover:border-gray-300 transition-colors text-sm"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving || expertise.length === 0}
                  className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 text-sm"
                >
                  {saving ? "Сохраняем..." : "Отправить профиль →"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-300 mt-4">
          Можно изменить позже в личном кабинете
        </p>
      </div>
    </div>
  )
}
