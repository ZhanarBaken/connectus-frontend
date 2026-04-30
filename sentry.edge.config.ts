// Edge runtime Sentry — runs in Vercel/Cloudflare-style edge handlers
// (middleware, edge API routes). Currently we don't proxy Telegram or
// any other credentialed API through edge handlers, so the TG-token
// redact in the shared scrubber is defensive future-proofing rather
// than an active leak fix here.
import * as Sentry from "@sentry/nextjs"

import { scrubBreadcrumb, scrubEvent } from "@/lib/sentry-scrub"

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "local",
    sendDefaultPii: false,
    tracesSampleRate: Number(
      process.env.SENTRY_TRACES_SAMPLE_RATE
        || process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
        || "0",
    ),
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  })
}
