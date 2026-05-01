// Amplitude facade — single entry point for product-analytics events.
//
// Disabled by default. Requires BOTH `NEXT_PUBLIC_AMPLITUDE_API_KEY`
// AND `NEXT_PUBLIC_ANALYTICS_ENABLED=true` to ship events; either one
// missing turns every public function into a noop. Local dev runs
// without analytics so refresh-loops don't pollute the prod project.
//
// KZ Закон №94-V: Amplitude is a US/EU SaaS. Server zone is hard-coded
// to EU and only internal user_id / non-PII traits get forwarded —
// never email / phone / Telegram username. Each call site is
// responsible for filtering its own properties; there is no PII
// scrubber here, by design.
//
// Mirrors backend `apps/core/analytics.py` so events from both sides
// land in the same project with consistent shape.

type AmplitudeModule = typeof import("@amplitude/analytics-browser")

let amplitude: AmplitudeModule | null = null
let initPromise: Promise<void> | null = null

function enabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" &&
    Boolean(process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY)
  )
}

// Initialise the SDK exactly once. Safe to call repeatedly — the
// in-flight Promise is cached, so React StrictMode's double-invoke
// of effects (and any future remount) waits on the same load instead
// of racing two parallel imports. The dynamic `import()` keeps the
// SDK out of the initial JS payload for users who land with the
// feature disabled.
export function init(): Promise<void> {
  if (!enabled()) return Promise.resolve()
  if (initPromise) return initPromise
  initPromise = (async () => {
    try {
      const mod = await import("@amplitude/analytics-browser")
      mod.init(process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY!, {
        serverZone: "EU",
        // We attach identity explicitly via `identify(userId, traits)` —
        // never rely on Amplitude's IP-derived auto-fields.
        autocapture: false,
      })
      amplitude = mod
    } catch {
      // SDK failed to load — analytics MUST never break the page.
      // Reset the cached Promise so a future remount (e.g. SPA
      // navigation that unmounts and remounts the layout) can retry
      // a fresh load. Subsequent track/identify calls noop on
      // `amplitude === null` until then.
      initPromise = null
    }
  })()
  return initPromise
}

export function track(eventType: string, properties?: Record<string, unknown>): void {
  if (!amplitude) return
  try {
    amplitude.track(eventType, properties)
  } catch {
    // Defensive boundary — third-party SDK / network failure must not
    // bubble up into UI event handlers.
  }
}

export function identify(userId: string | number, traits?: Record<string, unknown>): void {
  if (!amplitude) return
  try {
    amplitude.setUserId(String(userId))
    if (traits) {
      const ident = new amplitude.Identify()
      for (const [key, value] of Object.entries(traits)) {
        ident.set(key, value as string | number | boolean)
      }
      amplitude.identify(ident)
    }
  } catch {
    // Same posture as `track`.
  }
}

export function clearIdentity(): void {
  if (!amplitude) return
  try {
    amplitude.reset()
  } catch {
    // Same posture as `track`.
  }
}
