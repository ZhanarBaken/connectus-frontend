// Client-side Sentry — runs in the browser. Picks up NEXT_PUBLIC_SENTRY_DSN
// at build time. Empty DSN = SDK is a hard noop (init is never called).
import * as Sentry from "@sentry/nextjs"

import { scrubBreadcrumb, scrubEvent } from "@/lib/sentry-scrub"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "local",
    sendDefaultPii: false,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0"),
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
    // Replay integration is intentionally NOT registered. Full session
    // replay would record chat messages, mentor profile content, and
    // form fields with email/password — all PII the compliance posture
    // forbids. To enable error-only replay later, both
    // `Sentry.replayIntegration({...})` in `integrations: []` and the
    // sample rates would need to be added.
  })
}
