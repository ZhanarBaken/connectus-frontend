"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { fetchMentorProfile, updateMentorProfile, authFetch } from "@/lib/api"
import { POPULAR_COUNTRY_CODES, countryFlag, countryLabel } from "@/lib/countries"
import { calcProfileCompletion } from "@/lib/profileCompletion"
import { MentorProfile, ExpertiseArea } from "@/types"
import BackButton from "@/components/BackButton"
import CountryPickerModal from "@/components/CountryPickerModal"
import Icon from "@/components/Icon"
import AvatarCropperModal from "@/components/AvatarCropperModal"
import MentorStatusBanner from "@/components/MentorStatusBanner"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

const EXPERTISE_OPTIONS = [
  { value: "admission", label: "Поступление" },
  { value: "documents", label: "Документы" },
  { value: "scholarships", label: "Стипендии" },
  { value: "visa", label: "Виза" },
]

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
  const [bio, setBio] = useState("")
  const [linkedin, setLinkedin] = useState("")
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([])
  const [payoutDetails, setPayoutDetails] = useState("")
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [isBanned, setIsBanned] = useState(false)
  const [banReason, setBanReason] = useState("")
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchMentorProfile()
      .then((p: MentorProfile) => {
        setFullName(p.full_name ?? "")
        setCountries(p.countries.map((c) => c.country))
        setSchool(p.school_or_university ?? "")
        setMajor(p.major ?? "")
        setGrant(p.grant_or_scholarship ?? "")
        setGpa(p.gpa ?? "")
        setExamResults(p.exam_results ?? "")
        setBio(p.detailed_bio ?? "")
        setLinkedin(p.linkedin_url ?? "")
        setExpertiseAreas(p.expertise_areas.map((e) => e.area))
        setPayoutDetails(p.payout_details ?? "")
        setProfilePhoto(p.profile_photo ?? null)
        setIsBanned(p.is_banned ?? false)
        setBanReason(p.ban_reason ?? "")
      })
      .catch(() => setError("Не удалось загрузить профиль"))
      .finally(() => setLoading(false))
  }, [])

  const toggleExpertise = (area: string) => {
    setExpertiseAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    )
  }

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
          else if (err.non_field_errors) msg = err.non_field_errors[0]
          else msg = JSON.stringify(err)
        } catch {}
        throw new Error(`${res.status}: ${msg}`)
      }
      const data = await res.json()
      setProfilePhoto(data.profile_photo ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при загрузке фото")
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError("")
    try {
      await updateMentorProfile({
        full_name: fullName,
        countries: countries.map((c) => ({ country: c })),
        school_or_university: school,
        major,
        grant_or_scholarship: grant,
        gpa,
        exam_results: examResults,
        detailed_bio: bio,
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

  // Передаём «как будто бы это профиль из бэка» — формула одна на оба
  // экрана. Поля, которые юзер сейчас редактирует, читаются из state
  // (могут быть несохранённые правки) — это специально, чтобы прогресс
  // мгновенно реагировал на ввод.
  const { percent: completionPercent } = calcProfileCompletion({
    profile_photo: profilePhoto,
    full_name: fullName,
    school_or_university: school,
    countries: countries.map((c) => ({ country: c })),
    major,
    detailed_bio: bio,
    grant_or_scholarship: grant,
    expertise_areas: expertiseAreas.map((a) => ({ area: a as ExpertiseArea })),
  } as MentorProfile)

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <MentorStatusBanner />
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

        {isBanned && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <Icon name="block" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Аккаунт заблокирован</p>
              {banReason && <p className="text-xs text-red-600 mt-0.5">{banReason}</p>}
              <p className="text-xs text-red-500 mt-1">Редактирование профиля недоступно.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={isBanned} className="space-y-6">
          {/* Avatar upload */}
          <div className="flex flex-col items-center">
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
              className="relative w-24 h-24 rounded-full overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:opacity-50"
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="Фото профиля" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">
                    {fullName.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Icon name="photo_camera" size={28} className="text-white" />
                </span>
              </div>
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-2">
              {profilePhoto ? "Нажмите чтобы изменить фото" : "Загрузите фото профиля"}
            </p>
            {!profilePhoto && (
              <p className="text-xs text-red-500 mt-1 font-medium">Обязательно для верификации</p>
            )}
          </div>

          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Основная информация</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Полное имя">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Назгуль Ахметова" className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Страны (можно несколько)">
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_COUNTRY_CODES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCountry(c)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                          countries.includes(c)
                            ? "border-gray-900 bg-gray-50 text-gray-900"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {countries.includes(c) && <span className="mr-1">✓</span>}
                        {countryFlag(c)} {countryLabel(c)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                    >
                      + Другая страна
                    </button>
                  </div>
                  {/* Selected countries that aren't in the popular row —
                      shown as removable chips so the user can see what's
                      picked even if it's exotic. */}
                  {countries.filter((c) => !POPULAR_COUNTRY_CODES.includes(c as never)).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {countries
                        .filter((c) => !POPULAR_COUNTRY_CODES.includes(c as never))
                        .map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border-2 border-gray-900 text-sm font-medium text-gray-900"
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
                </Field>
                <CountryPickerModal
                  open={pickerOpen}
                  selected={countries}
                  hiddenCodes={[...POPULAR_COUNTRY_CODES]}
                  onSelect={(code) => toggleCountry(code)}
                  onClose={() => setPickerOpen(false)}
                />
              </div>
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
              <Field label="LinkedIn" hint="Необязательно — помогает абитуриентам убедиться в твоих достижениях">
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
                placeholder="Я поступила в MIT из Алматы через стипендию Болашак. Помогаю абитуриентам составить план поступления, написать эссе и подать заявки в топ университеты США..."
                className={`${inputClass} resize-none`} />
            </Field>
          </div>


          {/* Expertise */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Специализация</h2>
            <p className="text-sm text-gray-400 mb-5">В чём ты помогаешь абитуриентам?</p>
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
            <p className="text-sm text-gray-400 mb-5">Видно только администратору платформы — не абитуриентам</p>
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

          </fieldset>

          <button
            type="submit"
            disabled={saving || isBanned}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "Сохраняем..." : "Сохранить профиль"}
          </button>
        </form>
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
