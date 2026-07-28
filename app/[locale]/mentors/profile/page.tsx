"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { fetchMentorProfile, fetchMentorServices, fetchMe, authFetch } from "@/lib/api"
import { POPULAR_COUNTRY_CODES, countryFlag, countryLabel } from "@/lib/countries"
import { LANGUAGE_LABELS } from "@/lib/languages"
import { calcProfileCompletion } from "@/lib/profileCompletion"
import { useMentorOnboardingGate } from "@/lib/useMentorOnboardingGate"
import { MentorProfile, MentorService, ExpertiseArea, User } from "@/types"
import BackButton from "@/components/BackButton"
import CountryPickerModal from "@/components/CountryPickerModal"
import Icon from "@/components/Icon"
import AvatarCropperModal from "@/components/AvatarCropperModal"
import MentorStatusBanner from "@/components/MentorStatusBanner"
import MentorDocumentsUploader, { MentorDocument } from "@/components/MentorDocumentsUploader"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

function Field({
  label,
  hint,
  required = false,
  error,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      ) : null}
    </div>
  )
}

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

export default function MentorProfilePage() {
  const t = useTranslations("Mentors.Profile")
  const tExpertise = useTranslations("Landing.Expertise")
  const locale = useLocale()
  const router = useRouter()
  useMentorOnboardingGate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  // Inline per-field errors filled either from local pre-save validation
  // or from a backend 400 response.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Backend validation messages are fixed, untranslated strings (see
  // apps.mentors.serializers.MentorProfileSerializer) — map the known
  // ones to localized copy so mentors don't see raw Russian/English text
  // regardless of site language. Unmapped messages fall back to raw text.
  const PATCH_ERROR_MESSAGES: Record<string, string> = {
    "Похоже на ерунду — введи номер цифрами, можно с +, пробелами и скобками.": t("errPhoneInvalid"),
    "В номере должны быть цифры.": t("errPhoneNoDigits"),
    "Это поле обязательно — изменить можно, очистить нельзя.": t("errCannotBeCleared"),
    "Нельзя убрать всё — оставь хотя бы одну запись.": t("errListCannotBeEmptied"),
    "Не более 10 стран.": t("errTooManyCountries"),
    "Не более 10 языков.": t("errTooManyLanguages"),
    "Дубликаты стран в запросе.": t("errDuplicateCountries"),
    "Дубликаты языков в запросе.": t("errDuplicateLanguages"),
  }

  const EXPERTISE_OPTIONS = [
    { value: "admission", label: tExpertise("admission") },
    { value: "documents", label: tExpertise("documents") },
    { value: "scholarships", label: tExpertise("scholarships") },
    { value: "visa", label: tExpertise("visa") },
  ]

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
  const [phone, setPhone] = useState("")
  const [linkedin, setLinkedin] = useState("")
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [payoutDetails, setPayoutDetails] = useState("")
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [isBanned, setIsBanned] = useState(false)
  const [banReason, setBanReason] = useState("")
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Extra data the real submission gate cares about but that doesn't
  // live on MentorProfile itself — fetched alongside the profile purely
  // to make the completion % below match apps.mentors.models.MentorProfile
  // .submission_errors() instead of only covering a subset of fields.
  const [services, setServices] = useState<MentorService[]>([])
  const [me, setMe] = useState<User | null>(null)
  const [documents, setDocuments] = useState<MentorDocument[]>([])

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
        setPhone(p.phone ?? "")
        setLinkedin(p.linkedin_url ?? "")
        setExpertiseAreas(p.expertise_areas.map((e) => e.area))
        setLanguages(p.languages.map((l) => l.language))
        setPayoutDetails(p.payout_details ?? "")
        setProfilePhoto(p.profile_photo ?? null)
        setIsBanned(p.is_banned ?? false)
        setBanReason(p.ban_reason ?? "")
      })
      .catch(() => setError(t("loadProfileError")))
      .finally(() => setLoading(false))
    // Best-effort: a failure here can only ever push the completion %
    // down (defaults are "nothing yet"), never falsely up to 100% — but
    // still logged so a stuck-low percent is debuggable.
    fetchMentorServices().then(setServices).catch((e) => console.error("fetchMentorServices failed", e))
    fetchMe().then(setMe).catch((e) => console.error("fetchMe failed", e))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleExpertise = (area: string) => {
    setExpertiseAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    )
  }

  const toggleLanguage = (language: string) => {
    setLanguages((prev) =>
      prev.includes(language) ? prev.filter((l) => l !== language) : [...prev, language]
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
        let msg = t("photoUploadErrorDefault")
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
      setError(e instanceof Error ? e.message : t("photoUploadErrorGeneric"))
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Не блокируем save если есть пустые required-поля: ментор имеет
    // право заполнять профиль по частям, уходить и возвращаться. Жёсткая
    // проверка живёт только на этапе «Отправить на проверку» (бэк ловит
    // через submission_errors()) — там UX уже свой, на дашборде.
    //
    // Сам backend PATCH тоже разрешает пустые. 400 здесь прилетит только
    // от strip-protection (попытка обнулить уже-заполненное required-
    // поле); такой ответ парсится в `fieldErrors` ниже и подсвечивает
    // конкретные инпуты.
    setSaving(true)
    setSaved(false)
    setError("")
    setFieldErrors({})
    try {
      const res = await authFetch(`${BASE_URL}/mentors/profile/me/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          countries: countries.map((c) => ({ country: c })),
          school_or_university: school,
          major,
          grant_or_scholarship: grant,
          gpa,
          exam_results: examResults,
          detailed_bio: bio,
          phone,
          linkedin_url: linkedin,
          expertise_areas: expertiseAreas.map((area) => ({ area: area as ExpertiseArea })),
          languages: languages.map((language) => ({ language })),
          payout_details: payoutDetails,
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
      setTimeout(() => router.push("/mentor/dashboard"), 1000)
    } catch (e: unknown) {
      // Try to parse field-level errors from backend so we can mark
      // the specific fields red instead of a generic banner.
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
  // Matches apps.mentors.models.MentorProfile.submission_errors() exactly —
  // a diploma AND an enrollment certificate specifically, not just any
  // document. A single wrong-kind upload must not read as "documents done".
  const hasRequiredDocuments =
    documents.some((d) => d.kind === "diploma") &&
    documents.some((d) => d.kind === "enrollment_certificate")

  const { percent: completionPercent } = calcProfileCompletion(
    {
      profile_photo: profilePhoto,
      full_name: fullName,
      school_or_university: school,
      countries: countries.map((c) => ({ country: c })),
      major,
      detailed_bio: bio,
      grant_or_scholarship: grant,
      gpa,
      exam_results: examResults,
      phone,
      expertise_areas: expertiseAreas.map((a) => ({ area: a as ExpertiseArea })),
      languages: languages.map((l) => ({ language: l })),
      has_documents: hasRequiredDocuments,
      linkedin_url: linkedin,
      payout_details: payoutDetails,
    } as MentorProfile,
    {
      hasActiveService: services.some((s) => s.is_active),
      emailVerified: Boolean(me?.email && me.email_verified),
      hasTelegram: Boolean(me?.has_telegram),
    },
  )

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <MentorStatusBanner />
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-2 transition-colors group [-webkit-tap-highlight-color:transparent]" />

            <h1 className="text-2xl font-bold text-gray-900">{t("pageTitle")}</h1>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">{completionPercent}%</div>
            <div className="text-xs text-gray-400">{t("filledLabel")}</div>
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
              <p className="font-semibold text-red-800 text-sm">{t("bannedTitle")}</p>
              {banReason && <p className="text-xs text-red-600 mt-0.5">{banReason}</p>}
              <p className="text-xs text-red-500 mt-1">{t("bannedBody")}</p>
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
              className="relative w-24 h-24 rounded-full overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:opacity-50"
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt={t("photoAlt")} className="w-full h-full object-cover" />
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
              {profilePhoto ? t("changePhoto") : t("uploadPhoto")}
            </p>
            {!profilePhoto && (
              <p className="text-xs text-red-500 mt-1 font-medium">{t("photoRequiredForVerification")}</p>
            )}
          </div>

          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">{t("basicInfoTitle")}</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <div data-field="full_name">
                <Field label={t("fullNameLabel")} required error={fieldErrors.full_name}>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("fullNamePlaceholder")}
                    className={fieldErrors.full_name
                      ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                      : inputClass} />
                </Field>
              </div>
              <div className="sm:col-span-2" data-field="countries">
                <Field label={t("countriesLabel")} required error={fieldErrors.countries}>
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
                        {countryFlag(c)} {countryLabel(c, locale)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                    >
                      {t("otherCountry")}
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
                            {countryFlag(c)} {countryLabel(c, locale)}
                            <button
                              type="button"
                              onClick={() => toggleCountry(c)}
                              aria-label={t("removeCountry", { country: countryLabel(c, locale) })}
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
              <div data-field="school_or_university">
                <Field label={t("universityLabel")} required error={fieldErrors.school_or_university}>
                  <input value={school} onChange={(e) => setSchool(e.target.value)}
                    placeholder={t("universityPlaceholder")}
                    className={fieldErrors.school_or_university
                      ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                      : inputClass} />
                </Field>
              </div>
              <div data-field="major">
                <Field label={t("majorLabel")} required error={fieldErrors.major}>
                  <input value={major} onChange={(e) => setMajor(e.target.value)}
                    placeholder={t("majorPlaceholder")}
                    className={fieldErrors.major
                      ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                      : inputClass} />
                </Field>
              </div>
              <div data-field="grant_or_scholarship">
                <Field label={t("grantLabel")} required error={fieldErrors.grant_or_scholarship}>
                  <input value={grant} onChange={(e) => setGrant(e.target.value)}
                    placeholder={t("grantPlaceholder")}
                    className={fieldErrors.grant_or_scholarship
                      ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                      : inputClass} />
                </Field>
              </div>
              <div data-field="gpa">
                <Field label={t("gpaLabel")} required error={fieldErrors.gpa}>
                  <input value={gpa} onChange={(e) => setGpa(e.target.value)}
                    placeholder={t("gpaPlaceholder")}
                    className={fieldErrors.gpa
                      ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                      : inputClass} />
                </Field>
              </div>
            </div>
          </div>

          {/* Exams & social */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">{t("examsLinksTitle")}</h2>
            <div className="space-y-5">
              <div data-field="exam_results">
                <Field
                  label={t("examResultsLabel")}
                  required
                  hint={t("examResultsHint")}
                  error={fieldErrors.exam_results}
                >
                  <input value={examResults} onChange={(e) => setExamResults(e.target.value)}
                    placeholder={t("examResultsPlaceholder")}
                    className={fieldErrors.exam_results
                      ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                      : inputClass} />
                </Field>
              </div>
              <div data-field="phone">
                <Field
                  label={t("phoneLabel")}
                  required
                  hint={t("phoneHint")}
                  error={fieldErrors.phone}
                >
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder={t("phonePlaceholder")}
                    className={fieldErrors.phone
                      ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400`
                      : inputClass}
                  />
                </Field>
              </div>
              <Field label={t("linkedinLabel")} hint={t("linkedinHint")}>
                <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)}
                  placeholder={t("linkedinPlaceholder")} className={inputClass} />
              </Field>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6" data-field="detailed_bio">
            <h2 className="text-base font-semibold text-gray-900 mb-5">{t("aboutTitle")}</h2>
            <Field
              label={t("aboutLabel")}
              required
              hint={t("aboutHint")}
              error={fieldErrors.detailed_bio}
            >
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={5}
                placeholder={t("aboutPlaceholder")}
                className={fieldErrors.detailed_bio
                  ? `${inputClass} resize-none border-red-300 focus:ring-red-100 focus:border-red-400`
                  : `${inputClass} resize-none`} />
            </Field>
          </div>


          {/* Expertise */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6" data-field="expertise_areas">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {t("specializationTitle")}
              <span className="ml-1 text-red-400">*</span>
            </h2>
            <p className="text-sm text-gray-400 mb-5">{t("specializationSubtitle")}</p>
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
            {fieldErrors.expertise_areas && (
              <p className="text-xs text-red-600 mt-2">{fieldErrors.expertise_areas}</p>
            )}
          </div>

          {/* Languages */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6" data-field="languages">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {t("languagesTitle")}
              <span className="ml-1 text-red-400">*</span>
            </h2>
            <p className="text-sm text-gray-400 mb-5">{t("languagesSubtitle")}</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleLanguage(code)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    languages.includes(code)
                      ? "border-gray-900 bg-gray-50 text-gray-900"
                      : "border-gray-100 text-gray-600 hover:border-gray-200"
                  }`}
                >
                  {languages.includes(code) && <span className="mr-1.5">✓</span>}
                  {label}
                </button>
              ))}
            </div>
            {fieldErrors.languages && (
              <p className="text-xs text-red-600 mt-2">{fieldErrors.languages}</p>
            )}
          </div>

          {/* Payout */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">{t("payoutTitle")}</h2>
            <p className="text-sm text-gray-400 mb-5">{t("payoutSubtitle")}</p>
            <Field label={t("payoutLabel")}>
              <input value={payoutDetails} onChange={(e) => setPayoutDetails(e.target.value)}
                placeholder={t("payoutPlaceholder")} className={inputClass} />
            </Field>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6" data-field="documents">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              {t("documentsTitle")}
              <span className="ml-1 text-red-400">*</span>
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              {t("documentsSubtitle")}
            </p>
            <MentorDocumentsUploader isBanned={isBanned} onDocumentsChange={setDocuments} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {saved && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700">
              {t("savedNotice")}
            </div>
          )}

          </fieldset>

          <button
            type="submit"
            disabled={saving || isBanned}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? t("saving") : t("saveProfile")}
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
