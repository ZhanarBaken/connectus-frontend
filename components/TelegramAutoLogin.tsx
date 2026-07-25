"use client"

import { useEffect, useRef, useState } from "react"
// Deliberately using next/navigation's plain useRouter here, not
// next-intl's locale-aware one from @/i18n/navigation. Telegram's
// start_param deep link is constructed by the backend (separate repo)
// with no knowledge of the user's locale preference — resolving it into
// anything other than the default (ru) locale would require a backend
// change. Keeping every push() in this component on the plain router
// means it always lands in default-locale (unprefixed, under
// localePrefix: "as-needed") space by construction, not by a rule
// someone has to remember.
import { useRouter } from "next/navigation"
import { telegramMiniAppLogin, fetchMe } from "@/lib/api"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import DataConsentModal from "@/components/DataConsentModal"
import type { Role } from "@/types"


// Telegram exposes whatever string the bot put after `?startapp=` in
// `initDataUnsafe.start_param`. We use it as a tiny routing key —
// e.g. server-side notification builds `order_<id>` so a tap on the
// TG message lands on the right order screen post-login. Returning
// null when the value isn't recognised keeps the auto-login flow
// from accidentally redirecting to an attacker-shaped path.
function resolveStartParamTarget(raw: string | null | undefined): string | null {
  if (!raw) return null
  const orderMatch = /^order_(\d+)$/.exec(raw)
  if (orderMatch) {
    // ?chat=open tells the order page to open the chat overlay
    // straight away on mount (the param is read inside that page).
    return `/orders/${orderMatch[1]}?chat=open`
  }
  return null
}

