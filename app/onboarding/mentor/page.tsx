"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { authFetch, fetchMe, fetchMentorProfile, updateMentorProfile } from "@/lib/api"
import { POPULAR_COUNTRY_CODES, countryFlag, countryLabel } from "@/lib/countries"
import { ExpertiseArea } from "@/types"
import AvatarCropperModal from "@/components/AvatarCropperModal"
import CountryPickerModal from "@/components/CountryPickerModal"
import Icon from "@/components/Icon"
import Logo from "@/components/Logo"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

const STEPS = ["Фото", "О себе", "Университет", "Экспертиза", "Документы"]

const EXPERTISE_OPTIONS = [
  { value: "admission", label: "Поступление", icon: "flag" },
  { value: "scholarships", label: "Стипендии", icon: "military_tech" },
  { value: "documents", label: "Документы", icon: "article" },
  { value: "visa", label: "Виза", icon: "flight_takeoff" },
]

const DOCUMENT_KIND_OPTIONS = [
  { value: "diploma", label: "Диплом" },
  { value: "enrollment_certificate", label: "Справка о зачислении" },
  { value: "passport", label: "Паспорт" },
  { value: "university_id", label: "Студенческий билет" },
  { value: "visa", label: "Виза" },
  { value: "other", label: "Другое" },
]

interface OnboardingDocument {
  id: number
  kind: string
  original_filename: string
  size_bytes: number
  status: "pending" | "approved" | "rejected"
}

function formatDocSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

