"use client"

import { useEffect, useState } from "react"

export interface TelegramWebAppContext {
  webApp: TelegramWebApp | null
  isInTelegram: boolean
  initData: string
}

// Ensure the Telegram WebApp SDK script has been injected and the
// `window.Telegram.WebApp` global is ready. Returns null until ready.
//
// We don't bundle the SDK because Telegram updates it independently; the
// script is loaded by `app/layout.tsx`. Detection is purely runtime —
// outside Telegram, the global never appears and `isInTelegram` stays
// false forever.
export function useTelegramWebApp(): TelegramWebAppContext {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    let cancelled = false
    const tryAttach = () => {
      const candidate = window.Telegram?.WebApp
      // initData is empty string in non-Telegram contexts (or when the
      // SDK loads outside a Mini App), so we use it as the "really in
      // Telegram" signal rather than mere presence of the global.
      if (candidate && candidate.initData && !cancelled) {
        candidate.ready()
        setWebApp(candidate)
        return true
      }
      return false
    }

    if (tryAttach()) return

    // SDK loads `async defer`, so it may not be ready on first render.
    // Poll briefly, then give up — outside Telegram nothing will ever
    // attach and continued polling would waste battery.
    let elapsed = 0
    const interval = window.setInterval(() => {
      elapsed += 100
      if (tryAttach() || elapsed >= 1500) {
        window.clearInterval(interval)
      }
    }, 100)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return {
    webApp,
    isInTelegram: webApp !== null,
    initData: webApp?.initData ?? "",
  }
}
