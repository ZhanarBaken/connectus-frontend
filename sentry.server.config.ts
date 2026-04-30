// Server-side Sentry — runs in Node.js for SSR / API routes. Reads
// SENTRY_DSN (non-public) at runtime so it can differ from the
// browser DSN if needed.
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
    // The Node SDK does not have a `maxRequestBodySize` option (that's
    // Python-only). Request bodies are dropped via the shared scrubber.
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  })
}
