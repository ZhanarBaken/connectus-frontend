"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { fetchMentorProfile, updateMentorProfile } from "@/lib/api"
import { MentorProfile, ExpertiseArea } from "@/types"
import BackButton from "@/components/BackButton"

const EXPERTISE_OPTIONS = [
  { value: "admission", label: "Поступление" },
  { value: "documents", label: "Документы" },
  { value: "scholarships", label: "Стипендии" },
  { value: "visa", label: "Виза" },
]

const COUNTRIES = ["USA", "UK", "Germany", "Spain", "Italy", "France", "Netherlands", "Canada", "Australia"]

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

export default function MentorProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const [fullName, setFullName] = useState("")
  const [country, setCountry] = useState("")
  const [school, setSchool] = useState("")
  const [major, setMajor] = useState("")
  const [grant, setGrant] = useState("")
  const [gpa, setGpa] = useState("")
  const [examResults, setExamResults] = useState("")
  const [bio, setBio] = useState("")
  const [consultation, setConsultation] = useState("")
  const [linkedin, setLinkedin] = useState("")
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([])
  const [payoutDetails, setPayoutDetails] = useState("")

  const CONSULTATION_MIN = 80
  const CONSULTATION_MAX = 2000

  useEffect(() => {
    fetchMentorProfile()
      .then((p: MentorProfile) => {
        setFullName(p.full_name ?? "")
        setCountry(p.country ?? "")
        setSchool(p.school_or_university ?? "")
        setMajor(p.major ?? "")
        setGrant(p.grant_or_scholarship ?? "")
        setGpa(p.gpa ?? "")
        setExamResults(p.exam_results ?? "")
        setBio(p.detailed_bio ?? "")
        setConsultation(p.consultation ?? "")
        setLinkedin(p.linkedin_url ?? "")
        setExpertiseAreas(p.expertise_areas.map((e) => e.area))
        setPayoutDetails(p.payout_details ?? "")
      })
      .catch(() => setError("Не удалось загрузить профиль"))
      .finally(() => setLoading(false))
  }, [])

  const toggleExpertise = (area: string) => {
    setExpertiseAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError("")
    try {
      await updateMentorProfile({
        full_name: fullName,
        country,
        school_or_university: school,
        major,
        grant_or_scholarship: grant,
        gpa,
        exam_results: examResults,
        detailed_bio: bio,
        consultation,
        linkedin_url: linkedin,
        expertise_areas: expertiseAreas.map((area) => ({ area: area as ExpertiseArea })),
        payout_details: payoutDetails,
      })
      setSaved(true)
      setTimeout(() => router.push("/mentor/dashboard"), 1000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при сохранении")
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

  const filledFields = [fullName, country, school, major, bio, grant, expertiseAreas.length > 0].filter(Boolean).length
  const completionPercent = Math.round((filledFields / 7) * 100)

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-2 transition-colors group [-webkit-tap-highlight-color:transparent]" />

            <h1 className="text-2xl font-bold text-gray-900">Редактировать профиль</h1>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">{completionPercent}%</div>
            <div className="text-xs text-gray-400">заполнено</div>
          </div>
        </div>

        {/* Progress */}
        <div className="h-2 bg-gray-100 rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${completionPercent}%` }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Основная информация</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Полное имя">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Назгуль Ахметова" className={inputClass} />
              </Field>
              <Field label="Страна обучения">
                <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
                  <option value="">Выбрать страну</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Университет">
                <input value={school} onChange={(e) => setSchool(e.target.value)}
                  placeholder="MIT, UCL, TU Munich..." className={inputClass} />
              </Field>
              <Field label="Специальность">
                <input value={major} onChange={(e) => setMajor(e.target.value)}
                  placeholder="Computer Science" className={inputClass} />
              </Field>
              <Field label="Грант / стипендия">
                <input value={grant} onChange={(e) => setGrant(e.target.value)}
                  placeholder="Болашак, Chevening, DAAD..." className={inputClass} />
              </Field>
              <Field label="GPA">
                <input value={gpa} onChange={(e) => setGpa(e.target.value)}
                  placeholder="3.8 / 4.0" className={inputClass} />
              </Field>
            </div>
          </div>

          {/* Exams & social */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Экзамены и ссылки</h2>
            <div className="space-y-5">
              <Field label="Результаты экзаменов" hint="Укажи баллы: IELTS, TOEFL, SAT, GRE и т.д.">
                <input value={examResults} onChange={(e) => setExamResults(e.target.value)}
                  placeholder="IELTS 7.5, SAT 1480, GRE 320..." className={inputClass} />
              </Field>
              <Field label="LinkedIn" hint="Необязательно — помогает студентам убедиться в твоих достижениях">
                <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/..." className={inputClass} />
              </Field>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">О себе</h2>
            <Field label="Расскажи свою историю" hint="Минимум 3-4 предложения. Что ты прошёл, как можешь помочь.">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={5}
                placeholder="Я поступила в MIT из Алматы через стипендию Болашак. Помогаю студентам составить план поступления, написать эссе и подать заявки в топ университеты США..."
                className={`${inputClass} resize-none`} />
            </Field>
          </div>

          {/* Free consultation description */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Бесплатная консультация</h2>
            <p className="text-sm text-gray-500 mb-5">
              Это описание увидят студенты на твоём профиле. Расскажи что ты обсудишь на вводной встрече.
            </p>
            <Field
              label="Что обсудим на консультации"
              hint={`От ${CONSULTATION_MIN} до ${CONSULTATION_MAX} символов · сейчас ${consultation.trim().length}`}
            >
              <textarea
                value={consultation}
                onChange={(e) => setConsultation(e.target.value)}
                rows={5}
                minLength={CONSULTATION_MIN}
                maxLength={CONSULTATION_MAX}
                placeholder="Бесплатная вводная консультация — 60 минут. Обсудим твои цели, текущую ситуацию и составим пошаговый план: какие документы готовить, в какие университеты подаваться и на что обратить внимание в первую очередь."
                className={`${inputClass} resize-none ${
                  consultation.trim().length > 0 && consultation.trim().length < CONSULTATION_MIN
                    ? "border-red-200 focus:ring-red-100 focus:border-red-300"
                    : ""
                }`}
              />
            </Field>
          </div>

          {/* Expertise */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Специализация</h2>
            <p className="text-sm text-gray-400 mb-5">В чём ты помогаешь студентам?</p>
            <div className="flex flex-wrap gap-3">
              {EXPERTISE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleExpertise(value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    expertiseAreas.includes(value)
                      ? "border-gray-900 bg-gray-50 text-gray-900"
                      : "border-gray-100 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  {expertiseAreas.includes(value) && <span className="mr-1.5">✓</span>}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Payout */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Реквизиты для выплаты</h2>
            <p className="text-sm text-gray-400 mb-5">Видно только администратору платформы — не студентам</p>
            <Field label="Реквизиты">
              <input value={payoutDetails} onChange={(e) => setPayoutDetails(e.target.value)}
                placeholder="Kaspi: +7 777 123 45 67 / IBAN: KZ..." className={inputClass} />
            </Field>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {saved && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700">
              ✓ Профиль сохранён! Перенаправляем...
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "Сохраняем..." : "Сохранить профиль"}
          </button>
        </form>
      </div>
    </div>
  )
}
