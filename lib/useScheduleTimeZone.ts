"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { fetchMe } from "./api"

function subscribeBrowserZone(onChange: () => void) {
  window.addEventListener("focus", onChange)
  return () => window.removeEventListener("focus", onChange)
}

function browserZoneSnapshot() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function serverZoneSnapshot() {
  return "UTC"
}

function isAccountFetchFailure(error: unknown): boolean {
  // fetchMe uses this error for non-success HTTP responses. Fetch rejects
  // network failures with TypeError; other TypeErrors are programming errors.
  return (error instanceof Error && error.message === "Failed to fetch user") ||
    (error instanceof TypeError && [
      "Failed to fetch", "Load failed", "NetworkError when attempting to fetch resource.",
    ].includes(error.message))
}

/** Saved preference wins; blank/unavailable accounts use the browser zone. */
export function useScheduleTimeZone() {
  const browserZone = useSyncExternalStore(subscribeBrowserZone, browserZoneSnapshot, serverZoneSnapshot)
  const [savedZone, setSavedZone] = useState("")
  const [preferenceLoadError, setPreferenceLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!localStorage.getItem("access_token")) return
    async function loadPreference() {
      try {
        const user = await fetchMe()
        if (!cancelled) {
          setSavedZone(user.time_zone || "")
          setPreferenceLoadError(false)
        }
      } catch (error) {
        if (cancelled) return
        if (isAccountFetchFailure(error)) {
          setSavedZone("")
          setPreferenceLoadError(true)
        } else {
          setFailure({ error })
        }
      }
    }
    void loadPreference()
    return () => { cancelled = true }
  }, [attempt])

  if (failure) throw failure.error
  return { timeZone: savedZone || browserZone, preferenceLoadError, retry }
}
