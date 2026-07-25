"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { confirmPasswordReset } from "@/lib/api"
import Icon from "@/components/Icon"
import Logo from "@/components/Logo"

function ResetPasswordForm() {
  const t = useTranslations("Auth.ResetPassword")
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError(t("errorNoToken"))
      return
    }
    if (password.length < 12) {
      setError(t("errorTooShort"))
      return
    }
    setLoading(true)
    setError("")
    try {
      await confirmPasswordReset(token, password)
      setDone(true)
      // Tokens issued before the reset are revoked server-side; force
      // a fresh login with the new password instead of auto-logging in.
      setTimeout(() => router.replace("/auth/login"), 1500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errorGeneric"))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t("brokenLinkTitle")}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {t("brokenLinkBody")}
        </p>
        <Link
          href="/auth/forgot-password"
          className="inline-block w-full text-center bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm"
        >
          {t("requestNewLink")}
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <Icon name="check_circle" size={36} className="text-emerald-600" filled />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{t("doneTitle")}</h1>
        <p className="text-sm text-gray-500">{t("doneBody")}</p>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-1">{t("title")}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {t("subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("passwordLabel")}</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t("passwordPlaceholder")}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              tabIndex={-1}
            >
              <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || password.length < 12}
          className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={
            <div className="flex justify-center py-6">
              <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
