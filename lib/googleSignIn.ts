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

// Thrown instead of a plain Error so callers never accidentally surface
// a hardcoded-language message via `e.message` — every call site is
// expected to catch this and show its own translated copy. Both failure
// modes (prompt silently no-op'd, SDK script never loaded) render the
// same "couldn't sign in with Google" message everywhere today, so one
// class covers both instead of forcing every caller to distinguish them.
export class GoogleSignInUnavailableError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = "GoogleSignInUnavailableError"
  }
}

interface GoogleIdentitySdk {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string
        callback: (response: { credential: string }) => void
        use_fedcm_for_prompt?: boolean
      }) => void
      prompt: () => void
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
  // 10 s used to be too aggressive — real users picking an account
  // (especially first-timers consenting to scopes) routinely take
  // 20–40 s. The timeout's only job is to unstick the button when
  // the prompt silently no-ops; legitimate slow pickers shouldn't
  // hit it. 90 s gives plenty of headroom.
  timeoutMs = 90000,
): Promise<string> {
  if (!window.google?.accounts?.id) {
    throw new GoogleSignInUnavailableError("Google SDK script not loaded")
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false
    const settle = (cb: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(failTimeout)
      cb()
    }

    // Backstop: prompt() can silently no-op (third-party cookies blocked,
    // user dismissed, unsupported context). Without this the caller's
    // button stays in its loading state forever.
    //
    // We used to also reject when the legacy notification API reported
    // `isNotDisplayed()` / `isSkippedMoment()` — but those return `true`
    // under FedCM whenever Google shows its own native dialog instead of
    // the legacy iframe prompt, causing false-negative rejects. Per
    // Google's FedCM migration guide we now opt into FedCM and rely
    // entirely on the callback (success) + this timeout (failure).
    const failTimeout = setTimeout(() => {
      settle(() => reject(new GoogleSignInUnavailableError("Prompt did not resolve before timeout")))
    }, timeoutMs)

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        settle(() => resolve(credential))
      },
      use_fedcm_for_prompt: true,
    })
    window.google!.accounts.id.prompt()
  })
}
