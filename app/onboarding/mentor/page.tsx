"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  authFetch,
  fetchMe,
  fetchMentorProfile,
  updateMentorProfile,
  submitMentorProfile,
} from "@/lib/api"
import { POPULAR_COUNTRY_CODES, countryFlag, countryLabel } from "@/lib/countries"
import { ExpertiseArea } from "@/types"
import AvatarCropperModal from "@/components/AvatarCropperModal"
import CountryPickerModal from "@/components/CountryPickerModal"
import Icon from "@/components/Icon"
import Logo from "@/components/Logo"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

type Tab = "photo" | "about" | "education" | "expertise" | "documents"

const TABS: { id: Tab; label: string }[] = [
  { id: "photo",     label: "Фото"       },
  { id: "about",     label: "О себе"     },
  { id: "education", label: "Образование"},
  { id: "expertise", label: "Экспертиза" },
  { id: "documents", label: "Документы"  },
]

const EXPERTISE_OPTIONS = [
  { value: "admission",    label: "Поступление", icon: "flag"            },
  { value: "scholarships", label: "Стипендии",   icon: "military_tech"   },
  { value: "documents",    label: "Документы",   icon: "article"         },
  { value: "visa",         label: "Виза",        icon: "flight_takeoff"  },
]

const DOCUMENT_KIND_OPTIONS = [
  { value: "diploma",               label: "Диплом"                  },
  { value: "enrollment_certificate",label: "Справка о зачислении"    },
  { value: "university_id",         label: "Студенческий билет"      },
  { value: "other",                 label: "Другое"                  },
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

const inputClass =
  "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

export default function MentorOnboarding() {
  const router = useRouter()
  const [ready, setReady]     = useState(false)
  const [tab, setTab]         = useState<Tab>("photo")
  const [saved, setSaved]     = useState(false)
  const [saveError, setSaveError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  // Photo
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [pickedFile, setPickedFile]     = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // About
  const [fullName, setFullName] = useState("")
  const [bio, setBio]           = useState("")
  const [phone, setPhone]       = useState("")

  // Education
  const [countries, setCountries]     = useState<string[]>([])
  const [pickerOpen, setPickerOpen]   = useState(false)
  const [school, setSchool]           = useState("")
  const [major, setMajor]             = useState("")
  const [grant, setGrant]             = useState("")
  const [gpa, setGpa]                 = useState("")
  const [examResults, setExamResults] = useState("")

  // Expertise
  const [expertise, setExpertise] = useState<string[]>([])

  // Documents
  const [documents, setDocuments]   = useState<OnboardingDocument[]>([])
  const [docKind, setDocKind]       = useState("diploma")
  const [docFile, setDocFile]       = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docError, setDocError]     = useState("")
  const docInputRef = useRef<HTMLInputElement>(null)

  // ─── Load profile on mount ─────────────────────────────────────
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""
    if (!token) { router.replace("/auth/login"); return }

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
        try {
          const p = await fetchMentorProfile()
          if (p.is_submitted || p.is_approved) {
            router.replace("/mentor/dashboard")
            return
          }
          setProfilePhoto(p.profile_photo ?? null)
          setFullName(p.full_name ?? "")
          setBio(p.detailed_bio ?? "")
          setPhone(p.phone ?? "")
          setSchool(p.school_or_university ?? "")
          setMajor(p.major ?? "")
          setGrant(p.grant_or_scholarship ?? "")
          setGpa(p.gpa ?? "")
          setExamResults(p.exam_results ?? "")
          setCountries((p.countries ?? []).map((c: { country: string }) => c.country))
          setExpertise((p.expertise_areas ?? []).map((e: { area: string }) => e.area))
        } catch { /* start fresh */ }
        try {
          const res = await authFetch(`${BASE_URL}/mentors/documents/`)
          if (res.ok) {
            const d = await res.json()
            setDocuments(Array.isArray(d) ? d : d.results ?? [])
          }
        } catch { /* non-fatal */ }
        setReady(true)
      })
      .catch(() => router.replace("/auth/login"))
  }, [router])

  // ─── Auto-save helpers ─────────────────────────────────────────
  const flashSaved = useCallback(() => {
    setSaved(true)
    setSaveError("")
    setTimeout(() => setSaved(false), 1500)
  }, [])

  const saveAbout = useCallback(async () => {
    try {
      await updateMentorProfile({ full_name: fullName, detailed_bio: bio, phone })
      flashSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Не удалось сохранить")
    }
  }, [fullName, bio, phone, flashSaved])

  const saveEducation = useCallback(async () => {
    try {
      await updateMentorProfile({
        countries: countries.map((c) => ({ country: c })),
        school_or_university: school,
        major,
        grant_or_scholarship: grant,
        gpa,
        exam_results: examResults,
      })
      flashSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Не удалось сохранить")
    }
  }, [countries, school, major, grant, gpa, examResults, flashSaved])

  const saveExpertise = useCallback(async (areas: string[]) => {
    try {
      await updateMentorProfile({
        expertise_areas: areas.map((a) => ({ area: a as ExpertiseArea })),
      })
      flashSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Не удалось сохранить")
    }
  }, [flashSaved])

  const saveCountries = useCallback(async (next: string[]) => {
    try {
      await updateMentorProfile({ countries: next.map((c) => ({ country: c })) })
      flashSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Не удалось сохранить")
    }
  }, [flashSaved])

  // ─── Photo upload ──────────────────────────────────────────────
  const uploadCroppedPhoto = async (blob: Blob) => {
    setUploadingPhoto(true)
    setSaveError("")
    try {
      const fd = new FormData()
      fd.append("profile_photo", blob, "avatar.jpg")
      const res = await authFetch(`${BASE_URL}/mentors/profile/me/`, { method: "PATCH", body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          err.profile_photo?.[0] || err.profile_photo || err.detail || "Не удалось загрузить фото"
        )
      }
      const data = await res.json()
      setProfilePhoto(data.profile_photo ?? null)
      flashSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Ошибка при загрузке фото")
    } finally {
      setUploadingPhoto(false)
    }
  }

  // ─── Document upload / delete ──────────────────────────────────
  const handleUploadDocument = async () => {
    if (!docFile) return
    if (docFile.size > 15 * 1024 * 1024) { setDocError("Максимум 15 МБ"); return }
    setUploadingDoc(true)
    setDocError("")
    try {
      const fd = new FormData()
      fd.append("file", docFile)
      fd.append("kind", docKind)
      const res = await authFetch(`${BASE_URL}/mentors/documents/`, { method: "POST", body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const first = Object.values(err)[0]
        throw new Error(Array.isArray(first) ? first[0] : err.detail || String(first || "Ошибка"))
      }
      const doc: OnboardingDocument = await res.json()
      setDocuments((prev) => [doc, ...prev])
      setDocFile(null)
      if (docInputRef.current) docInputRef.current.value = ""
    } catch (e) {
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
      } else {
        setDocError("Не удалось удалить документ. Попробуй ещё раз.")
      }
    } catch {
      setDocError("Не удалось удалить документ. Попробуй ещё раз.")
    }
  }

  // ─── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError({})
    try {
      // Save all text fields first so backend sees latest values.
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
        expertise_areas: expertise.map((a) => ({ area: a as ExpertiseArea })),
      })
      await submitMentorProfile()
      setSubmitted(true)
    } catch (e: unknown) {
      // Backend returns field-level errors on validation failure.
      if (e instanceof Error) {
        try {
          const parsed = JSON.parse(e.message)
          if (typeof parsed === "object" && parsed !== null) {
            setSubmitError(parsed as Record<string, string>)
            const errorTab = tabForError(parsed)
            if (errorTab) setTab(errorTab)
          } else {
            setSubmitError({ detail: e.message })
          }
        } catch {
          setSubmitError({ detail: e.message })
        }
      } else {
        setSubmitError({ detail: "Неизвестная ошибка при отправке" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Completion checks ─────────────────────────────────────────
  const tabDone: Record<Tab, boolean> = {
    photo:     Boolean(profilePhoto),
    about:     Boolean(fullName.trim() && bio.trim() && phone.trim()),
    education: Boolean(
      countries.length > 0 && school.trim() && major.trim()
      && grant.trim() && gpa.trim() && examResults.trim()
    ),
    expertise: expertise.length > 0,
    documents: documents.length > 0,
  }
  const allDone = Object.values(tabDone).every(Boolean)

  // ─── Loading ───────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  // ─── Success ───────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Icon name="check_circle" size={36} className="text-emerald-600" filled />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Профиль отправлен на проверку</h1>
          <p className="text-gray-500 text-sm mb-6">
            Мы проверим его в течение 48 часов и опубликуем на платформе. Следи за статусом в личном кабинете.
          </p>
          <button
            onClick={() => router.push("/mentor/dashboard")}
            className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm"
          >
            Перейти в кабинет →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-10">
      <div className="w-full max-w-lg mx-auto">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 justify-center mb-1">
            <Logo size={28} className="text-gray-900" />
            <span className="text-lg font-bold text-gray-900">Connectus</span>
          </div>
          <p className="text-gray-400 text-xs">Заполни профиль — абитуриенты увидят тебя после проверки</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6 overflow-x-auto">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                tab === id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tabDone[id] && (
                <Icon name="check_circle" size={13} className="text-emerald-500 flex-shrink-0" filled />
              )}
              {label}
            </button>
          ))}
        </div>

        {/* Save status */}
        <div className="h-5 mb-2 text-center">
          {saved && <p className="text-xs text-emerald-600">Сохранено ✓</p>}
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">

          {/* ── ФОТО ── */}
          {tab === "photo" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Фото профиля</h2>
              <p className="text-gray-400 text-sm mb-6">
                Обязательное поле. Абитуриенты охотнее доверяют менторам с реальной фотографией.
              </p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      setSaveError("Фото не должно превышать 5 МБ")
                    } else {
                      setSaveError("")
                      setPickedFile(file)
                    }
                  }
                  e.target.value = ""
                }}
              />
              <div className="flex flex-col items-center">
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
                  {profilePhoto ? "Нажми чтобы изменить" : "JPG, PNG или WEBP до 5 МБ"}
                </p>
              </div>
            </div>
          )}

          {/* ── О СЕБЕ ── */}
          {tab === "about" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">О себе</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Полное имя <span className="text-red-400">*</span>
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={saveAbout}
                  placeholder="Назгуль Ахметова"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  О себе <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={saveAbout}
                  rows={4}
                  placeholder="Я поступила в MIT из Алматы через стипендию Болашак. Помогаю абитуриентам составить план поступления, написать эссе и подать заявки в топ университеты..."
                  className={`${inputClass} resize-none`}
                />
                <p className="text-xs text-gray-400 mt-1">Минимум 2–3 предложения — это влияет на доверие</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Телефон <span className="text-red-400">*</span>
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={saveAbout}
                  type="tel"
                  placeholder="+7 777 123 45 67"
                  className={inputClass}
                />
                <p className="text-xs text-gray-400 mt-1">Резервный канал для команды Connectus. Абитуриенты не видят.</p>
              </div>
            </div>
          )}

          {/* ── ОБРАЗОВАНИЕ ── */}
          {tab === "education" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Образование</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Страны <span className="text-red-400">*</span>{" "}
                  <span className="text-gray-400 font-normal">(можно несколько)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {POPULAR_COUNTRY_CODES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const next = countries.includes(c)
                          ? countries.filter((x) => x !== c)
                          : [...countries, c]
                        setCountries(next)
                        void saveCountries(next)
                      }}
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
                            onClick={() => {
                              const next = countries.filter((x) => x !== c)
                              setCountries(next)
                              void saveCountries(next)
                            }}
                            aria-label={`Убрать ${countryLabel(c)}`}
                            className="ml-0.5 text-gray-400 hover:text-red-500"
                          >✕</button>
                        </span>
                      ))}
                  </div>
                )}
                <CountryPickerModal
                  open={pickerOpen}
                  selected={countries}
                  hiddenCodes={[...POPULAR_COUNTRY_CODES]}
                  onSelect={(code) => {
                    const next = countries.includes(code)
                      ? countries.filter((x) => x !== code)
                      : [...countries, code]
                    setCountries(next)
                    void saveCountries(next)
                  }}
                  onClose={() => setPickerOpen(false)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Университет <span className="text-red-400">*</span>
                </label>
                <input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  onBlur={saveEducation}
                  placeholder="MIT, UCL, TU Munich..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Специальность <span className="text-red-400">*</span>
                </label>
                <input
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  onBlur={saveEducation}
                  placeholder="Computer Science, Economics..."
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Грант / стипендия <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={grant}
                    onChange={(e) => setGrant(e.target.value)}
                    onBlur={saveEducation}
                    placeholder="Болашак, Chevening..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    GPA <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                    onBlur={saveEducation}
                    placeholder="3.8 / 4.0"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Результаты экзаменов <span className="text-red-400">*</span>
                </label>
                <input
                  value={examResults}
                  onChange={(e) => setExamResults(e.target.value)}
                  onBlur={saveEducation}
                  placeholder="IELTS 7.5, SAT 1480..."
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* ── ЭКСПЕРТИЗА ── */}
          {tab === "expertise" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Экспертиза</h2>
              <p className="text-gray-400 text-sm mb-4">
                Выбери чем ты помогаешь <span className="text-red-400">*</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {EXPERTISE_OPTIONS.map((opt) => {
                  const active = expertise.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? expertise.filter((e) => e !== opt.value)
                          : [...expertise, opt.value]
                        setExpertise(next)
                        void saveExpertise(next)
                      }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                        active ? "border-gray-900 bg-gray-50" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <Icon
                        name={opt.icon}
                        size={24}
                        filled={active}
                        className={active ? "text-gray-900" : "text-gray-400"}
                      />
                      <span className={`text-sm font-medium ${active ? "text-gray-900" : "text-gray-700"}`}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── ДОКУМЕНТЫ ── */}
          {tab === "documents" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Документы для проверки</h2>
              <p className="text-gray-400 text-sm mb-4">
                Загрузи хотя бы один документ, подтверждающий твой статус — диплом, справку о зачислении или студенческий билет. <span className="text-red-400">*</span>
              </p>

              <div className="border border-gray-200 rounded-2xl p-4 mb-4">
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
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setDocFile(f) }}
                  onClick={() => docInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-gray-400 transition-colors mb-3"
                >
                  <Icon name="upload_file" size={32} className="text-gray-300 mx-auto mb-2" />
                  {docFile ? (
                    <p className="text-sm text-gray-700 font-medium">{docFile.name} ({formatDocSize(docFile.size)})</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">Перетащи файл или нажми для выбора</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, JPEG, PNG до 15 МБ</p>
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
                {docError && <p className="text-xs text-red-500 mb-2">{docError}</p>}
                <button
                  onClick={handleUploadDocument}
                  disabled={!docFile || uploadingDoc}
                  className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {uploadingDoc ? "Загружаем..." : "Загрузить документ"}
                </button>
              </div>

              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((doc) => {
                    const kindLabel = DOCUMENT_KIND_OPTIONS.find((o) => o.value === doc.kind)?.label ?? doc.kind
                    return (
                      <div key={doc.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                        <Icon name="description" size={20} className="text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.original_filename}</p>
                          <p className="text-xs text-gray-400">{kindLabel} · {formatDocSize(doc.size_bytes)}</p>
                        </div>
                        {doc.status !== "approved" && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                            aria-label="Удалить"
                          >
                            <Icon name="delete" size={18} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit errors */}
        {Object.keys(submitError).length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-red-700 mb-1">Исправь ошибки перед отправкой:</p>
            <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
              {Object.entries(submitError).map(([k, v]) => (
                <li key={k}>{v}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !allDone}
          className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
        >
          {submitting
            ? "Отправляем..."
            : !allDone
              ? "Заполни все вкладки чтобы отправить"
              : "Отправить профиль на проверку →"
          }
        </button>

        <p className="text-center text-xs text-gray-300 mt-4">
          Данные сохраняются автоматически · Можно вернуться позже
        </p>
      </div>

      <AvatarCropperModal
        file={pickedFile}
        onClose={() => setPickedFile(null)}
        onSave={async (blob) => {
          setPickedFile(null)
          await uploadCroppedPhoto(blob)
        }}
      />
    </div>
  )
}

// Map backend error keys to tabs.
function tabForError(errors: Record<string, string>): Tab | null {
  if (errors.profile_photo) return "photo"
  if (errors.full_name || errors.detailed_bio || errors.phone) return "about"
  if (
    errors.countries || errors.school_or_university || errors.major
    || errors.grant_or_scholarship || errors.gpa || errors.exam_results
  ) return "education"
  if (errors.expertise_areas) return "expertise"
  if (errors.documents) return "documents"
  return null
}
