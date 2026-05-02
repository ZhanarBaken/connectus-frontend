"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { register, resendVerification, googleAuth, telegramStart, fetchMe } from "@/lib/api"
import { track } from "@/lib/analytics"
import Icon from "@/components/Icon"
import Logo from "@/components/Logo"

type Role = "student" | "mentor"

const ROLES = [
  {
    value: "student" as Role,
    icon: "school",
    title: "Я абитуриент или родитель",
    desc: "Ищу ментора для поступления за рубеж",
  },
  {
    value: "mentor" as Role,
    icon: "star",
    title: "Я ментор",
    desc: "Хочу помогать абитуриентам с поступлением",
  },
]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<Role>("student")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [resendError, setResendError] = useState("")
  // Refs (not state) so flipping the flag doesn't trigger a re-render.
  // We only need to fire the analytics event the very first time this
  // tab interacts with the form. Wired to every entry path (role
  // pick, email/password input, terms checkbox, OAuth/Telegram
  // buttons) so the funnel `signup_form_started → submitted` covers
  // all signup flows, not just the email/password one.
  const formStartedRef = useRef(false)

  const handleFirstInteraction = () => {
    if (formStartedRef.current) return
    formStartedRef.current = true
    track("signup_form_started", { role })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await register(email, password, role, agreedToTerms)
      // Save role so login can route correctly later (also returned by /auth/me)
      localStorage.setItem("pending_role", role)
      track("signup_form_submitted", { role })
      setRegistered(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при регистрации. Проверьте данные.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = () => {
    handleFirstInteraction()
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) { setError("Google авторизация не настроена"); return }

    // @ts-expect-error - Google SDK
    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        setLoading(true)
        setError("")
        try {
          const data = await googleAuth(response.credential, role)
          localStorage.setItem("access_token", data.access)
          localStorage.setItem("refresh_token", data.refresh)
          const me = await fetchMe(data.access)
          localStorage.setItem("role", me.role)
          if (me.role === "mentor") router.push("/onboarding/mentor")
          else router.push("/onboarding/student")
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Ошибка регистрации через Google")
        } finally {
          setLoading(false)
        }
      },
    })
    // @ts-expect-error - Google SDK
    window.google?.accounts.id.prompt()
  }

  const handleTelegramRegister = async () => {
    handleFirstInteraction()
    setLoading(true)
    setError("")
    try {
      const data = await telegramStart(role)
      localStorage.setItem("tg_signup_token", data.token)
      window.location.href = data.bot_url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка регистрации через Telegram")
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setResendError("")
    try {
      await resendVerification(email)
      setResent(true)
    } catch (e: unknown) {
      setResendError(e instanceof Error ? e.message : "Не удалось отправить письмо")
    } finally {
      setResending(false)
    }
  }

  // ─── Post-registration screen ──────────────────────────────────
  if (registered) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 justify-center">
              <Logo size={32} className="text-gray-900" />
              <span className="text-xl font-bold text-gray-900">Connectus</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Icon name="mark_email_unread" size={36} className="text-gray-900" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Проверь почту</h1>
            <p className="text-gray-500 text-sm mb-1">
              Мы отправили ссылку для подтверждения на
            </p>
            <p className="font-semibold text-gray-900 mb-6 break-all">{email}</p>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              Перейди по ссылке из письма, чтобы активировать аккаунт. После этого ты сможешь войти и заполнить профиль.
            </p>

            {resent ? (
              <p className="text-sm text-emerald-600 font-medium">Письмо отправлено повторно ✓</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 transition-colors"
              >
                {resending ? "Отправляем..." : "Отправить письмо повторно"}
              </button>
            )}
            {resendError && (
              <p className="text-xs text-red-500 mt-2">{resendError}</p>
            )}
          </div>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Письмо не приходит? Проверь папку «Спам».
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <Logo size={32} className="text-gray-900" />
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </Link>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step === s
                  ? "bg-gray-900 text-white"
                  : step > s
                    ? "bg-gray-200 text-gray-600"
                    : "bg-gray-100 text-gray-400"
              }`}>
                {step > s ? "✓" : s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? "bg-gray-300" : "bg-gray-100"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Step 1 — Role selection */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Кто ты?</h1>
              <p className="text-gray-500 text-sm mb-6">Выбери роль чтобы мы настроили аккаунт под тебя</p>

              <div className="flex flex-col gap-3 mb-8">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => {
                      handleFirstInteraction()
                      setRole(r.value)
                    }}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
                      role === r.value
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <Icon
                      name={r.icon}
                      size={32}
                      filled={role === r.value}
                      className={role === r.value ? "text-gray-900" : "text-gray-400"}
                    />
                    <div>
                      <div className={`font-semibold text-sm ${role === r.value ? "text-gray-900" : "text-gray-900"}`}>
                        {r.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
                    </div>
                    {role === r.value && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm"
              >
                Продолжить →
              </button>
            </div>
          )}

          {/* Step 2 — Email + password */}
          {step === 2 && (
            <div>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"
              >
                ← Назад
              </button>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Создай аккаунт</h1>
              <p className="text-gray-500 text-sm mb-6">
                Регистрируешься как{" "}
                <span className="font-medium text-indigo-600">
                  {role === "mentor" ? "ментор" : "абитуриент"}
                </span>
              </p>

              {/* Telegram — primary signup method */}
              <button
                type="button"
                onClick={handleTelegramRegister}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-[#2AABEE] hover:bg-[#229ED9] text-white rounded-xl py-3.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                Продолжить через Telegram
              </button>

              {/* Google — secondary */}
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Продолжить через Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="h-px bg-gray-200 flex-1" />
                <span className="text-xs text-gray-400">или с email</span>
                <div className="h-px bg-gray-200 flex-1" />
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      handleFirstInteraction()
                      setEmail(e.target.value)
                    }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Минимум 12 символов"
                      value={password}
                      onChange={(e) => {
                        handleFirstInteraction()
                        setPassword(e.target.value)
                      }}
                      className="w-full border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-1 [-webkit-tap-highlight-color:transparent]"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      handleFirstInteraction()
                      setAgreedToTerms(e.target.checked)
                    }}
                    className="mt-0.5 flex-shrink-0 accent-indigo-600"
                  />
                  <span className="text-sm text-gray-500 leading-relaxed">
                    Я принимаю{" "}
                    <span className="text-indigo-600 font-medium">условия использования</span>
                    {" "}и{" "}
                    <span className="text-indigo-600 font-medium">политику конфиденциальности</span>
                  </span>
                </label>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !agreedToTerms}
                  className="w-full border border-gray-300 text-gray-700 py-3.5 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? "Создаём аккаунт..." : "Создать аккаунт через email"}
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Уже есть аккаунт?{" "}
          <Link href="/auth/login" className="text-indigo-600 font-medium hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}
