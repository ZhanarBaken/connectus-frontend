"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import {
  authFetch,
  clearAuth,
  createMentorService,
  fetchMe,
  fetchMentorProfile,
  fetchMentorServices,
  fetchMyMentorSchedule,
  saveMyMentorSchedule,
  updateMentorProfile,
  submitMentorProfile,
} from "@/lib/api"
import { POPULAR_COUNTRY_CODES, countryFlag, countryLabel } from "@/lib/countries"
import { LANGUAGE_CODES, languageLabel } from "@/lib/languages"
import {
  emptyWeekSchedule,
  flatToWeekSchedule,
  weekScheduleToFlat,
  type ScheduleBlock,
  type TimeSlot,
  type WeekSchedule,
} from "@/lib/schedule"
import { translateScheduleErrorMessage } from "@/lib/scheduleErrors"
import { translateFileUploadErrorMessage } from "@/lib/fileUploadErrors"
import { ExpertiseArea, MentorService } from "@/types"
import { inputClass } from "@/lib/formStyles"
import AvatarCropperModal from "@/components/AvatarCropperModal"
import CountryPickerModal from "@/components/CountryPickerModal"
import {
  MentorDocument,
  ALLOWED_DOCUMENT_TYPES,
  formatFileSize,
} from "@/components/MentorDocumentsUploader"
import Icon from "@/components/Icon"
import Logo from "@/components/Logo"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

type Tab = "about" | "education" | "expertise" | "services" | "schedule"

const TAB_IDS: Tab[] = ["about", "education", "expertise", "services", "schedule"]

