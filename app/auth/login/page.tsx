"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { login, fetchMe, resendVerification, googleAuth, telegramStart } from "@/lib/api"
import { promptGoogleCredential } from "@/lib/googleSignIn"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import Icon from "@/components/Icon"
import Logo from "@/components/Logo"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  // Google Sign-In SDK is blocked inside Telegram's WebView (Google
  // refuses to render its prompt in embedded browsers); hide the button
  // so users don't tap a dead control. They can still sign in / link
  // Google later from a regular browser tab.
  const { isInTelegram } = useTelegramWebApp()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setNeedsVerification(false)
    setResent(false)
    setLoading(true)
    try {
      const data = await login(email, password)
      localStorage.setItem("access_token", data.access)
      localStorage.setItem("refresh_token", data.refresh)
      const me = await fetchMe(data.access)
      localStorage.setItem("role", me.role)
      const next = searchParams.get("next")
      if (next) {
        router.push(next)
      } else if (me.role === "mentor") {
        router.push("/mentor/dashboard")
      } else {
        router.push("/student/dashboard")
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Неверный email или пароль"
      if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("не подтверж")) {
        setNeedsVerification(true)
      } else {
        setError("Неверный email или пароль")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) { setError("Google авторизация не настроена"); return }
    setLoading(true)
    setError("")
    try {
      const credential = await promptGoogleCredential(clientId)
      const data = await googleAuth(credential)
      localStorage.setItem("access_token", data.access)
      localStorage.setItem("refresh_token", data.refresh)
      const me = await fetchMe(data.access)
      localStorage.setItem("role", me.role)
      if (me.role === "mentor") router.push("/mentor/dashboard")
      else router.push("/student/dashboard")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка входа через Google")
    } finally {
      setLoading(false)
    }
  }

  const handleTelegramLogin = async () => {
    setLoading(true)
    setError("")
    try {
      // For login, we don't know the role yet — use "student" as default
      // The backend will match to existing account anyway
      const data = await telegramStart("student")
      // Save the token for the callback
      localStorage.setItem("tg_signup_token", data.token)
      window.location.href = data.bot_url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка входа через Telegram")
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await resendVerification(email)
      setResent(true)
    } catch {
      // resend endpoint always returns 200 — ignore
      setResent(true)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <Logo size={32} className="text-gray-900" />
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-2">Добро пожаловать</h1>
          <p className="text-gray-500 text-sm">Войдите в свой аккаунт</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {needsVerification && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-4">
                <div className="flex items-start gap-3">
                  <Icon name="mark_email_unread" size={22} className="text-yellow-700" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-yellow-800 mb-1">Email не подтверждён</p>
                    <p className="text-xs text-yellow-700 leading-relaxed mb-3">
                      Проверь почту — мы отправили ссылку для подтверждения.
                    </p>
                    {resent ? (
                      <p className="text-xs text-green-700 font-medium">Письмо отправлено повторно ✓</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold disabled:opacity-50 transition-colors"
                      >
                        {resending ? "Отправка..." : "Отправить ссылку повторно"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? "Входим..." : "Войти"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-xs text-gray-400">или</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          {/* Google — hidden in Telegram WebView (SDK blocked there). */}
          {!isInTelegram && (
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Войти через Google
            </button>
          )}

          {/* Telegram */}
          <button
            type="button"
            onClick={handleTelegramLogin}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mt-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#2AABEE">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            Войти через Telegram
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Нет аккаунта?{" "}
          <Link href="/auth/register" className="text-indigo-600 font-medium hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
