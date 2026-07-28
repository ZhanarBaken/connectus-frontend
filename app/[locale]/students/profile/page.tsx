"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { fetchStudentProfile, authFetch } from "@/lib/api"
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

function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export default function StudentProfilePage() {
  const t = useTranslations("Students.Profile")
  const tOnboarding = useTranslations("Onboarding.Student")
  const router = useRouter()
  useStudentOnboardingGate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  // Inline per-field errors filled from a backend 400 response, so a
  // rejected value (e.g. graduation year out of range) highlights the
  // exact field instead of a generic bottom banner.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Backend validation messages are fixed, untranslated strings (see
  // apps.students.serializers.StudentProfileSerializer / models.py
  // validators) — map the known ones to localized copy. Unmapped
  // messages fall back to raw text.
  const PATCH_ERROR_MESSAGES: Record<string, string> = {
    "Возраст должен быть от 14 до 100 лет.": t("errBirthDateAgeRange"),
    "Ensure this value is greater than or equal to 1990.": t("errGraduationYearMin"),
    "Ensure this value is less than or equal to 2050.": t("errGraduationYearMax"),
  }

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
    setFieldErrors({})
    try {
      const res = await authFetch(`${BASE_URL}/students/profile/me/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      })
      if (!res.ok) {
        // Throw the raw field-keyed JSON (not a flattened first message)
        // so the catch below can highlight the exact offending field
        // instead of a generic bottom-of-page banner.
        const err = await res.json()
        throw new Error(JSON.stringify(err))
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("saveErrorGeneric")
      try {
        const parsed = JSON.parse(msg)
        if (parsed && typeof parsed === "object") {
          const errs: Record<string, string> = {}
          for (const [k, v] of Object.entries(parsed)) {
            const raw = Array.isArray(v) ? String(v[0]) : String(v)
            errs[k] = PATCH_ERROR_MESSAGES[raw] ?? raw
          }
          setFieldErrors(errs)
          setError(t("fixRedFields"))
          const firstKey = Object.keys(errs)[0]
          document.querySelector(`[data-field="${firstKey}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        } else {
          setError(msg)
        }
      } catch {
        setError(msg)
      }
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

          <div data-field="full_name">
            <Field label={t("fullNameLabel")} error={fieldErrors.full_name}>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder={t("fullNamePlaceholder")}
                className={fieldErrors.full_name
                  ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                  : inputClass}
              />
            </Field>
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

          <div data-field="current_school_or_university">
            <Field label={t("institutionLabel")} error={fieldErrors.current_school_or_university}>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder={t("institutionPlaceholder")}
                className={fieldErrors.current_school_or_university
                  ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                  : inputClass}
              />
            </Field>
            {!fieldErrors.current_school_or_university && (
              <p className="text-xs text-gray-400 mt-1">{t("institutionHint")}</p>
            )}
          </div>

          {/* Required pre-consultation fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div data-field="school_grade">
              <Field label={t("currentStatusLabel")} required error={fieldErrors.school_grade}>
                <select
                  value={schoolGrade}
                  onChange={(e) => setSchoolGrade(e.target.value)}
                  required
                  className={fieldErrors.school_grade
                    ? `${selectClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                    : selectClass}
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
              </Field>
            </div>
            <div data-field="school_graduation_year">
              <Field label={t("graduationYearLabel")} required error={fieldErrors.school_graduation_year}>
                <input
                  type="number"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  min={1990}
                  max={2050}
                  required
                  placeholder="2026"
                  className={fieldErrors.school_graduation_year
                    ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                    : inputClass}
                />
              </Field>
            </div>
          </div>

          <div data-field="city">
            <Field label={t("cityLabel")} required error={fieldErrors.city}>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                placeholder={t("cityPlaceholder")}
                className={fieldErrors.city
                  ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                  : inputClass}
              />
            </Field>
          </div>

          {/* Optional context block */}
          <div className="pt-2 mt-2 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">{t("optionalSectionTitle")}</h2>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              {t("optionalSectionBody")}
            </p>

            <div className="space-y-5">
              <div data-field="desired_major">
                <Field label={t("desiredMajorLabel")} error={fieldErrors.desired_major}>
                  <input
                    type="text"
                    value={desiredMajor}
                    onChange={(e) => setDesiredMajor(e.target.value)}
                    placeholder={t("desiredMajorPlaceholder")}
                    className={fieldErrors.desired_major
                      ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                      : inputClass}
                  />
                </Field>
              </div>
              <div data-field="desired_countries">
                <Field label={t("desiredCountriesLabel")} error={fieldErrors.desired_countries}>
                  <input
                    type="text"
                    value={desiredCountries}
                    onChange={(e) => setDesiredCountries(e.target.value)}
                    placeholder={t("desiredCountriesPlaceholder")}
                    className={fieldErrors.desired_countries
                      ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                      : inputClass}
                  />
                </Field>
              </div>
              <div data-field="exam_results">
                <Field label={t("examResultsLabel")} error={fieldErrors.exam_results}>
                  <input
                    type="text"
                    value={examResults}
                    onChange={(e) => setExamResults(e.target.value)}
                    placeholder={t("examResultsPlaceholder")}
                    className={fieldErrors.exam_results
                      ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                      : inputClass}
                  />
                </Field>
              </div>
              <div data-field="gpa">
                <Field label={t("gpaLabel")} error={fieldErrors.gpa}>
                  <input
                    type="text"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                    placeholder={t("gpaPlaceholder")}
                    className={fieldErrors.gpa
                      ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                      : inputClass}
                  />
                </Field>
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
