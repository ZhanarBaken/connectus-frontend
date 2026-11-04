// A one-use handoff for client-side locale navigation only. Never persist this
// object: it contains a password. Reloads and ordinary signup visits start fresh.
export const REGISTRATION_LOCALE_CHANGE = "connectus:registration-locale-change"

export type RegistrationLocaleDraft = {
  step: 1 | 2
  role: "student" | "mentor"
  country: string
  email: string
  password: string
  registered: boolean
}

let handoff: { locale: string; query: string; draft: RegistrationLocaleDraft } | null = null

let expiry: ReturnType<typeof setTimeout> | undefined

export function saveRegistrationLocaleDraft(locale: string, draft: RegistrationLocaleDraft) {
  clearRegistrationLocaleDraft()
  // App Router has no navigation-failure callback. Bound the lifetime if a
  // cancelled/failed transition never mounts the destination.
  expiry = setTimeout(clearRegistrationLocaleDraft, 30_000)
  window.addEventListener("pagehide", clearRegistrationLocaleDraft, { once: true })
  handoff = { locale, query: window.location.search, draft }
}

export function readRegistrationLocaleDraft(locale: string) {
  return typeof window !== "undefined" && handoff?.locale === locale && handoff.query === window.location.search
    ? handoff.draft
    : null
}

export function clearRegistrationLocaleDraft() {
  handoff = null
  clearTimeout(expiry)
  expiry = undefined
  if (typeof window !== "undefined") window.removeEventListener("pagehide", clearRegistrationLocaleDraft)
}