const TIME_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`)
  }
}

const EXPERTISE_OPTIONS = [
  { value: "admission",    icon: "flag"            },
  { value: "scholarships", icon: "military_tech"   },
  { value: "documents",    icon: "article"         },
  { value: "visa",         icon: "flight_takeoff"  },
]

// Matches apps.mentors.models.MentorProfile.submission_errors() — only
// these two kinds actually block submission, the rest are optional.
const REQUIRED_DOCUMENT_KINDS = new Set(["diploma", "enrollment_certificate"])

// Matches apps.services.models.CONSULTATION_DESCRIPTION_MIN_LENGTH —
// the paid_consultation category's description has a real minimum
// length on the backend, not just "non-blank".
const SERVICE_DESCRIPTION_MIN_LENGTH = 80
// Matches apps.services.models.CONSULTATION_DURATION_MIN_MINUTES.
const SERVICE_DURATION_MIN_MINUTES = 5

export default function MentorOnboarding() {
  const t = useTranslations("Onboarding.Mentor")
  const tExpertise = useTranslations("Landing.Expertise")
  // Reuses the /mentors/services page's copy for the category picker and
  // the support-category fields — same concepts, single source of truth
  // for that copy, instead of a second parallel translation set.
  const tServices = useTranslations("Mentors.Services")
  // Reuses the /mentors/schedule page's copy for day labels and the
  // save/add-slot actions — same concepts, single source of truth.
  const tSchedule = useTranslations("Mentors.Schedule")
  // Reuses the /mentors/profile page's document-status copy (badges,
  // rejection reason, download/delete aria labels) — same concepts.
  const tMentorDocs = useTranslations("Mentors.Documents")
  const locale = useLocale()
  const router = useRouter()
  const [ready, setReady]     = useState(false)
  const [tab, setTab]         = useState<Tab>("about")
  const [saved, setSaved]     = useState(false)
  const [saveError, setSaveError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [earlySubmitHint, setEarlySubmitHint] = useState(false)

  const TABS: { id: Tab; label: string }[] = [
    { id: "about", label: t("tabAbout") },
    { id: "education", label: t("tabEducation") },
    { id: "expertise", label: t("tabExpertise") },
    { id: "services", label: t("tabServices") },
    { id: "schedule", label: t("tabSchedule") },
  ]

  const DAY_LABELS_FULL = [
    tSchedule("monday"), tSchedule("tuesday"), tSchedule("wednesday"),
    tSchedule("thursday"), tSchedule("friday"), tSchedule("saturday"), tSchedule("sunday"),
  ]

  const DOCUMENT_KIND_OPTIONS = [
    { value: "diploma", label: t("docDiploma") },
    { value: "enrollment_certificate", label: t("docEnrollment") },
    { value: "university_id", label: t("docUniversityId") },
    { value: "other", label: t("docOther") },
  ]

  const DOC_STATUS_BADGE: Record<string, { label: string; className: string }> = {
    pending: { label: tMentorDocs("statusPending"), className: "bg-yellow-50 text-yellow-700" },
    approved: { label: tMentorDocs("statusApproved"), className: "bg-green-50 text-green-700" },
    rejected: { label: tMentorDocs("statusRejected"), className: "bg-red-50 text-red-700" },
  }

  // Translated copy for every key apps.mentors.models.MentorProfile
  // .submission_errors() can return — the backend's own messages are
  // fixed English strings ("This field is required." etc.), so we show
  // our own localized text instead of the raw value from the response.
  const FIELD_ERROR_MESSAGES: Record<string, string> = {
    full_name: t("errRequired"),
    major: t("errRequired"),
    grant_or_scholarship: t("errRequired"),
    school_or_university: t("errRequired"),
    gpa: t("errRequired"),
    exam_results: t("errRequired"),
    detailed_bio: t("errRequired"),
    phone: t("errRequired"),
    expertise_areas: t("errExpertiseRequired"),
    countries: t("errCountriesRequired"),
    languages: t("errLanguagesRequired"),
    profile_photo: t("errPhotoRequired"),
    diploma_document: t("errDiplomaRequired"),
    enrollment_document: t("errEnrollmentRequired"),
    services: t("errServicesRequired"),
    availability: t("errAvailabilityRequired"),
    email: t("errEmailRequired"),
    telegram: t("errTelegramRequired"),
  }
  const fieldError = (key: string): string | undefined =>
    submitError[key] ? (FIELD_ERROR_MESSAGES[key] ?? submitError[key]) : undefined
  const fieldClass = (key: string): string =>
    fieldError(key) ? `${inputClass} border-red-300 focus:ring-red-100 focus:border-red-400` : inputClass

  // Photo
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [pickedFile, setPickedFile]     = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // About
  const [fullName, setFullName]       = useState("")
  const [bio, setBio]                 = useState("")
  const [phone, setPhone]             = useState("")
  const [isUniversal, setIsUniversal] = useState(false)
  const [languages, setLanguages]     = useState<string[]>([])

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
  const [documents, setDocuments]   = useState<MentorDocument[]>([])
  const [uploadingDocKind, setUploadingDocKind] = useState<string | null>(null)
  const [docErrors, setDocErrors]   = useState<Record<string, string>>({})
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Services — a mentor needs at least one active service to submit
  // (apps.mentors.models.MentorProfile.submission_errors). This is
  // deliberately a minimal quick-add for a single Primary Consultation
  // (paid_consultation) service, not the full editor with all
  // categories/fields — that lives at /mentors/services for later.
  const [services, setServices] = useState<MentorService[]>([])
  const [serviceCategory, setServiceCategory] = useState<"paid_consultation" | "support">("paid_consultation")
  const [serviceTitle, setServiceTitle] = useState("")
  const [serviceDescription, setServiceDescription] = useState("")
  const [servicePrice, setServicePrice] = useState("")
  const [serviceDuration, setServiceDuration] = useState("60")
  const [serviceMeetingsMin, setServiceMeetingsMin] = useState("")
  const [serviceMeetingsMax, setServiceMeetingsMax] = useState("")
  const [serviceDurationMonthsMin, setServiceDurationMonthsMin] = useState("")
  const [serviceDurationMonthsMax, setServiceDurationMonthsMax] = useState("")
  const [serviceIsPriceNegotiable, setServiceIsPriceNegotiable] = useState(false)
  const [serviceIntroCallEnabled, setServiceIntroCallEnabled] = useState(true)
  const [creatingService, setCreatingService] = useState(false)
  const [serviceError, setServiceError] = useState("")

  // Schedule — a mentor needs at least one weekly availability window to
  // submit (apps.mentors.models.MentorProfile.submission_errors). Unlike
  // the other tabs, availability isn't saved on blur/toggle — it's an
  // explicit "Save schedule" action, same as the full /mentors/schedule
  // editor, since toggling several days/slots before committing avoids a
  // PUT per click. `availabilitySaved` tracks the confirmed-persisted
  // state (mirrors how `tabDone.services` reflects created services, not
  // whatever's currently typed into the add-service form).
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(emptyWeekSchedule())
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([])
  const [availabilitySaved, setAvailabilitySaved] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleError, setScheduleError] = useState("")

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
          setIsUniversal(p.is_universal ?? false)
          setLanguages((p.languages ?? []).map((l: { language: string }) => l.language))
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
        try {
          setServices(await fetchMentorServices())
        } catch { /* non-fatal */ }
        try {
          const schedule = await fetchMyMentorSchedule()
          setWeekSchedule(flatToWeekSchedule(schedule.weekly))
          setScheduleBlocks(schedule.blocks)
          setAvailabilitySaved(schedule.weekly.length > 0)
        } catch { /* non-fatal */ }
        setReady(true)
      })
      .catch(() => {
        // Clear the stale/invalid token before bouncing back — otherwise
        // the login page's token-presence check sends the user straight
        // back to a page that fails the same way, forming an infinite
        // redirect loop instead of a clean re-login.
        clearAuth()
        router.replace("/auth/login")
      })
  }, [router])

  // ─── Auto-save helpers ─────────────────────────────────────────
  const flashSaved = useCallback(() => {
    setSaved(true)
    setSaveError("")
    setTimeout(() => setSaved(false), 1500)
  }, [])

  const saveAbout = useCallback(async () => {
    try {
      await updateMentorProfile({
        full_name: fullName,
        detailed_bio: bio,
        phone,
        is_universal: isUniversal,
        languages: languages.map((l) => ({ language: l })),
      })
      flashSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("saveErrorGeneric"))
    }
  }, [fullName, bio, phone, isUniversal, languages, flashSaved, t])

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
      setSaveError(e instanceof Error ? e.message : t("saveErrorGeneric"))
    }
  }, [countries, school, major, grant, gpa, examResults, flashSaved, t])

  const saveExpertise = useCallback(async (areas: string[]) => {
    try {
      await updateMentorProfile({
        expertise_areas: areas.map((a) => ({ area: a as ExpertiseArea })),
      })
      flashSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("saveErrorGeneric"))
    }
  }, [flashSaved, t])

  const saveCountries = useCallback(async (next: string[]) => {
    try {
      await updateMentorProfile({ countries: next.map((c) => ({ country: c })) })
      flashSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("saveErrorGeneric"))
    }
  }, [flashSaved, t])

  const saveLanguages = useCallback(async (next: string[]) => {
    try {
      await updateMentorProfile({ languages: next.map((l) => ({ language: l })) })
      flashSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("saveErrorGeneric"))
    }
  }, [flashSaved, t])

  const saveIsUniversal = useCallback(async (next: boolean) => {
    try {
      await updateMentorProfile({ is_universal: next })
      flashSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("saveErrorGeneric"))
    }
  }, [flashSaved, t])

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
        const raw = err.profile_photo?.[0] || err.profile_photo || err.detail || t("saveErrorGeneric")
        throw new Error(translateFileUploadErrorMessage(raw, t))
      }
      const data = await res.json()
      setProfilePhoto(data.profile_photo ?? null)
      flashSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("photoUploadErrorGeneric"))
    } finally {
      setUploadingPhoto(false)
    }
  }

  // ─── Document upload / delete ──────────────────────────────────
  const uploadDocument = async (kind: string, file: File) => {
    // A second click/drop before the in-flight request resolves would
    // otherwise fire a duplicate POST for the same (or another) kind.
    if (uploadingDocKind) return
    // The picker's `accept` attribute only filters the OS dialog (and not
    // at all when the user picks "All files"), and drag-and-drop bypasses
    // it entirely — so both paths funnel through this one explicit check
    // instead of a round trip to the API.
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      setDocErrors((prev) => ({ ...prev, [kind]: t("fileTypeNotAllowed") }))
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setDocErrors((prev) => ({ ...prev, [kind]: t("docTooLarge") }))
      return
    }
    setDocErrors((prev) => {
      if (!(kind in prev)) return prev
      const next = { ...prev }
      delete next[kind]
      return next
    })
    setUploadingDocKind(kind)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("kind", kind)
      const res = await authFetch(`${BASE_URL}/mentors/documents/`, { method: "POST", body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const first = Object.values(err)[0]
        const raw = Array.isArray(first) ? String(first[0]) : String(err.detail || first || t("docUploadErrorGeneric"))
        throw new Error(translateFileUploadErrorMessage(raw, t))
      }
      const doc: MentorDocument = await res.json()
      setDocuments((prev) => [doc, ...prev])
    } catch (e) {
      setDocErrors((prev) => ({ ...prev, [kind]: e instanceof Error ? e.message : t("docUploadErrorGeneric") }))
    } finally {
      setUploadingDocKind(null)
    }
  }

  const handleDocFileChosen = (kind: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0]
    e.target.value = ""
    if (!chosen) return
    uploadDocument(kind, chosen)
  }

  const handleDocDrop = (kind: string, e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (!dropped) return
    uploadDocument(kind, dropped)
  }

  const handleDeleteDocument = async (id: number) => {
    setDeletingDocId(id)
    try {
      const res = await authFetch(`${BASE_URL}/mentors/documents/${id}/`, { method: "DELETE" })
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id))
      } else {
        setDocErrors((prev) => ({ ...prev, _delete: t("docDeleteError") }))
      }
    } catch {
      setDocErrors((prev) => ({ ...prev, _delete: t("docDeleteError") }))
    } finally {
      setDeletingDocId(null)
    }
  }

  // ─── Quick service create ───────────────────────────────────────
  const handleCreateService = async () => {
    setCreatingService(true)
    setServiceError("")
    try {
      const payload: Record<string, unknown> = {
        title: serviceTitle,
        description: serviceDescription,
        currency: "KZT",
        grade_min: null,
        grade_max: null,
        payout_category: serviceCategory,
      }
      if (serviceCategory === "paid_consultation") {
        payload.price = servicePrice
        payload.duration_minutes = Number(serviceDuration)
      } else {
        payload.meetings_min = Number(serviceMeetingsMin)
        payload.meetings_max = Number(serviceMeetingsMax)
        payload.duration_months_min = Number(serviceDurationMonthsMin)
        payload.duration_months_max = Number(serviceDurationMonthsMax)
        payload.is_price_negotiable = serviceIsPriceNegotiable
        payload.price = serviceIsPriceNegotiable ? "0.00" : servicePrice
        payload.intro_call_enabled = serviceIntroCallEnabled
      }
      const created = await createMentorService(payload)
      setServices((prev) => [created, ...prev])
      setServiceTitle("")
      setServiceDescription("")
      setServicePrice("")
      setServiceDuration("60")
      setServiceMeetingsMin("")
      setServiceMeetingsMax("")
      setServiceDurationMonthsMin("")
      setServiceDurationMonthsMax("")
      setServiceIsPriceNegotiable(false)
      setServiceIntroCallEnabled(true)
    } catch (e) {
      setServiceError(e instanceof Error ? e.message : t("saveErrorGeneric"))
    } finally {
      setCreatingService(false)
    }
  }

  // ─── Schedule ────────────────────────────────────────────────────
  const toggleDay = (day: number) => {
    setWeekSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        slots: prev[day].enabled
          ? prev[day].slots
          : prev[day].slots.length
            ? prev[day].slots
            : [{ start: "10:00", end: "18:00" }],
      },
    }))
  }

  const updateSlot = (day: number, idx: number, field: keyof TimeSlot, value: string) => {
    setWeekSchedule((prev) => {
      const slots = [...prev[day].slots]
      slots[idx] = { ...slots[idx], [field]: value }
      return { ...prev, [day]: { ...prev[day], slots } }
    })
  }

  const addSlot = (day: number) => {
    setWeekSchedule((prev) => {
      const slots = [...prev[day].slots, { start: "10:00", end: "18:00" }]
      return { ...prev, [day]: { ...prev[day], slots } }
    })
  }

  const removeSlot = (day: number, idx: number) => {
    setWeekSchedule((prev) => {
      const slots = prev[day].slots.filter((_, i) => i !== idx)
      return { ...prev, [day]: { ...prev[day], slots } }
    })
  }

  const handleSaveSchedule = async () => {
    setSavingSchedule(true)
    setScheduleError("")
    try {
      const weekly = weekScheduleToFlat(weekSchedule)
      await saveMyMentorSchedule({ weekly, blocks: scheduleBlocks })
      setAvailabilitySaved(weekly.length > 0)
      flashSaved()
    } catch (e) {
      setScheduleError(e instanceof Error ? translateScheduleErrorMessage(e.message, tSchedule) : tSchedule("saveError"))
    } finally {
      setSavingSchedule(false)
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
        is_universal: isUniversal,
        languages: languages.map((l) => ({ language: l })),
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
            // Scroll to the first offending field once the tab switch
            // above has committed — same pattern as /mentors/profile's
            // fieldErrors scroll, just deferred a tick since here the
            // target field's tab may not even be mounted yet.
            const firstKey = FIELD_ERROR_PRIORITY.find((k) => k in parsed)
            if (firstKey) {
              setTimeout(() => {
                document.querySelector(`[data-field="${firstKey}"]`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }, 50)
            }
          } else {
            setSubmitError({ detail: e.message })
          }
        } catch {
          setSubmitError({ detail: e.message })
        }
      } else {
        setSubmitError({ detail: t("unknownSubmitError") })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Completion checks ─────────────────────────────────────────
  const tabDone: Record<Tab, boolean> = {
    about:     Boolean(profilePhoto && fullName.trim() && bio.trim() && phone.trim() && languages.length > 0),
    education: Boolean(
      countries.length > 0 && school.trim() && major.trim()
      && grant.trim() && gpa.trim() && examResults.trim()
    ),
    // Matches the backend's actual submit requirement (apps.mentors.models
    // MentorProfile.submission_errors) — a diploma AND an enrollment
    // certificate specifically, not just any one document.
    expertise: expertise.length > 0 &&
      documents.some((d) => d.kind === "diploma") &&
      documents.some((d) => d.kind === "enrollment_certificate"),
    services: services.some((s) => s.is_active),
    schedule: availabilitySaved,
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t("successTitle")}</h1>
          <p className="text-gray-500 text-sm mb-6">
            {t("successBody")}
          </p>
          <button
            onClick={() => router.push("/mentor/dashboard")}
            className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm"
          >
            {t("goToDashboard")}
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
          <p className="text-gray-400 text-xs">{t("headerTagline")}</p>
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

        {/* Progress bar */}
        {(() => {
          const doneCount = Object.values(tabDone).filter(Boolean).length
          const total = TAB_IDS.length
          return (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{t("progress")}</span>
                <span>{t("progressCount", { done: doneCount, total })}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${(doneCount / total) * 100}%` }}
                />
              </div>
            </div>
          )
        })()}

        {/* Save status */}
        <div className="h-5 mb-2 text-center">
          {saved && <p className="text-xs text-emerald-600">{t("saved")}</p>}
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">

          {/* ── О СЕБЕ ── */}
          {tab === "about" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t("aboutHeading")}</h2>

              {/* Фото профиля */}
              <div data-field="profile_photo">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("photoLabel")} <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-3">{t("photoHint")}</p>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        setSaveError(t("photoTooLarge"))
                      } else {
                        setSaveError("")
                        setPickedFile(file)
                      }
                    }
                    e.target.value = ""
                  }}
                />
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="relative w-20 h-20 rounded-full overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:opacity-50 flex-shrink-0"
                  >
                    {profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profilePhoto} alt={t("photoAlt")} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                        <Icon name="photo_camera" size={28} className="text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icon name="edit" size={20} className="text-white" />
                      </span>
                    </div>
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </button>
                  <p className="text-xs text-gray-400">
                    {profilePhoto ? t("changePhoto") : t("photoFormats")}
                  </p>
                </div>
                {fieldError("profile_photo") && (
                  <p className="text-xs text-red-600 mt-1">{fieldError("profile_photo")}</p>
                )}
              </div>
              <div data-field="full_name">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("fullNameLabel")} <span className="text-red-400">*</span>
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={saveAbout}
                  placeholder={t("fullNamePlaceholder")}
                  className={fieldClass("full_name")}
                />
                {fieldError("full_name") && (
                  <p className="text-xs text-red-600 mt-1">{fieldError("full_name")}</p>
                )}
              </div>
              <div data-field="detailed_bio">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("bioLabel")} <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={saveAbout}
                  rows={4}
                  placeholder={t("bioPlaceholder")}
                  className={`${fieldClass("detailed_bio")} resize-none`}
                />
                {fieldError("detailed_bio") ? (
                  <p className="text-xs text-red-600 mt-1">{fieldError("detailed_bio")}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">{t("bioHint")}</p>
                )}
              </div>
              <div data-field="phone">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("phoneLabel")} <span className="text-red-400">*</span>
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={saveAbout}
                  type="tel"
                  placeholder={t("phonePlaceholder")}
                  className={fieldClass("phone")}
                />
                {fieldError("phone") ? (
                  <p className="text-xs text-red-600 mt-1">{fieldError("phone")}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">{t("phoneHint")}</p>
                )}
              </div>
              <div data-field="languages">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("languagesLabel")} <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_CODES.map((value) => {
                    const label = languageLabel(value)
                    const active = languages.includes(value)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? languages.filter((l) => l !== value)
                            : [...languages, value]
                          setLanguages(next)
                          void saveLanguages(next)
                        }}
                        className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-all ${
                          active
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                {fieldError("languages") && (
                  <p className="text-xs text-red-600 mt-1">{fieldError("languages")}</p>
                )}
              </div>
              <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-violet-300 hover:bg-violet-50/40 transition-all group">
                <input
                  type="checkbox"
                  checked={isUniversal}
                  onChange={(e) => {
                    setIsUniversal(e.target.checked)
                    void saveIsUniversal(e.target.checked)
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-violet-600 flex-shrink-0"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800 group-hover:text-violet-700">{t("universalLabel")}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{t("universalHint")}</p>
                </div>
              </label>
            </div>
          )}

          {/* ── ОБРАЗОВАНИЕ ── */}
          {tab === "education" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t("educationHeading")}</h2>
              <div data-field="countries">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("countriesLabel")} <span className="text-red-400">*</span>{" "}
                  <span className="text-gray-400 font-normal">{t("countriesMulti")}</span>
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
                      {countryFlag(c)} {countryLabel(c, locale)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="col-span-3 px-2 py-2 rounded-xl text-xs border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 font-medium transition-all"
                  >
                    {t("otherCountry")}
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
                          {countryFlag(c)} {countryLabel(c, locale)}
                          <button
                            type="button"
                            onClick={() => {
                              const next = countries.filter((x) => x !== c)
                              setCountries(next)
                              void saveCountries(next)
                            }}
                            aria-label={t("removeCountry", { country: countryLabel(c, locale) })}
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
                {fieldError("countries") && (
                  <p className="text-xs text-red-600 mt-1">{fieldError("countries")}</p>
                )}
              </div>
              <div data-field="school_or_university">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("universityLabel")} <span className="text-red-400">*</span>
                </label>
                <input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  onBlur={saveEducation}
                  placeholder={t("universityPlaceholder")}
                  className={fieldClass("school_or_university")}
                />
                {fieldError("school_or_university") && (
                  <p className="text-xs text-red-600 mt-1">{fieldError("school_or_university")}</p>
                )}
              </div>
              <div data-field="major">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("majorLabel")} <span className="text-red-400">*</span>
                </label>
                <input
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  onBlur={saveEducation}
                  placeholder={t("majorPlaceholder")}
                  className={fieldClass("major")}
                />
                {fieldError("major") && (
                  <p className="text-xs text-red-600 mt-1">{fieldError("major")}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div data-field="grant_or_scholarship">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t("grantLabel")} <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={grant}
                    onChange={(e) => setGrant(e.target.value)}
                    onBlur={saveEducation}
                    placeholder={t("grantPlaceholder")}
                    className={fieldClass("grant_or_scholarship")}
                  />
                  {fieldError("grant_or_scholarship") && (
                    <p className="text-xs text-red-600 mt-1">{fieldError("grant_or_scholarship")}</p>
                  )}
                </div>
                <div data-field="gpa">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t("gpaLabel")} <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                    onBlur={saveEducation}
                    placeholder={t("gpaPlaceholder")}
                    className={fieldClass("gpa")}
                  />
                  {fieldError("gpa") && (
                    <p className="text-xs text-red-600 mt-1">{fieldError("gpa")}</p>
                  )}
                </div>
              </div>
              <div data-field="exam_results">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("examResultsLabel")} <span className="text-red-400">*</span>
                </label>
                <input
                  value={examResults}
                  onChange={(e) => setExamResults(e.target.value)}
                  onBlur={saveEducation}
                  placeholder={t("examResultsPlaceholder")}
                  className={fieldClass("exam_results")}
                />
                {fieldError("exam_results") && (
                  <p className="text-xs text-red-600 mt-1">{fieldError("exam_results")}</p>
                )}
              </div>
            </div>
          )}

          {/* ── ЭКСПЕРТИЗА ── */}
          {tab === "expertise" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t("expertiseHeading")}</h2>
              <p className="text-gray-400 text-sm mb-4">
                {t("expertiseSubtitle")} <span className="text-red-400">*</span>
              </p>
              <div data-field="expertise_areas" className="grid grid-cols-2 gap-3">
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
                        {tExpertise.has(opt.value) ? tExpertise(opt.value) : opt.value}
                      </span>
                    </button>
                  )
                })}
              </div>
              {fieldError("expertise_areas") && (
                <p className="text-xs text-red-600 mt-1">{fieldError("expertise_areas")}</p>
              )}

              {/* ── ДОКУМЕНТЫ ── */}
              <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-gray-900">{t("documentsTitle")}</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t("documentsMulti")}</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                {t("documentsSubtitle")}
              </p>

              <div className="space-y-3">
                {DOCUMENT_KIND_OPTIONS.map((opt) => {
                  const kindDocs = documents.filter((d) => d.kind === opt.value)
                  const required = REQUIRED_DOCUMENT_KINDS.has(opt.value)
                  const isUploading = uploadingDocKind === opt.value
                  // Another kind's upload is in flight — only one can run
                  // at a time (see the single-flight guard in
                  // uploadDocument), so this slot should read as disabled
                  // rather than silently no-op if clicked.
                  const blockedByOtherUpload = uploadingDocKind !== null && !isUploading
                  const slotError = docErrors[opt.value]
                  // diploma/enrollment_document field errors come from
                  // apps.mentors.models.MentorProfile.submission_errors()
                  // and are keyed "<kind>_document" except diploma itself.
                  const fieldKey = opt.value === "diploma" ? "diploma_document"
                    : opt.value === "enrollment_certificate" ? "enrollment_document"
                    : null
                  const requirementError = fieldKey ? fieldError(fieldKey) : undefined

                  return (
                    <div key={opt.value} data-field={fieldKey ?? undefined} className="border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center gap-1 mb-2">
                        <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                        {required && <span className="text-red-400 text-sm leading-none">*</span>}
                      </div>

                      {kindDocs.length > 0 && (
                        <div className="space-y-2 mb-2">
                          {kindDocs.map((doc) => {
                            const badge = DOC_STATUS_BADGE[doc.status] || DOC_STATUS_BADGE.pending
                            return (
                              <div key={doc.id} className="flex items-start gap-2.5 bg-gray-50 rounded-lg px-3 py-2">
                                <Icon name="description" size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs font-medium text-gray-900 truncate">{doc.original_filename}</p>
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.className}`}>
                                      {badge.label}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-400">{formatFileSize(doc.size_bytes)}</p>
                                  {doc.status === "rejected" && doc.review_note && (
                                    <div className="mt-1.5 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">
                                      <p className="text-[11px] text-red-600">
                                        <span className="font-medium">{tMentorDocs("rejectionReason")}</span> {doc.review_note}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {doc.status !== "approved" && (
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    disabled={deletingDocId === doc.id}
                                    className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0 disabled:opacity-50"
                                    aria-label={t("deleteAria")}
                                  >
                                    <Icon name="delete" size={16} />
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {kindDocs.length === 0 ? (
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDocDrop(opt.value, e)}
                          onClick={() => docInputRefs.current[opt.value]?.click()}
                          className={`border-2 border-dashed border-gray-200 rounded-lg py-2.5 px-3 text-center transition-colors ${
                            blockedByOtherUpload ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-gray-400"
                          }`}
                        >
                          {isUploading ? (
                            <p className="text-xs text-gray-400">{t("uploading")}</p>
                          ) : (
                            <>
                              <p className="text-xs text-gray-500">{t("dropHint")}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{t("fileFormats")}</p>
                            </>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => docInputRefs.current[opt.value]?.click()}
                          disabled={uploadingDocKind !== null}
                          className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
                        >
                          {isUploading ? t("uploading") : `+ ${t("uploadAnother")}`}
                        </button>
                      )}
                      <input
                        ref={(el) => { docInputRefs.current[opt.value] = el }}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        className="hidden"
                        onChange={(e) => handleDocFileChosen(opt.value, e)}
                      />

                      {slotError && <p className="text-xs text-red-500 mt-1.5">{slotError}</p>}
                      {requirementError && (
                        <p className="text-xs text-red-600 mt-1.5">{requirementError}</p>
                      )}
                    </div>
                  )
                })}
              </div>
              {docErrors._delete && (
                <p className="text-xs text-red-500 mt-2">{docErrors._delete}</p>
              )}
              </div>
            </div>
          )}

          {/* ── УСЛУГИ ── */}
          {tab === "services" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t("servicesHeading")}</h2>
              <p className="text-gray-400 text-sm mb-4">
                {t("servicesSubtitle")} <span className="text-red-400">*</span>
              </p>

              <div data-field="services" className="border border-gray-200 rounded-2xl p-4 mb-4 space-y-3">
                {/* Category toggle — a mentor can add either (or both,
                    one at a time: the form resets and stays open after
                    each successful add, so switching type and adding
                    again just works). */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setServiceCategory("paid_consultation")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      serviceCategory === "paid_consultation"
                        ? "border-gray-900 bg-gray-50 text-gray-900"
                        : "border-gray-100 text-gray-500 hover:border-gray-200"
                    }`}
                  >
                    <Icon name="forum" size={16} />
                    {tServices("consultationOptionTitle")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceCategory("support")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      serviceCategory === "support"
                        ? "border-gray-900 bg-gray-50 text-gray-900"
                        : "border-gray-100 text-gray-500 hover:border-gray-200"
                    }`}
                  >
                    <Icon name="groups" size={16} />
                    {tServices("supportOptionTitle")}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t("serviceTitleLabel")}
                  </label>
                  <input
                    value={serviceTitle}
                    onChange={(e) => setServiceTitle(e.target.value)}
                    placeholder={
                      serviceCategory === "support"
                        ? tServices("namePlaceholderSupport")
                        : t("serviceTitlePlaceholder")
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t("serviceDescriptionLabel")}{" "}
                    {serviceCategory === "paid_consultation" && (
                      <span className="text-gray-400 font-normal">
                        {t("serviceDescriptionMinChars", { min: SERVICE_DESCRIPTION_MIN_LENGTH })}
                      </span>
                    )}
                  </label>
                  <textarea
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    rows={3}
                    placeholder={
                      serviceCategory === "support"
                        ? tServices("descriptionPlaceholderSupport")
                        : t("serviceDescriptionPlaceholder")
                    }
                    className={`${inputClass} resize-none`}
                  />
                  {serviceCategory === "paid_consultation" && (
                    <p className="text-xs text-gray-400 mt-1">
                      {serviceDescription.trim().length}/{SERVICE_DESCRIPTION_MIN_LENGTH}
                    </p>
                  )}
                </div>

                {serviceCategory === "paid_consultation" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t("servicePriceLabel")}
                      </label>
                      <input
                        value={servicePrice}
                        onChange={(e) => setServicePrice(e.target.value)}
                        type="number"
                        min="0"
                        placeholder={t("servicePricePlaceholder")}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t("serviceDurationLabel")}
                      </label>
                      <input
                        value={serviceDuration}
                        onChange={(e) => setServiceDuration(e.target.value)}
                        type="number"
                        min="5"
                        className={inputClass}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {tServices("meetingsMinLabel")}
                        </label>
                        <input
                          value={serviceMeetingsMin}
                          onChange={(e) => setServiceMeetingsMin(e.target.value)}
                          type="number"
                          min={1}
                          placeholder="4"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {tServices("meetingsMaxLabel")}
                        </label>
                        <input
                          value={serviceMeetingsMax}
                          onChange={(e) => setServiceMeetingsMax(e.target.value)}
                          type="number"
                          min={1}
                          placeholder="8"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {tServices("durationMonthsMinLabel")}
                        </label>
                        <input
                          value={serviceDurationMonthsMin}
                          onChange={(e) => setServiceDurationMonthsMin(e.target.value)}
                          type="number"
                          min={1}
                          placeholder="6"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {tServices("durationMonthsMaxLabel")}
                        </label>
                        <input
                          value={serviceDurationMonthsMax}
                          onChange={(e) => setServiceDurationMonthsMax(e.target.value)}
                          type="number"
                          min={1}
                          placeholder="12"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={serviceIsPriceNegotiable}
                        onChange={(e) => setServiceIsPriceNegotiable(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      {tServices("priceNegotiableLabel")}
                    </label>
                    {!serviceIsPriceNegotiable && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {t("servicePriceLabel")}
                        </label>
                        <input
                          value={servicePrice}
                          onChange={(e) => setServicePrice(e.target.value)}
                          type="number"
                          min="0"
                          placeholder={t("servicePricePlaceholder")}
                          className={inputClass}
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={serviceIntroCallEnabled}
                        onChange={(e) => setServiceIntroCallEnabled(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      {tServices("introCallLabel")}
                    </label>
                  </>
                )}

                {serviceError && <p className="text-xs text-red-500">{serviceError}</p>}
                {fieldError("services") && (
                  <p className="text-xs text-red-600">{fieldError("services")}</p>
                )}
                <button
                  onClick={handleCreateService}
                  disabled={
                    !serviceTitle.trim() ||
                    creatingService ||
                    (serviceCategory === "paid_consultation"
                      ? serviceDescription.trim().length < SERVICE_DESCRIPTION_MIN_LENGTH ||
                        !servicePrice ||
                        Number(serviceDuration) < SERVICE_DURATION_MIN_MINUTES
                      : !serviceMeetingsMin ||
                        !serviceMeetingsMax ||
                        !serviceDurationMonthsMin ||
                        !serviceDurationMonthsMax ||
                        (!serviceIsPriceNegotiable && !servicePrice))
                  }
                  className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {creatingService ? t("creatingService") : t("addService")}
                </button>
              </div>

              {services.length > 0 && (
                <div className="space-y-2">
                  {services.map((s) => {
                    const isSupport = s.payout_category === "support"
                    const parts: string[] = []
                    if (isSupport) {
                      if (s.meetings_min !== null && s.meetings_max !== null) {
                        parts.push(tServices("meetingsRange", { min: s.meetings_min, max: s.meetings_max }))
                      }
                      if (s.duration_months_min !== null && s.duration_months_max !== null) {
                        parts.push(tServices("monthsRange", { min: s.duration_months_min, max: s.duration_months_max }))
                      }
                    } else {
                      parts.push(s.is_price_negotiable ? tServices("negotiablePrice") : `${s.price} ₸`)
                      parts.push(`${s.duration_minutes} ${t("minutes")}`)
                    }
                    const summary = parts.join(" · ")
                    return (
                      <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                        <Icon name={isSupport ? "groups" : "description"} size={20} className="text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                          <p className="text-xs text-gray-400">{summary}</p>
                        </div>
                        {!s.is_active && (
                          <span className="text-xs text-gray-400 flex-shrink-0">{t("serviceInactive")}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">{t("servicesMoreHint")}</p>
            </div>
          )}

          {/* ── РАСПИСАНИЕ ── */}
          {tab === "schedule" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">{t("scheduleHeading")}</h2>
              <p className="text-gray-400 text-sm mb-4">
                {t("scheduleSubtitle")} <span className="text-red-400">*</span>
              </p>

              <div data-field="availability" className="space-y-2">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const ds = weekSchedule[day]
                  if (!ds) return null
                  const enabled = ds.enabled
                  return (
                    <div
                      key={day}
                      className={`border border-gray-200 rounded-2xl p-4 transition-opacity ${enabled ? "" : "opacity-60"}`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleDay(day)}
                          aria-pressed={enabled}
                          aria-label={DAY_LABELS_FULL[day]}
                          className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                            enabled ? "bg-indigo-600" : "bg-gray-200"
                          } cursor-pointer`}
                        >
                          <span
                            className={`inline-block w-5 h-5 rounded-full bg-white shadow transform-gpu transition-transform duration-200 mt-0.5 ${
                              enabled ? "translate-x-[22px]" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                        <span className={`text-sm font-semibold ${enabled ? "text-gray-900" : "text-gray-400"}`}>
                          {DAY_LABELS_FULL[day]}
                        </span>
                      </div>

                      {enabled && (
                        <div className="mt-3 ml-14 space-y-2">
                          {ds.slots.map((slot, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <select
                                value={slot.start}
                                onChange={(e) => updateSlot(day, idx, "start", e.target.value)}
                                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              >
                                {TIME_OPTIONS.map((time) => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              <span className="text-gray-400 text-sm">&mdash;</span>
                              <select
                                value={slot.end}
                                onChange={(e) => updateSlot(day, idx, "end", e.target.value)}
                                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              >
                                {TIME_OPTIONS.map((time) => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => removeSlot(day, idx)}
                                className="ml-1 p-1 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                aria-label={tSchedule("removeSlot")}
                              >
                                <Icon name="close" size={16} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addSlot(day)}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 font-medium mt-1 transition-colors"
                          >
                            <Icon name="add" size={14} />
                            {tSchedule("addSlot")}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {fieldError("availability") && (
                  <p className="text-xs text-red-600 mt-1">{fieldError("availability")}</p>
                )}
              </div>

              {scheduleError && <p className="text-xs text-red-500 mt-3">{scheduleError}</p>}
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 mt-4"
              >
                {savingSchedule ? t("savingSchedule") : tSchedule("saveSchedule")}
              </button>
              <p className="text-xs text-gray-400 mt-3">{t("scheduleMoreHint")}</p>
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-3 mt-4">
          {tab !== TABS[0].id && (
            <button
              onClick={() => setTab(TABS[TABS.findIndex((tb) => tb.id === tab) - 1].id)}
              className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:border-gray-300 transition-colors text-sm"
            >
              {t("back")}
            </button>
          )}
          {tab !== TABS[TABS.length - 1].id && (
            <button
              onClick={() => setTab(TABS[TABS.findIndex((tb) => tb.id === tab) + 1].id)}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm"
            >
              {t("forward")}
            </button>
          )}
        </div>

        {/* Submit errors */}
        {Object.keys(submitError).length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-red-700 mb-1">{t("fixErrorsTitle")}</p>
            <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
              {Object.entries(submitError).map(([k, v]) => (
                <li key={k}>{FIELD_ERROR_MESSAGES[k] ?? v}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={() => {
            if (!allDone) {
              setEarlySubmitHint(true)
              setTimeout(() => setEarlySubmitHint(false), 4000)
            } else {
              handleSubmit()
            }
          }}
          disabled={submitting}
          className={`w-full py-4 rounded-xl font-semibold transition-colors text-sm text-white ${
            allDone
              ? "bg-gray-900 hover:bg-gray-800"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {submitting ? t("submitting") : t("submit")}
        </button>
        {earlySubmitHint && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">{t("earlySubmitTitle")}</p>
            <ul className="text-xs text-amber-600 space-y-0.5 list-disc list-inside">
              {!tabDone.about && <li>{t("aboutMissing")}</li>}
              {!tabDone.education && <li>{t("educationMissing")}</li>}
              {!tabDone.expertise && <li>{t("expertiseMissing")}</li>}
              {!tabDone.services && <li>{t("servicesMissing")}</li>}
              {!tabDone.schedule && <li>{t("scheduleMissing")}</li>}
            </ul>
          </div>
        )}


        <p className="text-center text-xs text-gray-300 mt-4">
          {t("footerNote")}
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

// Same order apps.mentors.models.MentorProfile.submission_errors() builds
// its dict in — used to pick which field to scroll to when several are
// wrong at once (the tab-level grouping in tabForError below still only
// shows one tab, so this picks a sensible "first" within it too).
const FIELD_ERROR_PRIORITY = [
  "full_name", "major", "grant_or_scholarship", "school_or_university",
  "gpa", "exam_results", "detailed_bio", "phone", "expertise_areas",
  "countries", "languages", "profile_photo", "diploma_document",
  "enrollment_document", "services", "availability", "email", "telegram",
]

// Map backend error keys to tabs.
function tabForError(errors: Record<string, string>): Tab | null {
  if (errors.profile_photo || errors.full_name || errors.detailed_bio || errors.phone || errors.languages) return "about"
  if (
    errors.countries || errors.school_or_university || errors.major
    || errors.grant_or_scholarship || errors.gpa || errors.exam_results
  ) return "education"
  if (errors.expertise_areas || errors.diploma_document || errors.enrollment_document) return "expertise"
  if (errors.services) return "services"
  if (errors.availability) return "schedule"
  return null
}
