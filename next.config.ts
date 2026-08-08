import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

const nextConfig: NextConfig = withNextIntl({
  async headers() {
    return [
      {
        // Self-hosted Material Symbols font (see app/globals.css) — the
        // filename has no content hash, so bump it on any future replace
        // instead of overwriting in place, since clients cache this for a year.
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
})

// `withSentryConfig` wraps the build pipeline with Sentry's source-map
// upload step. Skip the wrap entirely when no DSN is configured so:
//   1. Local builds by contributors don't see Sentry warnings.
//   2. The source-map upload step doesn't try to run without
//      SENTRY_AUTH_TOKEN (which would emit a warning per build).
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

export default sentryDsn
  ? withSentryConfig(nextConfig, {
      // Only print build-time messages when CI explicitly asks for them.
      silent: !process.env.CI,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Skip the upload entirely without an auth token — keeps the
      // build green when DSN is set but the CI secret isn't.
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      // Disable Sentry's React Compiler tweaks until we benchmark them
      // on this project — they affect bundle size in non-trivial ways.
      reactComponentAnnotation: { enabled: false },
    })
  : nextConfig
