"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  changeEmail as changeEmailApi,
  fetchMe,
  googleLink,
  resendVerification,
  setEmail as setEmailApi,
  telegramLinkFinalize,
  telegramLinkStart,
} from "@/lib/api"
import { promptGoogleCredential } from "@/lib/googleSignIn"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import { User } from "@/types"
import Icon from "@/components/Icon"
import Logo from "@/components/Logo"

// Identity gate for new mentors. The backend rejects MentorProfile
// submission unless the user has both a verified email AND a linked
// Telegram (apps/mentors/views.py:103-106). Surface that requirement
// up front so the user doesn't burn their first onboarding session
// filling in profile fields only to be told "we also need X".

export default function MentorIdentityPage() {
  const router = useRouter()
  // Google SDK is blocked inside Telegram WebView, so the button just
  // dead-ends. Hide it there and keep only the manual-email path.
  const { isInTelegram } = useTelegramWebApp()
  const [me, setMe] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Email state
  const [emailInput, setEmailInput] = useState("")
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [emailJustSent, setEmailJustSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [changingEmail, setChangingEmail] = useState(false)

  // Google link state
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  const [googleError, setGoogleError] = useState("")

  // Telegram state
  const [linkingTelegram, setLinkingTelegram] = useState(false)
  const [telegramError, setTelegramError] = useState("")

  const reload = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : ""
    if (!token) {
      router.replace("/auth/login")
      return null
    }
    try {
      const fresh = await fetchMe(token)
      setMe(fresh)
      return fresh
    } catch {
      router.replace("/auth/login")
      return null
    }
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // Handle return from Telegram link flow first — `?tg_link_token=`
      // gets dropped onto this URL by the bot redirect, mirroring how
      // settings page handles it (app/settings/page.tsx:122-138).
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        const tgToken = params.get("tg_link_token")
        if (tgToken) {
          try {
            await telegramLinkFinalize(tgToken)
          } catch (e) {
            setTelegramError(e instanceof Error ? e.message : "Не удалось привязать Telegram")
          }
          // Strip the token from the URL so a refresh doesn't re-fire.
          window.history.replaceState({}, "", "/onboarding/mentor/identity")
        }
      }

      const fresh = await reload()
      if (cancelled) return
      // Wrong role lands here? Send them to their dashboard.
      if (fresh && fresh.role !== "mentor") {
        router.replace(fresh.role === "student" ? "/student/dashboard" : "/")
        return
      }
      // Already complete? Skip ahead silently.
      if (fresh && fresh.email && fresh.email_verified && fresh.has_telegram) {
        router.replace("/onboarding/mentor")
        return
      }
      setLoading(false)
    }

    init()
    return () => { cancelled = true }
    // router is stable; deliberately empty so this runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEmail(true)
    setEmailError("")
    try {
      await setEmailApi(emailInput.trim())
      setEmailJustSent(true)
      await reload()
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : "Не удалось сохранить email")
    } finally {
      setSavingEmail(false)
    }
  }

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEmail(true)
    setEmailError("")
    try {
      await changeEmailApi(emailInput.trim())
      setChangingEmail(false)
      setEmailJustSent(true)
      await reload()
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : "Не удалось изменить email")
    } finally {
      setSavingEmail(false)
    }
  }

  const handleResend = async () => {
    if (!me?.email) return
    setResending(true)
    setEmailError("")
    try {
      await resendVerification(me.email)
      setEmailJustSent(true)
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : "Не удалось отправить письмо")
    } finally {
      setResending(false)
    }
  }

  const handleLinkGoogle = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      setGoogleError("Google не настроен")
      return
    }
    setLinkingGoogle(true)
    setGoogleError("")
    try {
      const credential = await promptGoogleCredential(clientId)
      await googleLink(credential)
      // Backend auto-verifies email when it matches the Google address
      // (or auto-sets email to the Google one for users without an
      // email). reload() pulls the fresh state.
      await reload()
    } catch (e) {
      setGoogleError(e instanceof Error ? e.message : "Не удалось привязать Google")
    } finally {
      setLinkingGoogle(false)
    }
  }

  const handleLinkTelegram = async () => {
    setLinkingTelegram(true)
    setTelegramError("")
    try {
      const data = await telegramLinkStart()
      // Stash the return path so the bot callback brings us back here.
      localStorage.setItem("tg_link_return", "/onboarding/mentor/identity")
      window.location.href = data.bot_url
    } catch (e) {
      setTelegramError(e instanceof Error ? e.message : "Не удалось начать привязку Telegram")
      setLinkingTelegram(false)
    }
  }

  if (loading || me === null) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  const emailReady = Boolean(me.email && me.email_verified)
  const telegramReady = Boolean(me.has_telegram)
  const bothReady = emailReady && telegramReady

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 justify-center mb-2">
            <Logo size={32} className="text-gray-900" />
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-4 mb-1">
            Подтверди свои контакты
          </h1>
          <p className="text-gray-500 text-sm">
            Менторам нужны email и Telegram — это требование платформы для связи с абитуриентами.
          </p>
        </div>

        {/* Email card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <div className="flex items-start gap-3 mb-3">
            <Icon
              name={emailReady ? "check_circle" : "mail"}
              size={22}
              filled={emailReady}
              className={emailReady ? "text-emerald-600" : "text-gray-400"}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Email</p>
              {emailReady ? (
                <p className="text-xs text-emerald-700 mt-0.5 break-all">
                  Подтверждён: {me.email}
                </p>
              ) : me.email ? (
                <p className="text-xs text-gray-500 mt-0.5 break-all">
                  Письмо отправлено на {me.email}. Перейди по ссылке из письма, потом обнови эту страницу.
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5">
                  Ещё не задан. Введи email — мы отправим письмо для подтверждения.
                </p>
              )}
            </div>
          </div>

          {/* Has email, not verified, user wants to change it → show change form */}
          {me.email && !me.email_verified && changingEmail && (
            <form onSubmit={handleChangeEmail} className="flex flex-col gap-3 mt-4">
              <input
                type="email"
                placeholder="you@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"
              />
              {emailError && (
                <p className="text-xs text-red-500">{emailError}</p>
              )}
              <button
                type="submit"
                disabled={savingEmail || !emailInput.trim()}
                className="bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm"
              >
                {savingEmail ? "Сохраняем..." : "Сохранить и отправить письмо"}
              </button>
              <button
                type="button"
                onClick={() => { setChangingEmail(false); setEmailError("") }}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Отмена
              </button>
            </form>
          )}

          {/* No email at all → Google one-click OR manual email form */}
          {!me.email && (
            <div className="flex flex-col gap-3 mt-4">
              {!isInTelegram && (
                <>
                  {/* Google is the fast path — auto-verifies email in one
                      click; user falls back to manual entry only if they
                      don't want Google. Hidden in TG (SDK blocked there). */}
                  <button
                    type="button"
                    onClick={handleLinkGoogle}
                    disabled={linkingGoogle}
                    className="flex items-center justify-center gap-2.5 bg-white border border-gray-200 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                      <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.63z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 009 18z" fill="#34A853"/>
                      <path d="M3.97 10.71A5.4 5.4 0 013.68 9c0-.6.1-1.18.29-1.71V4.96H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.04l3.01-2.33z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 00.96 4.96l3.01 2.34C4.68 5.18 6.66 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    {linkingGoogle ? "Открываем Google..." : "Войти через Google"}
                  </button>
                  {googleError && (
                    <p className="text-xs text-red-500">{googleError}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex-1 h-px bg-gray-100" />
                    <span>или email вручную</span>
                    <span className="flex-1 h-px bg-gray-100" />
                  </div>
                </>
              )}

              <form onSubmit={handleSaveEmail} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"
                />
                {emailError && (
                  <p className="text-xs text-red-500">{emailError}</p>
                )}
                <button
                  type="submit"
                  disabled={savingEmail || !emailInput.trim()}
                  className="bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm"
                >
                  {savingEmail ? "Сохраняем..." : "Сохранить и отправить письмо"}
                </button>
              </form>
            </div>
          )}

          {/* Has email, not verified → resend + check (+ Google shortcut) */}
          {me.email && !me.email_verified && !changingEmail && (
            <div className="flex flex-col gap-2 mt-4">
              {emailJustSent && (
                <p className="text-xs text-emerald-600">Письмо отправлено повторно ✓</p>
              )}
              {emailError && (
                <p className="text-xs text-red-500">{emailError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => reload()}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Я подтвердил, обновить
                </button>
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="flex-1 text-indigo-600 hover:text-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  {resending ? "Отправляем..." : "Отправить ещё раз"}
                </button>
              </div>
              {/* Google fast-track: if their Google email matches the one
                  they typed, the link flow auto-marks it as verified —
                  saves the trip to inbox. Hidden in TG (SDK blocked). */}
              {!me.has_google && !isInTelegram && (
                <button
                  type="button"
                  onClick={handleLinkGoogle}
                  disabled={linkingGoogle}
                  className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
                    <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.63z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 009 18z" fill="#34A853"/>
                    <path d="M3.97 10.71A5.4 5.4 0 013.68 9c0-.6.1-1.18.29-1.71V4.96H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.04l3.01-2.33z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 00.96 4.96l3.01 2.34C4.68 5.18 6.66 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  {linkingGoogle
                    ? "Открываем Google..."
                    : "Или подтвердить через Google"}
                </button>
              )}
              {googleError && (
                <p className="text-xs text-red-500">{googleError}</p>
              )}
              <button
                type="button"
                onClick={() => { setChangingEmail(true); setEmailInput(""); setEmailError("") }}
                className="text-gray-500 hover:text-gray-700 text-sm mt-1"
              >
                Указать другой email
              </button>
            </div>
          )}
        </div>

        {/* Telegram card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <Icon
              name={telegramReady ? "check_circle" : "send"}
              size={22}
              filled={telegramReady}
              className={telegramReady ? "text-emerald-600" : "text-gray-400"}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Telegram</p>
              {telegramReady ? (
                <p className="text-xs text-emerald-700 mt-0.5">
                  Привязан{me.telegram_username ? `: @${me.telegram_username}` : ""}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5">
                  Не привязан. Откроется бот — подтверди в нём, потом вернёшься сюда.
                </p>
              )}
            </div>
          </div>

          {!telegramReady && (
            <div className="flex flex-col gap-2 mt-4">
              {telegramError && (
                <p className="text-xs text-red-500">{telegramError}</p>
              )}
              <button
                onClick={handleLinkTelegram}
                disabled={linkingTelegram}
                className="bg-[#2AABEE] hover:bg-[#229ED9] text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm"
              >
                {linkingTelegram ? "Открываем бот..." : "Привязать Telegram"}
              </button>
            </div>
          )}
        </div>

        {/* Continue button */}
        <button
          onClick={() => router.push("/onboarding/mentor")}
          disabled={!bothReady}
          className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {bothReady ? "Продолжить →" : "Сначала привяжи и email, и Telegram"}
        </button>
      </div>
    </div>
  )
}
