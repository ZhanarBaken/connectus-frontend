"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  authFetch,
  clearAuth,
  CooldownError,
  EmailTakenError,
  fetchMe,
  fetchStudentProfile,
  setEmail,
  updateStudentProfile,
} from "@/lib/api"
import AvatarCropperModal from "@/components/AvatarCropperModal"
import Icon from "@/components/Icon"
import Logo from "@/components/Logo"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

// Native <select> renders its own grey arrow and uses a system font that
// looks heavier than the input next to it. We kill the native chrome
// (appearance-none), match input typography (text-gray-900), and paint
// the chevron ourselves so the field aligns visually with text inputs.
const selectClass = `${inputClass} appearance-none text-gray-900 pr-10 bg-no-repeat bg-[right_0.875rem_center] bg-[length:1rem_1rem] cursor-pointer bg-[url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%239ca3af' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 8 10 12 14 8'/%3E%3C/svg%3E")]`

type EmailStage = "loading" | "email" | "verify" | "form"

const VERIFY_POLL_INTERVAL_MS = 5000

export default function StudentOnboarding() {
  const router = useRouter()
  const [emailStage, setEmailStage] = useState<EmailStage>("loading")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [earlySubmitHint, setEarlySubmitHint] = useState(false)

  // Email stage
  const [email, setEmailValue] = useState("")
  const [verifyEmail, setVerifyEmail] = useState("")
  const [verifyChecking, setVerifyChecking] = useState(false)
  const [emailTaken, setEmailTaken] = useState(false)

  // Photo (optional, lives inside О себе tab)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // О себе
  const [fullName, setFullName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")

  // Учёба
  const [school, setSchool] = useState("")
  const [schoolGrade, setSchoolGrade] = useState("")
  const [city, setCity] = useState("")
  const [graduationYear, setGraduationYear] = useState("")
  const [desiredMajor, setDesiredMajor] = useState("")
  const [desiredCountries, setDesiredCountries] = useState("")
  const [examResults, setExamResults] = useState("")
  const [gpa, setGpa] = useState("")

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then(async (me) => {
        if (cancelled) return
        try {
          const profile = await fetchStudentProfile()
          if (!cancelled) setProfilePhoto(profile.profile_photo ?? null)
        } catch {
          // Non-fatal — onboarding continues with empty photo state.
        }
        if (cancelled) return
        if (me.email && me.email_verified) {
          setEmailStage("form")
        } else if (me.email) {
          setVerifyEmail(me.email)
          setEmailStage("verify")
        } else {
          setEmailStage("email")
        }
      })
      .catch(() => {
        if (cancelled) return
        // Clear the stale/invalid token before bouncing back — otherwise
        // the login page's token-presence check sends the user straight
        // back to a dashboard that fails the same way, forming an
        // infinite redirect loop instead of a clean re-login.
        clearAuth()
        router.replace("/auth/login")
      })
    return () => { cancelled = true }
  }, [router])

  useEffect(() => {
    if (emailStage !== "verify") return
    const tick = async () => {
      const me = await fetchMe().catch(() => null)
      if (me?.email_verified) setEmailStage("form")
    }
    pollTimer.current = setInterval(tick, VERIFY_POLL_INTERVAL_MS)
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [emailStage])

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
      if (!res.ok) throw new Error("Не удалось загрузить фото")
      const data = await res.json()
      setProfilePhoto(data.profile_photo ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при загрузке фото")
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSubmitEmail = async () => {
    setSaving(true)
    setError("")
    try {
      await setEmail(email.trim())
      setEmailTaken(false)
      setVerifyEmail(email.trim())
      setEmailStage("verify")
    } catch (e: unknown) {
      if (e instanceof EmailTakenError) {
        setEmailTaken(true)
        setError("")
      } else if (e instanceof CooldownError) {
        setError(e.message)
      } else {
        setError(e instanceof Error ? e.message : "Не удалось отправить письмо")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleManualVerifyCheck = async () => {
    setVerifyChecking(true)
    setError("")
    try {
      const me = await fetchMe()
      if (me.email_verified) {
        setEmailStage("form")
      } else {
        setError("Email пока не подтверждён. Проверь почту, в том числе папку «Спам».")
      }
    } catch {
      setError("Не удалось проверить статус. Попробуй ещё раз.")
    } finally {
      setVerifyChecking(false)
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    setError("")
    try {
      await updateStudentProfile({
        full_name: fullName,
        date_of_birth: dateOfBirth || null,
        current_school_or_university: school,
        school_grade: schoolGrade,
        city: city,
        school_graduation_year: graduationYear ? Number(graduationYear) : null,
        desired_major: desiredMajor,
        desired_countries: desiredCountries,
        exam_results: examResults,
        gpa: gpa,
      })
      router.push("/student/dashboard")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при сохранении")
      setSaving(false)
    }
  }

  const allDone = Boolean(
    fullName.trim() && dateOfBirth
    && schoolGrade && city.trim() && graduationYear
  )

  if (emailStage === "loading") {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-10">
      <div className="w-full max-w-lg mx-auto">

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 justify-center mb-1">
            <Logo size={28} className="text-gray-900" />
            <span className="text-lg font-bold text-gray-900">Connectus</span>
          </div>
          <p className="text-gray-400 text-xs">Расскажи о себе — это займёт минуту</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

          {/* ── EMAIL ── */}
          {emailStage === "email" && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Добавь email</h1>
              <p className="text-gray-400 text-sm mb-6">
                Нужен для подтверждения заказов и важных уведомлений. Без email нельзя оформить заказ.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmailValue(e.target.value); setEmailTaken(false) }}
                placeholder="you@example.com"
                className={inputClass}
              />
              {emailTaken && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800 leading-relaxed mt-3">
                  Эта почта уже зарегистрирована.{" "}
                  <a
                    href="/auth/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2"
                  >
                    Войди через сайт
                  </a>
                  {" "}и привяжи Telegram в Настройках.
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mt-4">{error}</div>
              )}
              <button
                onClick={handleSubmitEmail}
                disabled={saving || !email.trim()}
                className="w-full mt-6 bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
              >
                {saving ? "Отправляем..." : "Отправить письмо для подтверждения"}
              </button>
            </div>
          )}

          {/* ── VERIFY ── */}
          {emailStage === "verify" && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Проверь почту</h1>
              <p className="text-gray-400 text-sm mb-6">
                Мы отправили ссылку на <span className="text-gray-700 font-medium">{verifyEmail}</span>.
                Кликни на неё, и ты автоматически вернёшься сюда.
              </p>
              {error && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700 mb-4">{error}</div>
              )}
              <button
                onClick={handleManualVerifyCheck}
                disabled={verifyChecking}
                className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
              >
                {verifyChecking ? "Проверяем..." : "Я подтвердил email"}
              </button>
              <button
                onClick={() => { setEmailStage("email"); setError("") }}
                className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm"
              >
                Указать другой email
              </button>
            </div>
          )}

          {/* ── FORM (single scroll) ── */}
          {emailStage === "form" && (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-gray-900">О себе</h1>

              {/* Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Фото профиля</label>
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
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="relative w-20 h-20 rounded-full overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:opacity-50 flex-shrink-0"
                  >
                    {profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profilePhoto} alt="Фото профиля" className="w-full h-full object-cover" />
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
                    {profilePhoto ? "Нажми чтобы изменить" : "JPG, PNG или WEBP до 5 МБ"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Полное имя <span className="text-red-500">*</span>
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Айгерим Бекова"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Дата рождения <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Сейчас ты <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={schoolGrade}
                    onChange={(e) => setSchoolGrade(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Выбери...</option>
                    <optgroup label="В школе">
                      <option value="11 класс">11 класс</option>
                      <option value="12 класс">12 класс</option>
                      <option value="10 класс">10 класс</option>
                      <option value="9 класс">9 класс</option>
                      <option value="8 класс">8 класс</option>
                      <option value="7 класс">7 класс</option>
                      <option value="6 класс">6 класс</option>
                      <option value="5 класс">5 класс</option>
                    </optgroup>
                    <optgroup label="Другое">
                      <option value="Уже окончил(а) школу">Уже окончил(а) школу</option>
                      <option value="Студент вуза">Студент вуза</option>
                      <option value="Колледж / училище">Колледж / училище</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Год окончания <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    min={1990}
                    max={2050}
                    placeholder="2026"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Город <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Алматы"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Учебное заведение</label>
                <input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="НИШ Алматы, школа №1..."
                  className={inputClass}
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">По желанию</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Советуем заполнить — это облегчит работу ментора и поможет ему понять твой запрос ещё до консультации.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Желаемая специальность</label>
                    <input
                      type="text"
                      value={desiredMajor}
                      onChange={(e) => setDesiredMajor(e.target.value)}
                      placeholder="Computer Science, Business, Medicine..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Желаемые страны поступления</label>
                    <input
                      type="text"
                      value={desiredCountries}
                      onChange={(e) => setDesiredCountries(e.target.value)}
                      placeholder="США, Канада, Германия..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Результаты экзаменов</label>
                    <input
                      type="text"
                      value={examResults}
                      onChange={(e) => setExamResults(e.target.value)}
                      placeholder="SAT 1450, IELTS 7.5, IB 38, ЕНТ 130, AP..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Средний GPA</label>
                    <input
                      type="text"
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      placeholder="4.5 / 5.0  или  3.8 / 4.0"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Submit button — only in form stage, outside the card */}
        {emailStage === "form" && (
          <>
            <button
              onClick={() => {
                if (!allDone) {
                  setEarlySubmitHint(true)
                  setTimeout(() => setEarlySubmitHint(false), 4000)
                } else {
                  void handleFinish()
                }
              }}
              disabled={saving}
              className={`w-full mt-4 py-4 rounded-xl font-semibold transition-colors text-sm text-white ${
                allDone ? "bg-gray-900 hover:bg-gray-800" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {saving ? "Сохраняем..." : "Готово →"}
            </button>
            {earlySubmitHint && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Ещё не всё заполнено:</p>
                <ul className="text-xs text-amber-600 space-y-0.5 list-disc list-inside">
                  {!fullName.trim() && <li>Укажи полное имя</li>}
                  {!dateOfBirth && <li>Укажи дату рождения</li>}
                  {!schoolGrade && <li>Выбери статус учёбы</li>}
                  {!city.trim() && <li>Укажи город</li>}
                  {!graduationYear && <li>Укажи год окончания школы</li>}
                </ul>
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs text-gray-300 mt-4">
          Можно изменить позже в профиле
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
