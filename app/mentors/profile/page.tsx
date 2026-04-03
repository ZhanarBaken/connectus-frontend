"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { fetchMentorProfile, updateMentorProfile } from "@/lib/api"
import { MentorProfile } from "@/types"

const EXPERTISE_OPTIONS = [
  { value: "admission", label: "Поступление" },
  { value: "documents", label: "Документы" },
  { value: "scholarships", label: "Стипендии" },
  { value: "visa", label: "Виза" },
]

export default function MentorProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [fullName, setFullName] = useState("")
  const [country, setCountry] = useState("")
  const [school, setSchool] = useState("")
  const [major, setMajor] = useState("")
  const [grant, setGrant] = useState("")
  const [gpa, setGpa] = useState("")
  const [examResults, setExamResults] = useState("")
  const [bio, setBio] = useState("")
  const [linkedin, setLinkedin] = useState("")
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([])
  const [payoutDetails, setPayoutDetails] = useState("")

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
        setLinkedin(p.linkedin_url ?? "")
        setExpertiseAreas(p.expertise_areas.map((e) => e.area))
        setPayoutDetails(p.payout_details ?? "")
      })
      .catch(() => setError("Не удалось загрузить профиль"))
      .finally(() => setLoading(false))
  }, [])

  const toggleExpertise = (area: string) => {
    if (expertiseAreas.includes(area)) {
      setExpertiseAreas(expertiseAreas.filter((a) => a !== area))
    } else {
      setExpertiseAreas([...expertiseAreas, area])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
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
        linkedin_url: linkedin,
        expertise_areas: expertiseAreas.map((area) => ({ area: area as import("@/types").ExpertiseArea })),
        payout_details: payoutDetails,
      })
      router.push("/mentors/dashboard")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при сохранении")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">
        Загрузка...
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Заполни профиль</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Имя</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Страна</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Университет</label>
            <input value={school} onChange={(e) => setSchool(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Специальность</label>
            <input value={major} onChange={(e) => setMajor(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Грант / стипендия</label>
            <input value={grant} onChange={(e) => setGrant(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">GPA</label>
            <input value={gpa} onChange={(e) => setGpa(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Результаты экзаменов</label>
          <input value={examResults} onChange={(e) => setExamResults(e.target.value)}
            placeholder="IELTS 7.5, SAT 1450..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">О себе</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none" />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">LinkedIn</label>
          <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-2">Экспертиза</label>
          <div className="flex gap-2 flex-wrap">
            {EXPERTISE_OPTIONS.map(({ value, label }) => (
              <button key={value} type="button" onClick={() => toggleExpertise(value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  expertiseAreas.includes(value)
                    ? "bg-black text-white border-black"
                    : "text-gray-600 border-gray-300"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Реквизиты для выплаты</label>
          <input value={payoutDetails} onChange={(e) => setPayoutDetails(e.target.value)}
            placeholder="Kaspi: +7 777 123 45 67"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={saving}
          className="bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
      </form>
    </main>
  )
}
