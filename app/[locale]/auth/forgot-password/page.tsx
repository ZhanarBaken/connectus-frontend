"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { requestPasswordReset, CooldownError, formatCooldownShort } from "@/lib/api"
import Logo from "@/components/Logo"

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth.ForgotPassword")
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const role = localStorage.getItem("role")
    if (!token) return
    if (role === "mentor") router.replace("/mentor/dashboard")
    else router.replace("/student/dashboard")
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError("")
    try {
      await requestPasswordReset(email.trim())
      setSubmitted(true)
    } catch (e: unknown) {
      if (e instanceof CooldownError) {
        setCooldown(e.retryAfter)
        setError(t("errorTooManyAttempts", { seconds: formatCooldownShort(e.retryAfter) }))
      } else {
        setError(e instanceof Error ? e.message : t("errorGeneric"))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <Logo size={32} className="text-gray-900" />
            <span className="text-xl font-bold text-gray-900">Connectus</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {submitted ? (
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-2">{t("checkEmailTitle")}</h1>
              {/* Generic copy — we don't reveal whether the email is in
                  the DB. If a Google-only / TG-only user types their
                  address, the backend silently skips and the same UX
                  applies (no email arrives but no leak either). */}
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {t("checkEmailBody")}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {t("checkSpam")}
              </p>
              <Link
                href="/auth/login"
                className="inline-block w-full text-center border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:border-gray-300 transition-colors text-sm"
              >
                {t("backToLogin")}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{t("title")}</h1>
              <p className="text-sm text-gray-500 mb-6">
                {t("subtitle")}
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("emailLabel")}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || cooldown > 0}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm"
                >
                  {loading ? t("submitting") : t("submit")}
                </button>
              </form>

              <p className="text-sm text-gray-500 mt-6 text-center">
                {t("rememberedPassword")}{" "}
                <Link href="/auth/login" className="text-indigo-600 font-medium hover:underline">
                  {t("loginLink")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