// Parse start_param directly from the URL hash before the WebApp SDK
// finishes loading. Lets us decide synchronously (during initial render)
// whether this Mini App visit is a deep-link that requires auto-auth.
function readStartTargetFromHash(): string | null {
  if (typeof window === "undefined") return null
  const hash = window.location.hash.replace(/^#/, "")
  if (!hash) return null
  try {
    const tgData = new URLSearchParams(hash).get("tgWebAppData")
    if (!tgData) return null
    return resolveStartParamTarget(
      new URLSearchParams(tgData).get("start_param"),
    )
  } catch {
    return null
  }
}

// Triggers the Mini App login flow from anywhere on the page. The auth
// buttons in <Header> dispatch this when the user is inside Telegram.
export const TG_AUTH_EVENT = "tg-auth-required"

// What stage of Mini App auto-login we're at. Drives whether we render
// a covering overlay (loading or role picker) or step out of the way.
//   - "idle":      not in a Mini App context, or in one but waiting for
//                  the user to explicitly trigger auth. Render nothing —
//                  the regular site UI shows through.
//   - "checking":  in a Mini App, hitting the backend right now. Cover
//                  the page so the user doesn't see the public
//                  homepage flash before being redirected/picker-prompted.
//   - "needsRole": new user — show role picker.
//   - "done":      logged in (or skipping login because token cached).
//                  Render nothing.
type AuthStage = "idle" | "checking" | "needsRole" | "done"

// Mounts globally inside <RootLayout>. Outside Telegram it is a no-op.
// Inside a Mini App without a cached token, it stays idle (lets the
// user browse the public site) and only fires the login flow when:
//   1. `start_param` deep-links to an auth-required destination, OR
//   2. the user taps a "Войти" / "Регистрация" button which dispatches
//      the `tg-auth-required` event from <Header>.
// On success — saves tokens and routes by role. On `role_required`
// (first-ever Mini App visit) — surfaces a role picker so the new user
// can pick student/mentor without ever seeing the email/password form.
export default function TelegramAutoLogin() {
  const router = useRouter()
  const { isInTelegram, initData } = useTelegramWebApp()

  // Initial stage: synchronously detect Mini App context via URL hash
  // (Telegram sets `#tgWebAppData=...` before any JS runs, well before
  // the WebApp SDK script finishes loading async). If the hash carries
  // a recognised `start_param` we immediately show the loading overlay
  // on first paint — no public-homepage flash before the deep-linked
  // destination loads. Otherwise we stay idle and let the user browse.
  const [stage, setStage] = useState<AuthStage>(() => {
    if (typeof window === "undefined") return "idle"
    const looksLikeMiniApp = window.location.hash.includes("tgWebApp")
    if (!looksLikeMiniApp) return "idle"
    if (localStorage.getItem("access_token")) return "done"
    return readStartTargetFromHash() ? "checking" : "idle"
  })
  const [submittingRole, setSubmittingRole] = useState<Role | null>(null)
  const [error, setError] = useState("")
  const [pendingRole, setPendingRole] = useState<Role | null>(null)
  const [consentOpen, setConsentOpen] = useState(false)
  // Guard against re-running the initial auto-login when state updates
  // trigger a re-render mid-flight. A ref instead of state because
  // nothing in the UI depends on this flag.
  const attempted = useRef(false)

  useEffect(() => {
    if (!isInTelegram || !initData) return
    // start_param is set by Telegram when the user follows a
    // `https://t.me/<bot>/<app>?startapp=<value>` deep link. We use
    // it for in-app routing (e.g. an "open chat" notification puts
    // `order_42` here so we navigate to /orders/42 after login).
    const startParam =
      window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? ""
    const startTarget = resolveStartParamTarget(startParam)

    if (typeof window !== "undefined" && localStorage.getItem("access_token")) {
      // Returning user with cached token — skip the network round-trip
      // and let the underlying page render.
      if (startTarget) router.push(startTarget)
      setStage("done")
      return
    }

    // Auto-fire only for deep-link targets that require auth. The
    // plain "open the Mini App" case stays idle until the user taps
    // a "Войти" / "Регистрация" button (handled by the event listener
    // below).
    if (startTarget && !attempted.current) {
      attempted.current = true
      setStage("checking")
      void runLogin()
    }

    const handleTrigger = () => {
      // Bail if we already have a token (could happen if the user
      // logged in via another tab) or if a flow is currently
      // in-flight.
      if (localStorage.getItem("access_token")) return
      if (submittingRole !== null) return
      setStage("checking")
      setError("")
      void runLogin()
    }
    window.addEventListener(TG_AUTH_EVENT, handleTrigger)

    return () => {
      window.removeEventListener(TG_AUTH_EVENT, handleTrigger)
    }

    async function runLogin(role?: Role) {
      try {
        const result = await telegramMiniAppLogin(initData, role)
        if (!result.ok && result.reason === "role_required") {
          setStage("needsRole")
          return
        }
        if (result.ok) {
          localStorage.setItem("access_token", result.access)
          localStorage.setItem("refresh_token", result.refresh)
          const me = await fetchMe(result.access)
          localStorage.setItem("role", me.role)
          setStage("done")
          if (result.created) {
            router.push(me.role === "mentor" ? "/onboarding/mentor/identity" : "/onboarding/student")
          } else if (startTarget) {
            router.push(startTarget)
          } else {
            router.refresh()
          }
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка входа через Telegram")
        setStage("done")
      }
    }
  }, [isInTelegram, initData, router, submittingRole])

  const handlePickRole = async (role: Role) => {
    setSubmittingRole(role)
    setError("")
    try {
      const result = await telegramMiniAppLogin(initData, role)
      if (result.ok) {
        localStorage.setItem("access_token", result.access)
        localStorage.setItem("refresh_token", result.refresh)
        localStorage.setItem("role", role)
        // Swap to checking spinner BEFORE navigating so the overlay
        // stays up while /onboarding/<role> mounts — otherwise the
        // destination page flashes its own auth-check skeleton.
        // Cleared shortly after navigation by a layout effect (below).
        setStage("checking")
        router.push(role === "mentor" ? "/onboarding/mentor/identity" : "/onboarding/student")
        // Hide the overlay after the next tick so the destination has
        // had a chance to read localStorage and render with auth.
        window.setTimeout(() => setStage("done"), 600)
      } else {
        setError("Не удалось создать аккаунт")
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка регистрации")
    } finally {
      setSubmittingRole(null)
    }
  }

  const handleDismiss = () => {
    setStage("done")
    setError("")
  }

  if (stage === "idle" || stage === "done") return null

  // Both checking and needsRole share the same full-screen frame so
  // there is no flash between them — only the inner content swaps.
  return (
    <>
    <DataConsentModal
      open={consentOpen}
      onConsent={() => {
        setConsentOpen(false)
        if (pendingRole) void handlePickRole(pendingRole)
        setPendingRole(null)
      }}
      onCancel={() => {
        setConsentOpen(false)
        setPendingRole(null)
      }}
    />
    <div className="fixed inset-0 z-50 bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {stage === "checking" ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Входим в Connectus...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Добро пожаловать в Connectus
            </h1>
            <p className="text-gray-500 text-sm mb-8 text-center">
              Выбери роль чтобы продолжить
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setPendingRole("student"); setConsentOpen(true) }}
                disabled={submittingRole !== null || consentOpen}
                className="bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {submittingRole === "student" ? "Создаём..." : "Я абитуриент или родитель"}
              </button>
              <button
                onClick={() => { setPendingRole("mentor"); setConsentOpen(true) }}
                disabled={submittingRole !== null || consentOpen}
                className="border border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {submittingRole === "mentor" ? "Создаём..." : "Я ментор"}
              </button>
              <button
                onClick={handleDismiss}
                disabled={submittingRole !== null}
                className="text-sm text-gray-500 hover:text-gray-700 py-2 disabled:opacity-50 transition-colors"
              >
                Назад
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 mt-4 text-center">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
    </>
  )
}
