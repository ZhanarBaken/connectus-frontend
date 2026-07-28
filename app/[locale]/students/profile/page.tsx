"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { fetchStudentProfile, updateStudentProfile, authFetch } from "@/lib/api"
import { useStudentOnboardingGate } from "@/lib/useStudentOnboardingGate"
import { StudentProfile } from "@/types"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"
import AvatarCropperModal from "@/components/AvatarCropperModal"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

// Native <select> renders its own grey arrow and uses a system font that
// looks heavier than the input next to it. We kill the native chrome
// (appearance-none), match input typography (text-gray-900), and paint
// the chevron ourselves so the field aligns visually with text inputs.
const selectClass = `${inputClass} appearance-none text-gray-900 pr-10 bg-no-repeat bg-[right_0.875rem_center] bg-[length:1rem_1rem] cursor-pointer bg-[url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%239ca3af' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 8 10 12 14 8'/%3E%3C/svg%3E")]`

export default function StudentProfilePage() {
  const t = useTranslations("Students.Profile")
  const tOnboarding = useTranslations("Onboarding.Student")
  const router = useRouter()
  useStudentOnboardingGate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const [fullName, setFullName] = useState("")
  const [age, setAge] = useState("")
  const [school, setSchool] = useState("")
  const [schoolGrade, setSchoolGrade] = useState("")
  const [city, setCity] = useState("")
  const [graduationYear, setGraduationYear] = useState("")
  const [desiredMajor, setDesiredMajor] = useState("")
  const [desiredCountries, setDesiredCountries] = useState("")
  const [examResults, setExamResults] = useState("")
  const [gpa, setGpa] = useState("")
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

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
        setSchoolGrade(p.school_grade ?? "")
        setCity(p.city ?? "")
        setGraduationYear(p.school_graduation_year != null ? String(p.school_graduation_year) : "")
        setDesiredMajor(p.desired_major ?? "")
        setDesiredCountries(p.desired_countries ?? "")
        setExamResults(p.exam_results ?? "")
        setGpa(p.gpa ?? "")
        setProfilePhoto(p.profile_photo ?? null)
      })
      .catch(() => setError(t("loadProfileError")))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const uploadCroppedPhoto = async (blob: Blob) => {
    setUploadingPhoto(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("profile_photo", blob, "avatar.jpg")
      const res = await authFetch(`${BASE_URL}/students/profile/me/`, {
        method: "PATCH",
        body: formData,
      })
      if (!res.ok) throw new Error(t("photoUploadErrorDefault"))
      const data = await res.json()
      setProfilePhoto(data.profile_photo ?? null)
    } catch {
      setError(t("photoUploadErrorGeneric"))
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
      await updateStudentProfile({
        full_name: fullName,
        age: Number(age) || 0,
        current_school_or_university: school,
        school_grade: schoolGrade,
        city: city,
        school_graduation_year: graduationYear ? Number(graduationYear) : null,
        desired_major: desiredMajor,
        desired_countries: desiredCountries,
        exam_results: examResults,
        gpa: gpa,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("saveErrorGeneric"))
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
        {/* Header */}
        <div className="mb-8">
          <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-2 transition-colors group [-webkit-tap-highlight-color:transparent]" />

          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t("pageTitle")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("pageSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-5">
          {/* Avatar upload */}
          <div className="flex items-center gap-4 pb-6 border-b border-gray-50">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  if (file.size > 5 * 1024 * 1024) {
                    setError(t("photoTooLarge"))
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
              className="relative w-16 h-16 rounded-full overflow-hidden group cursor-pointer flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:opacity-50"
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt={tOnboarding("photoAlt")} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {fullName.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Icon name="photo_camera" size={20} className="text-white" />
                </span>
              </div>
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{fullName.trim() || t("noName")}</p>
              <p className="text-xs text-gray-400">{t("changePhotoHint")}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("fullNameLabel")}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder={t("fullNamePlaceholder")}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("ageLabel")}</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("institutionLabel")}</label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder={t("institutionPlaceholder")}
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">{t("institutionHint")}</p>
          </div>

          {/* Required pre-consultation fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("currentStatusLabel")} <span className="text-red-500">*</span>
              </label>
              <select
                value={schoolGrade}
                onChange={(e) => setSchoolGrade(e.target.value)}
                required
                className={selectClass}
              >
                <option value="">{t("choosePlaceholder")}</option>
                <optgroup label={tOnboarding("groupSchool")}>
                  <option value="11 класс">{tOnboarding("grade11")}</option>
                  <option value="12 класс">{tOnboarding("grade12")}</option>
                  <option value="10 класс">{tOnboarding("grade10")}</option>
                  <option value="9 класс">{tOnboarding("grade9")}</option>
                  <option value="8 класс">{tOnboarding("grade8")}</option>
                  <option value="7 класс">{tOnboarding("grade7")}</option>
                  <option value="6 класс">{tOnboarding("grade6")}</option>
                  <option value="5 класс">{tOnboarding("grade5")}</option>
                </optgroup>
                <optgroup label={tOnboarding("groupOther")}>
                  <option value="Уже окончил(а) школу">{tOnboarding("alreadyGraduated")}</option>
                  <option value="Студент вуза">{tOnboarding("universityStudent")}</option>
                  <option value="Колледж / училище">{tOnboarding("college")}</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("graduationYearLabel")} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                min={1990}
                max={2050}
                required
                placeholder="2026"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("cityLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              placeholder={t("cityPlaceholder")}
              className={inputClass}
            />
          </div>

          {/* Optional context block */}
          <div className="pt-2 mt-2 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">{t("optionalSectionTitle")}</h2>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              {t("optionalSectionBody")}
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("desiredMajorLabel")}</label>
                <input
                  type="text"
                  value={desiredMajor}
                  onChange={(e) => setDesiredMajor(e.target.value)}
                  placeholder={t("desiredMajorPlaceholder")}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("desiredCountriesLabel")}</label>
                <input
                  type="text"
                  value={desiredCountries}
                  onChange={(e) => setDesiredCountries(e.target.value)}
                  placeholder={t("desiredCountriesPlaceholder")}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("examResultsLabel")}</label>
                <input
                  type="text"
                  value={examResults}
                  onChange={(e) => setExamResults(e.target.value)}
                  placeholder={t("examResultsPlaceholder")}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("gpaLabel")}</label>
                <input
                  type="text"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  placeholder={t("gpaPlaceholder")}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !fullName.trim() || !schoolGrade.trim() || !city.trim() || !graduationYear.trim()}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? t("saving") : t("save")}
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-[10px]">✓</span>
                {t("saved")}
              </span>
            )}
          </div>
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
