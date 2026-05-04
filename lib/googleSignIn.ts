// Google Identity Services helper.
//
// Wraps `google.accounts.id.prompt()` so callers don't have to deal with
// the SDK's three failure modes that all leak the same way: the prompt
// is requested, nothing visible happens, and the success callback never
// fires. Common causes — Telegram WebView (FedCM blocked), Safari with
// 3rd-party cookies disabled, or the user dismissed One-Tap too many
// times and Google is throttling it.
//
// The wrapper guarantees exactly one outcome:
//   - resolves with the credential string when the user picked an
//     account
//   - rejects with a localised, user-facing message when the prompt
//     could not be shown OR when nothing happened within `timeoutMs`
//
// Callers chain `.then(googleAuth)` / `.catch(setError)` and never have
// to handle the SDK's notification API directly.

const NOT_AVAILABLE_MESSAGE =
  "Google Sign-In недоступен здесь. Откройте сайт в обычном браузере или используйте другой способ входа."

const SDK_NOT_LOADED_MESSAGE =
  "Google SDK не загрузился. Перезагрузите страницу."

interface PromptNotification {
  isNotDisplayed?: () => boolean
  isSkippedMoment?: () => boolean
}

interface GoogleIdentitySdk {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string
        callback: (response: { credential: string }) => void
      }) => void
      prompt: (handler?: (notification: PromptNotification) => void) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentitySdk
  }
}

export async function promptGoogleCredential(
  clientId: string,
  timeoutMs = 10000,
): Promise<string> {
  if (!window.google?.accounts?.id) {
    throw new Error(SDK_NOT_LOADED_MESSAGE)
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false
    const settle = (cb: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(failTimeout)
      cb()
    }

    // Backstop: prompt() can silently no-op (FedCM blocked, throttled,
    // unsupported context). Without this the caller's button stays in
    // its loading state forever.
    const failTimeout = setTimeout(() => {
      settle(() => reject(new Error(NOT_AVAILABLE_MESSAGE)))
    }, timeoutMs)

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        settle(() => resolve(credential))
      },
    })
    window.google!.accounts.id.prompt((notification) => {
      // Explicit failure modes from the SDK — fire before the timeout.
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        settle(() => reject(new Error(NOT_AVAILABLE_MESSAGE)))
      }
    })
  })
}
