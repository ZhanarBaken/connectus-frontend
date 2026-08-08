"use client"

import { useState } from "react"
import { authFetch } from "@/lib/api"

// Shared by the mentor/student profile-edit and onboarding forms. PATCHes
// `url` with `body` and, on a field-keyed 400 response, highlights the
// exact offending field instead of collapsing everything into one generic
// banner. `errorMessages` maps known raw backend strings to translated
// copy (unmapped messages fall back to the raw text as-is).
//
// Only owns `fieldErrors` — it's never touched outside this flow on any of
// the call sites. `error` stays with the caller since pages usually share
// that state with unrelated concerns (e.g. a photo-upload error), and
// success handling (redirect vs. stay and show a checkmark) always differs
// per page, so `submitPatch` reports success/failure and lets the caller
// decide what happens next.
export function usePatchWithFieldErrors(
  errorMessages: Record<string, string>,
  fixRedFieldsMessage: string,
) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const submitPatch = async (
    url: string,
    body: unknown,
    setError: (msg: string) => void,
    fallbackMessage: string,
  ): Promise<boolean> => {
    setError("")
    setFieldErrors({})
    try {
      const res = await authFetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        // Throw the raw field-keyed JSON (not a flattened first message)
        // so the catch below can highlight the exact offending field
        // instead of a generic bottom-of-page banner.
        const err = await res.json()
        throw new Error(JSON.stringify(err))
      }
      return true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : fallbackMessage
      try {
        const parsed = JSON.parse(msg)
        if (parsed && typeof parsed === "object") {
          const errs: Record<string, string> = {}
          for (const [k, v] of Object.entries(parsed)) {
            const raw = Array.isArray(v) ? String(v[0]) : String(v)
            errs[k] = errorMessages[raw] ?? raw
          }
          setFieldErrors(errs)
          setError(fixRedFieldsMessage)
          const firstKey = Object.keys(errs)[0]
          document.querySelector(`[data-field="${firstKey}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        } else {
          setError(msg)
        }
      } catch {
        setError(msg)
      }
      return false
    }
  }

  return { fieldErrors, submitPatch }
}
