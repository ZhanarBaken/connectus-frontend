"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
// Deliberately using next/navigation's plain useRouter here, not
// next-intl's locale-aware one from @/i18n/navigation. Telegram's
// start_param deep link is constructed by the backend (separate repo),
// which now tags it with the recipient's known site language (e.g.
// `order_42_en`) — resolveStartParamTarget below reads that tag and
// builds the locale-prefixed path by hand (`/en/orders/42`), so a
// plain, non-locale-aware push() still lands in the right place.
// Untagged / `ru` params fall through to the unprefixed path, matching
// localePrefix: "as-needed".
import { useRouter } from "next/navigation"
import { telegramMiniAppLogin, fetchMe } from "@/lib/api"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import DataConsentModal from "@/components/DataConsentModal"
import type { Role } from "@/types"


// Telegram exposes whatever string the bot put after `?startapp=` in
// `initDataUnsafe.start_param`. We use it as a tiny routing key —
// e.g. server-side notification builds `order_<id>` so a tap on the
// TG message lands on the right order screen post-login, `chat_<id>`
// for a direct chat message notification with no order behind it (a
// student recipient — /messages/[id] is student-only now), or
// `client_<student_id>` for the same no-order case when the recipient
// is a mentor (see apps.chat.notifications on the backend). Returning
// null when the value isn't recognised keeps the auto-login flow
// from accidentally redirecting to an attacker-shaped path.
function resolveStartParamTarget(raw: string | null | undefined): string | null {
  if (!raw) return null

  // Email-verification link tapped from outside Telegram entirely (the
  // phone's mail app) — see apps.users.emails.send_verification_email
  // and EmailSetView on the backend. Checked first since the token is
  // an opaque secrets.token_urlsafe(32) string, not a numeric id like
  // the other kinds below; its length (always exactly 43 chars) is what
  // lets an optional trailing locale tag be split off unambiguously.
  const verifyMatch = /^verify_([A-Za-z0-9_-]{43})(?:_(ru|en|kk))?$/.exec(raw)
  if (verifyMatch) {
    const [, token, taggedLocale] = verifyMatch
    const prefix = taggedLocale && taggedLocale !== "ru" ? `/${taggedLocale}` : ""
    return `${prefix}/auth/verify-email?token=${token}`
  }

  const match = /^(order|chat|client)_(\d+)(?:_(ru|en|kk))?$/.exec(raw)
  if (!match) return null
  const [, kind, id, taggedLocale] = match
  // "ru" is the default (unprefixed) locale — only en/kk get a
  // path prefix, matching i18n/routing.ts's localePrefix: "as-needed".
  const prefix = taggedLocale && taggedLocale !== "ru" ? `/${taggedLocale}` : ""
  if (kind === "order") {
    // ?chat=open tells the order page to open the chat overlay
    // straight away on mount (the param is read inside that page).
    return `${prefix}/orders/${id}?chat=open`
  }
  if (kind === "client") {
    return `${prefix}/mentor/clients/${id}`
  }
  return `${prefix}/messages/${id}`
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
  const t = useTranslations("TelegramAutoLogin")
  // The login effect below reads translations from inside a closure that
  // must not re-run just because `t`'s reference changed (see tRef use
  // below) — otherwise a locale switch mid-flight (this component is
  // mounted in the locale layout itself, so it survives a client-side
  // locale change) would still read the pre-switch `t` from the effect's
  // stale closure. A ref sidesteps that without adding `t` to the
  // effect's dependency array.
  const tRef = useRef(t)
  tRef.current = t
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
        setError(e instanceof Error && e.message ? e.message : tRef.current("errorLoginGeneric"))
        setStage("done")
      }
    }
    // Reads tRef.current instead of `t` directly (see the ref's own
    // comment above) — this effect fires the login network call and must
    // not re-run just because the user switched locale mid-flight.
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
        setError(t("errorAccountCreateFailed"))
      }
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : t("errorRegisterGeneric"))
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
            <p className="text-sm text-gray-500">{t("loading")}</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              {t("welcomeTitle")}
            </h1>
            <p className="text-gray-500 text-sm mb-8 text-center">
              {t("chooseRoleSubtitle")}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setPendingRole("student"); setConsentOpen(true) }}
                disabled={submittingRole !== null || consentOpen}
                className="bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {submittingRole === "student" ? t("creating") : t("roleStudent")}
              </button>
              <button
                onClick={() => { setPendingRole("mentor"); setConsentOpen(true) }}
                disabled={submittingRole !== null || consentOpen}
                className="border border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {submittingRole === "mentor" ? t("creating") : t("roleMentor")}
              </button>
              <button
                onClick={handleDismiss}
                disabled={submittingRole !== null}
                className="text-sm text-gray-500 hover:text-gray-700 py-2 disabled:opacity-50 transition-colors"
              >
                {t("back")}
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