export default function MentorOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  // Until we've checked that the user passed the identity gate
  // (verified email + linked Telegram), don't render the form —
  // otherwise a returning user could land here mid-flow without
  // satisfying the backend submit requirements.
  const [identityReady, setIdentityReady] = useState(false)

  // Step 1 — Photo
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Step 2 — Bio
  const [fullName, setFullName] = useState("")
  const [bio, setBio] = useState("")
  const [phone, setPhone] = useState("")

  // Step 3 — University
  const [countries, setCountries] = useState<string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const toggleCountry = (c: string) => {
    setCountries((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }
  const [school, setSchool] = useState("")
  const [major, setMajor] = useState("")
  const [grant, setGrant] = useState("")
  const [gpa, setGpa] = useState("")
  const [examResults, setExamResults] = useState("")

  // Step 4 — Expertise
  const [expertise, setExpertise] = useState<string[]>([])

  const toggleExpertise = (val: string) => {
    setExpertise((prev) => prev.includes(val) ? prev.filter((e) => e !== val) : [...prev, val])
  }

  // Step 5 — Documents
  const [documents, setDocuments] = useState<OnboardingDocument[]>([])
  const [docKind, setDocKind] = useState("diploma")
  const [docFile, setDocFile] = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docError, setDocError] = useState("")
  const docInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""
    if (!token) {
      router.replace("/auth/login")
      return
    }
    fetchMe(token)
      .then(async (me) => {
        if (me.role !== "mentor") {
          router.replace(me.role === "student" ? "/student/dashboard" : "/")
          return
        }
        if (!me.email || !me.email_verified || !me.has_telegram) {
          router.replace("/onboarding/mentor/identity")
          return
        }
        // Photo may already be set (mentor returning mid-flow). Read once
        // so the avatar preview is accurate and the gate doesn't block them.
        try {
          const profile = await fetchMentorProfile()
          setProfilePhoto(profile.profile_photo ?? null)
        } catch {
          // Non-fatal — onboarding still proceeds with empty photo state.
        }
        setIdentityReady(true)
      })
      .catch(() => router.replace("/auth/login"))
  }, [router])

  const uploadCroppedPhoto = async (blob: Blob) => {
    setUploadingPhoto(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("profile_photo", blob, "avatar.jpg")
      const res = await authFetch(`${BASE_URL}/mentors/profile/me/`, {
        method: "PATCH",
        body: formData,
      })
      if (!res.ok) {
        let msg = "Не удалось загрузить фото"
        try {
          const err = await res.json()
          if (err.profile_photo) msg = Array.isArray(err.profile_photo) ? err.profile_photo[0] : err.profile_photo
          else if (err.detail) msg = err.detail
        } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      setProfilePhoto(data.profile_photo ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при загрузке фото")
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSaveProfileFields = async () => {
    // Сохраняем основные поля до шага документов — чтобы при срыве на
    // 5-м шаге (закрыл вкладку) уже введённое не пропало. Документы
    // загружаются собственным эндпоинтом и не зависят от этого PATCH.
    await updateMentorProfile({
      full_name: fullName,
      detailed_bio: bio,
      phone,
      countries: countries.map((c) => ({ country: c })),
      school_or_university: school,
      major,
      grant_or_scholarship: grant,
      gpa,
      exam_results: examResults,
      expertise_areas: expertise.map((area) => ({ area: area as ExpertiseArea })),
    })
  }

  const handleGoToDocuments = async () => {
    setSaving(true)
    setError("")
    try {
      await handleSaveProfileFields()
      await loadDocuments()
      setStep(5)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при сохранении")
    } finally {
      setSaving(false)
    }
  }

  const loadDocuments = async () => {
    try {
      const res = await authFetch(`${BASE_URL}/mentors/documents/`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(Array.isArray(data) ? data : data.results ?? [])
      }
    } catch {
      // Non-fatal: empty list, mentor can still upload.
    }
  }

  const handleUploadDocument = async () => {
    if (!docFile) return
    if (docFile.size > 15 * 1024 * 1024) {
      setDocError("Файл слишком большой. Максимум 15 МБ.")
      return
    }
    setUploadingDoc(true)
    setDocError("")
    try {
      const formData = new FormData()
      formData.append("file", docFile)
      formData.append("kind", docKind)
      const res = await authFetch(`${BASE_URL}/mentors/documents/`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const first = Object.values(err)[0]
        throw new Error(
          Array.isArray(first) ? first[0] : err.detail || String(first || "Ошибка загрузки"),
        )
      }
      const doc: OnboardingDocument = await res.json()
      setDocuments((prev) => [doc, ...prev])
      setDocFile(null)
      if (docInputRef.current) docInputRef.current.value = ""
    } catch (e: unknown) {
      setDocError(e instanceof Error ? e.message : "Ошибка загрузки")
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleDeleteDocument = async (id: number) => {
    try {
      const res = await authFetch(`${BASE_URL}/mentors/documents/${id}/`, { method: "DELETE" })
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id))
      }
    } catch {
      // Silent — list stays as-is, mentor can retry.
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    setError("")
    try {
      // На шаге 5 профиль уже сохранён в handleGoToDocuments — здесь
      // только переход. Если каким-то путём дошли сюда без сохранения
      // (skip-link / dev), updateMentorProfile повторно безопасен.
      await handleSaveProfileFields()
      router.push("/mentor/dashboard")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при сохранении")
      setSaving(false)
    }
  }

  if (!identityReady) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 justify-center mb-2">
            <Logo size={32} className="text-gray-900" />
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </div>
          <p className="text-gray-500 text-sm">Создай профиль — абитуриенты увидят тебя после проверки</p>
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

          {/* Step 1 — Photo (required) */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Загрузи фото</h1>
              <p className="text-gray-400 text-sm mb-6">
                Абитуриенты охотнее доверяют менторам с реальной фотографией. Без фото профиль нельзя отправить на проверку.
              </p>
              <div className="flex flex-col items-center mb-6">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        setError("Фото не должно превышать 5 МБ")
                      } else {
                        setError("")
                        setPickedFile(file)
                      }
                    }
                    e.target.value = ""
                  }}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="relative w-32 h-32 rounded-full overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:opacity-50"
                >
                  {profilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profilePhoto} alt="Фото профиля" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                      <Icon name="photo_camera" size={36} className="text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon name="edit" size={28} className="text-white" />
                    </span>
                  </div>
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
                <p className="text-xs text-gray-400 mt-3">
                  {profilePhoto ? "Нажмите чтобы изменить" : "JPG, PNG или WEBP до 5 МБ"}
                </p>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
              )}
              <button
                onClick={() => setStep(2)}
                disabled={!profilePhoto || uploadingPhoto}
                className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
              >
                Продолжить →
              </button>
            </div>
          )}

          {/* Step 2 — Basic info */}
          {step === 2 && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Расскажи о себе</h1>
              <p className="text-gray-400 text-sm mb-6">Абитуриенты увидят это на твоей странице</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Полное имя <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Назгуль Ахметова"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    О себе <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Я поступила в MIT из Алматы через стипендию Болашак. Помогаю абитуриентам составить план поступления, написать эссе и подать заявки в топ университеты..."
                    className={`${inputClass} resize-none`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Минимум 2-3 предложения — это влияет на доверие абитуриентов</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Телефон <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder="+7 777 123 45 67"
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Резервный канал связи для команды Connectus. Абитуриенты не видят.
                  </p>
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
                  disabled={!fullName.trim() || !bio.trim() || !phone.trim()}
                  className="flex-1 bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
                >
                  Продолжить →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — University */}
          {step === 3 && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Твой университет</h1>
              <p className="text-gray-400 text-sm mb-6">Это главное доказательство твоей экспертизы</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Страны <span className="text-red-500">*</span>{" "}
                    <span className="text-gray-400 font-normal">(можно несколько)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {POPULAR_COUNTRY_CODES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCountry(c)}
                        className={`px-2 py-2 rounded-xl text-xs border-2 font-medium transition-all text-left ${
                          countries.includes(c)
                            ? "border-gray-900 bg-gray-50 text-gray-900"
                            : "border-gray-100 text-gray-600 hover:border-gray-200"
                        }`}
                      >
                        {countries.includes(c) && <span className="mr-1">✓</span>}
                        {countryFlag(c)} {countryLabel(c)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="col-span-3 px-2 py-2 rounded-xl text-xs border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 font-medium transition-all"
                    >
                      + Другая страна
                    </button>
                  </div>
                  {/* Selected exotic countries (not in the popular grid) */}
                  {countries.filter((c) => !POPULAR_COUNTRY_CODES.includes(c as never)).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {countries
                        .filter((c) => !POPULAR_COUNTRY_CODES.includes(c as never))
                        .map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border-2 border-gray-900 text-xs font-medium text-gray-900"
                          >
                            {countryFlag(c)} {countryLabel(c)}
                            <button
                              type="button"
                              onClick={() => toggleCountry(c)}
                              aria-label={`Убрать ${countryLabel(c)}`}
                              className="ml-0.5 text-gray-400 hover:text-red-500"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                  <CountryPickerModal
                    open={pickerOpen}
                    selected={countries}
                    hiddenCodes={[...POPULAR_COUNTRY_CODES]}
                    onSelect={(code) => toggleCountry(code)}
                    onClose={() => setPickerOpen(false)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Университет <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="MIT, UCL, TU Munich..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Специальность <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="Computer Science, Economics..."
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Грант / стипендия <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={grant}
                      onChange={(e) => setGrant(e.target.value)}
                      placeholder="Болашак, Chevening..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      GPA <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      placeholder="3.8 / 4.0"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Результаты экзаменов <span className="text-red-500">*</span>
                  </label>
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
                  onClick={() => setStep(2)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3.5 rounded-xl font-medium hover:border-gray-300 transition-colors text-sm"
                >
                  ← Назад
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={
                    countries.length === 0
                    || !school.trim()
                    || !major.trim()
                    || !grant.trim()
                    || !gpa.trim()
                    || !examResults.trim()
                  }
                  className="flex-1 bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
                >
                  Продолжить →
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Expertise */}
          {step === 4 && (
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
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <Icon
                      name={opt.icon}
                      size={24}
                      filled={expertise.includes(opt.value)}
                      className={expertise.includes(opt.value) ? "text-gray-900" : "text-gray-400"}
                    />
                    <span className={`text-sm font-medium ${expertise.includes(opt.value) ? "text-gray-900" : "text-gray-700"}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="bg-gray-100 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Последний шаг — документы для проверки. Мы верифицируем профиль в течение <strong>48 часов</strong> и опубликуем на платформе.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3.5 rounded-xl font-medium hover:border-gray-300 transition-colors text-sm"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleGoToDocuments}
                  disabled={saving || expertise.length === 0}
                  className="flex-1 bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
                >
                  {saving ? "Сохраняем..." : "Продолжить →"}
                </button>
              </div>
            </div>
          )}

          {/* Step 5 — Documents */}
          {step === 5 && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Документы для проверки</h1>
              <p className="text-gray-400 text-sm mb-6">
                Загрузи хотя бы один документ, подтверждающий твой статус — диплом, справку о зачислении или паспорт. Это требование платформы; абитуриенты доверяют только верифицированным менторам.
              </p>

              {/* Upload form */}
              <div className="border border-gray-200 rounded-2xl p-4 mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Тип документа</label>
                <select
                  value={docKind}
                  onChange={(e) => setDocKind(e.target.value)}
                  className={`${inputClass} mb-3`}
                >
                  {DOCUMENT_KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const dropped = e.dataTransfer.files[0]
                    if (dropped) setDocFile(dropped)
                  }}
                  onClick={() => docInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-gray-400 transition-colors mb-3"
                >
                  <Icon name="upload_file" size={32} className="text-gray-300 mx-auto mb-2" />
                  {docFile ? (
                    <p className="text-sm text-gray-700 font-medium">{docFile.name} ({formatDocSize(docFile.size)})</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">Перетащи файл сюда или нажми для выбора</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, JPEG, PNG. Максимум 15 МБ</p>
                    </>
                  )}
                </div>
                <input
                  ref={docInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                />

                {docError && (
                  <p className="text-xs text-red-500 mb-2">{docError}</p>
                )}

                <button
                  onClick={handleUploadDocument}
                  disabled={!docFile || uploadingDoc}
                  className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {uploadingDoc ? "Загружаем..." : "Загрузить документ"}
                </button>
              </div>

              {/* Documents list */}
              {documents.length > 0 && (
                <div className="space-y-2 mb-6">
                  {documents.map((doc) => {
                    const kindLabel = DOCUMENT_KIND_OPTIONS.find((o) => o.value === doc.kind)?.label || doc.kind
                    return (
                      <div key={doc.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                        <Icon name="description" size={20} className="text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.original_filename}
                          </p>
                          <p className="text-xs text-gray-400">
                            {kindLabel} · {formatDocSize(doc.size_bytes)}
                          </p>
                        </div>
                        {doc.status !== "approved" && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                            aria-label="Удалить документ"
                          >
                            <Icon name="delete" size={18} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="bg-gray-100 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-600 leading-relaxed">
                  После отправки профиль уйдёт на проверку. Мы верифицируем его в течение <strong>48 часов</strong> и опубликуем на платформе.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{error}</div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3.5 rounded-xl font-medium hover:border-gray-300 transition-colors text-sm"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving || documents.length === 0}
                  className="flex-1 bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
                >
                  {saving
                    ? "Отправляем..."
                    : documents.length === 0
                      ? "Загрузи хотя бы 1 документ"
                      : "Отправить профиль →"}
                </button>
              </div>
            </div>
          )}
        </div>
        <AvatarCropperModal
          file={pickedFile}
          onClose={() => setPickedFile(null)}
          onSave={async (blob) => {
            setPickedFile(null)
            await uploadCroppedPhoto(blob)
          }}
        />

        <p className="text-center text-xs text-gray-300 mt-4">
          Можно изменить позже в личном кабинете
        </p>
      </div>
    </div>
  )
}
