"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  fetchMentorProfile, updateMentorProfile,
  fetchStudentProfile, updateStudentProfile,
  fetchMe,
  telegramLinkStart, telegramLinkFinalize, telegramUnlink,
  googleLink, googleUnlink,
  setEmail, changeEmail, unlinkEmail,
  setPassword,
  CooldownError,
} from "@/lib/api"
import { User } from "@/types"
import { SUPPORT_EMAIL } from "@/lib/contacts"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"

interface ToggleProps {
  label: string
  description: string
  icon: string
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
}

function Toggle({ label, description, icon, checked, onChange, disabled }: ToggleProps) {
  return (
    <div className="flex items-start gap-4 py-4">
      <Icon name={icon} size={22} className={checked ? "text-indigo-600 mt-0.5" : "text-gray-400 mt-0.5"} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        aria-pressed={checked}
        className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? "bg-indigo-600" : "bg-gray-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block w-5 h-5 rounded-full bg-white shadow transform-gpu transition-transform duration-200 mt-0.5 ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Account info
  const [me, setMe] = useState<User | null>(null)

  // Mentor settings
  const [isPublic, setIsPublic] = useState(true)
  const [isAcceptingBookings, setIsAcceptingBookings] = useState(true)
  const [isBanned, setIsBanned] = useState(false)

  // Student settings
  const [studentIsPublic, setStudentIsPublic] = useState(true)

  // Linking UI
  const [linkingAction, setLinkingAction] = useState("")
  const [emailInput, setEmailInput] = useState("")
  const [passwordInput, setPasswordInput] = useState("")
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  // Seconds remaining on a verification-email cooldown. Drives both
  // the inline message and the disabled state of the Save button.
  const [emailCooldown, setEmailCooldown] = useState(0)

  useEffect(() => {
    if (emailCooldown <= 0) return
    const timer = setTimeout(() => setEmailCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [emailCooldown])

  const loadMe = async () => {
    const token = localStorage.getItem("access_token")
    if (!token) return
    try {
      const user = await fetchMe(token)
      setMe(user)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const r = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    setRole(r)

    loadMe()

    if (r === "mentor") {
      fetchMentorProfile()
        .then((p) => {
          setIsPublic(p.is_public)
          setIsAcceptingBookings(p.is_accepting_bookings)
          setIsBanned(p.is_banned ?? false)
        })
        .catch(() => setError("Не удалось загрузить настройки"))
        .finally(() => setLoading(false))
    } else if (r === "student") {
      fetchStudentProfile()
        .then((p) => {
          setStudentIsPublic(p.is_public ?? true)
        })
        .catch(() => setError("Не удалось загрузить настройки"))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [router])

  // Check for Telegram link callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tgToken = params.get("tg_link_token")
    if (tgToken) {
      setLinkingAction("telegram")
      telegramLinkFinalize(tgToken)
        .then(() => {
          setSuccess("Telegram привязан!")
          loadMe()
          // Clean URL
          window.history.replaceState({}, "", "/settings")
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Не удалось привязать Telegram"))
        .finally(() => setLinkingAction(""))
    }
  }, [])

  const handleSaveMentor = async (field: string, value: boolean) => {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const updated = await updateMentorProfile({ [field]: value })
      setIsPublic(updated.is_public)
      setIsAcceptingBookings(updated.is_accepting_bookings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить")
      if (field === "is_public") setIsPublic(!value)
      if (field === "is_accepting_bookings") setIsAcceptingBookings(!value)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStudent = async (value: boolean) => {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      await updateStudentProfile({ is_public: value })
      setStudentIsPublic(value)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить")
      setStudentIsPublic(!value)
    } finally {
      setSaving(false)
    }
  }

  const handleTelegramLink = async () => {
    setLinkingAction("telegram")
    setError("")
    try {
      const data = await telegramLinkStart()
      // Save return URL so we come back to settings
      localStorage.setItem("tg_link_return", "/settings")
      window.location.href = data.bot_url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось начать привязку")
      setLinkingAction("")
    }
  }

  const handleTelegramUnlink = async () => {
    if (!confirm("Отвязать Telegram?")) return
    setLinkingAction("telegram")
    setError("")
    try {
      await telegramUnlink()
      setSuccess("Telegram отвязан")
      await loadMe()
      setTimeout(() => setSuccess(""), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось отвязать")
    } finally {
      setLinkingAction("")
    }
  }

  const handleGoogleLink = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) { setError("Google не настроен"); return }
    setLinkingAction("google")
    setError("")
    // @ts-expect-error — Google SDK
    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          await googleLink(response.credential)
          setSuccess("Google привязан!")
          await loadMe()
          setTimeout(() => setSuccess(""), 2000)
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Не удалось привязать Google")
        } finally {
          setLinkingAction("")
        }
      },
    })
    // @ts-expect-error — Google SDK
    window.google?.accounts.id.prompt()
  }

  const handleGoogleUnlink = async () => {
    if (!confirm("Отвязать Google?")) return
    setLinkingAction("google")
    setError("")
    try {
      await googleUnlink()
      setSuccess("Google отвязан")
      await loadMe()
      setTimeout(() => setSuccess(""), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось отвязать")
    } finally {
      setLinkingAction("")
    }
  }

  const handleEmailSet = async () => {
    if (!emailInput.trim()) return
    setLinkingAction("email")
    setError("")
    try {
      if (me?.email) {
        await changeEmail(emailInput.trim())
        setSuccess("Ссылка для подтверждения отправлена на новый email")
      } else {
        await setEmail(emailInput.trim())
        setSuccess("Ссылка для подтверждения отправлена")
      }
      await loadMe()
      setShowEmailForm(false)
      setEmailInput("")
      setTimeout(() => setSuccess(""), 3000)
    } catch (e: unknown) {
      if (e instanceof CooldownError) {
        // Start countdown so the Save button becomes available again.
        setEmailCooldown(e.retryAfter)
        setError(e.message)
      } else {
        setError(e instanceof Error ? e.message : "Не удалось установить email")
      }
    } finally {
      setLinkingAction("")
    }
  }

  const handleEmailUnlink = async () => {
    if (!confirm("Отвязать email? Вы потеряете вход по паролю.")) return
    setLinkingAction("email")
    setError("")
    try {
      await unlinkEmail()
      setSuccess("Email отвязан")
      await loadMe()
      setTimeout(() => setSuccess(""), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось отвязать email")
    } finally {
      setLinkingAction("")
    }
  }

  const handlePasswordSet = async () => {
    if (!passwordInput || passwordInput.length < 12) {
      setError("Пароль должен быть не менее 12 символов")
      return
    }
    setLinkingAction("password")
    setError("")
    try {
      await setPassword(passwordInput)
      setSuccess("Пароль установлен")
      setShowPasswordForm(false)
      setPasswordInput("")
      setTimeout(() => setSuccess(""), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось установить пароль")
    } finally {
      setLinkingAction("")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isMentor = role === "mentor"

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-4 transition-colors group [-webkit-tap-highlight-color:transparent]" />
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Настройки</h1>
        <p className="text-sm text-gray-500 mb-8">Управляй аккаунтом и видимостью</p>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-6 flex items-center gap-2">
            <Icon name="error" size={16} className="text-red-500" />
            {error}
            <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600"><Icon name="close" size={14} /></button>
          </div>
        )}

        {(saved || success) && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700 mb-6 flex items-center gap-2">
            <Icon name="check_circle" size={16} className="text-emerald-600" filled />
            {success || "Сохранено"}
          </div>
        )}

        {/* ── Connected accounts ──────────────────────────── */}
        {me && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-5">Привязанные аккаунты</h2>

            <div className="space-y-4">
              {/* Telegram */}
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${me.has_telegram ? "bg-sky-50" : "bg-gray-100"}`}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill={me.has_telegram ? "#2AABEE" : "#9CA3AF"}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Telegram</p>
                  <p className="text-xs text-gray-400">
                    {me.has_telegram
                      ? me.telegram_username ? `@${me.telegram_username}` : "Привязан"
                      : "Не привязан"}
                    {isMentor && !me.has_telegram && (
                      <span className="text-red-500 ml-1">· Обязательно для менторов</span>
                    )}
                  </p>
                </div>
                {me.has_telegram ? (
                  <button
                    onClick={handleTelegramUnlink}
                    disabled={linkingAction === "telegram"}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium disabled:opacity-50"
                  >
                    Отвязать
                  </button>
                ) : (
                  <button
                    onClick={handleTelegramLink}
                    disabled={linkingAction === "telegram"}
                    className="text-xs text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {linkingAction === "telegram" ? "..." : "Привязать"}
                  </button>
                )}
              </div>

              {/* Google */}
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${me.has_google ? "bg-blue-50" : "bg-gray-100"}`}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill={me.has_google ? "#4285F4" : "#9CA3AF"}/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill={me.has_google ? "#34A853" : "#9CA3AF"}/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill={me.has_google ? "#FBBC05" : "#9CA3AF"}/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill={me.has_google ? "#EA4335" : "#9CA3AF"}/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Google</p>
                  <p className="text-xs text-gray-400">
                    {me.has_google
                      ? me.google_email_at_signup || "Привязан"
                      : "Не привязан"}
                  </p>
                </div>
                {me.has_google ? (
                  <button
                    onClick={handleGoogleUnlink}
                    disabled={linkingAction === "google"}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium disabled:opacity-50"
                  >
                    Отвязать
                  </button>
                ) : (
                  <button
                    onClick={handleGoogleLink}
                    disabled={linkingAction === "google"}
                    className="text-xs text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {linkingAction === "google" ? "..." : "Привязать"}
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${me.email && me.email_verified ? "bg-emerald-50" : me.email ? "bg-amber-50" : "bg-gray-100"}`}>
                  <Icon
                    name={me.email && me.email_verified ? "mark_email_read" : "mail"}
                    size={20}
                    className={me.email && me.email_verified ? "text-emerald-600" : me.email ? "text-amber-600" : "text-gray-400"}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-xs text-gray-400">
                    {me.email ? (
                      <>
                        {me.email}
                        {me.email_verified ? (
                          <span className="text-emerald-600 ml-1">· Подтверждён</span>
                        ) : (
                          <span className="text-amber-600 ml-1">· Ожидает подтверждения</span>
                        )}
                      </>
                    ) : (
                      <>
                        Не установлен
                        {isMentor && <span className="text-red-500 ml-1">· Обязательно для менторов</span>}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {me.email && !isMentor && (
                    <button
                      onClick={handleEmailUnlink}
                      disabled={linkingAction === "email"}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium disabled:opacity-50"
                    >
                      Отвязать
                    </button>
                  )}
                  <button
                    onClick={() => { setShowEmailForm(!showEmailForm); setEmailInput("") }}
                    className="text-xs text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    {me.email ? "Изменить" : "Добавить"}
                  </button>
                </div>
              </div>

              {/* Email form */}
              {showEmailForm && (
                <div className="ml-14 flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={me.email || "email@example.com"}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <button
                    onClick={handleEmailSet}
                    disabled={linkingAction === "email" || emailCooldown > 0}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {linkingAction === "email"
                      ? "..."
                      : emailCooldown > 0
                        ? `Подождите ${emailCooldown}с`
                        : "Сохранить"}
                  </button>
                </div>
              )}

              {/* Password */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon name="lock" size={20} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Пароль</p>
                  <p className="text-xs text-gray-400">
                    {me.email ? "Установить или изменить пароль" : "Сначала добавьте email"}
                  </p>
                </div>
                {me.email && (
                  <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="text-xs text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    Установить
                  </button>
                )}
              </div>

              {showPasswordForm && (
                <div className="ml-14 flex gap-2">
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Минимум 12 символов"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <button
                    onClick={handlePasswordSet}
                    disabled={linkingAction === "password"}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {linkingAction === "password" ? "..." : "Сохранить"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Visibility settings ─────────────────────────── */}
        {role === "mentor" && (
          <>
            {isBanned && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
                <Icon name="block" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">Аккаунт заблокирован</p>
                  <p className="text-xs text-red-500 mt-1">Настройки недоступны. Обратитесь в поддержку: {SUPPORT_EMAIL}</p>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 divide-y divide-gray-50">
              <Toggle
                label="Видимость профиля"
                description="Когда включено, абитуриенты видят тебя в каталоге менторов и могут зайти на твою страницу."
                icon="visibility"
                checked={isPublic}
                onChange={(val) => {
                  setIsPublic(val)
                  handleSaveMentor("is_public", val)
                }}
                disabled={saving || isBanned}
              />
              <Toggle
                label="Приём заявок"
                description="Когда включено, абитуриенты могут отправлять запросы на консультацию и заказывать услуги."
                icon="event_available"
                checked={isAcceptingBookings}
                onChange={(val) => {
                  setIsAcceptingBookings(val)
                  handleSaveMentor("is_accepting_bookings", val)
                }}
                disabled={saving || isBanned}
              />
            </div>
          </>
        )}

        {role === "student" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <Toggle
              label="Видимость профиля"
              description="Когда включено, менторы видят твоё имя и учебное заведение в информации о заказе."
              icon="visibility"
              checked={studentIsPublic}
              onChange={(val) => {
                setStudentIsPublic(val)
                handleSaveStudent(val)
              }}
              disabled={saving}
            />
          </div>
        )}
      </div>
    </div>
  )
}
