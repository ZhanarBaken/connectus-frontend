// PII / credential scrubbing for Sentry events. Mirrors the backend's
// `apps/core/sentry_scrub.py` posture: allowlist headers, drop request
// bodies, redact Telegram bot tokens (in case the frontend ever gains
// a path to api.telegram.org).
//
// Kept tiny on purpose — every config that calls it (client, server,
// edge) re-imports a shared module rather than copy-pasting a denylist
// that will rot.
import type { Breadcrumb, ErrorEvent, EventHint } from "@sentry/nextjs"

// `https://api.telegram.org/bot<bot_id>:<auth_string>/...` — leading `/`
// anchors on the URL form, where the token shows up in this codebase.
const TELEGRAM_TOKEN_RE = /\/bot\d+:[A-Za-z0-9_-]+/g
const TELEGRAM_TOKEN_REDACTED = "/bot[REDACTED]"

// Allowlist mirrors the backend. `Referer` is intentionally excluded
// (carries previous URL incl. its query string).
const HEADER_ALLOWLIST = new Set([
  "Content-Type",
  "Content-Length",
  "Accept",
  "Accept-Language",
  "User-Agent",
])

export function redactSecrets(text: string): string
export function redactSecrets(text: string | undefined): string | undefined
export function redactSecrets(text: string | undefined): string | undefined {
  if (typeof text !== "string") return text
  return text.replace(TELEGRAM_TOKEN_RE, TELEGRAM_TOKEN_REDACTED)
}

function stripQuery(url: string | undefined): string | undefined {
  if (typeof url !== "string") return url
  const qIdx = url.indexOf("?")
  return redactSecrets(qIdx >= 0 ? url.slice(0, qIdx) : url)
}

// `before_send`-style hook. Dispatch to the right shape: server runs
// inside Node where `event.request.headers` is a plain object; client
// rarely ships a request object at all.
export function scrubEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  const request = event.request
  if (request) {
    delete request.data
    delete request.query_string
    delete request.cookies
    if (request.url) request.url = stripQuery(request.url)
    if (request.headers && typeof request.headers === "object") {
      const headers = request.headers as Record<string, string>
      for (const name of Object.keys(headers)) {
        if (!HEADER_ALLOWLIST.has(name)) delete headers[name]
      }
    }
  }
  return event
}

// `before_breadcrumb`-style hook. Strips query strings from outbound
// fetch/XHR + navigation breadcrumbs, redacts TG tokens in messages.
// Note: query strings are dropped wholesale — losing category-filter
// triage info is the trade-off; we cannot enumerate every PII-bearing
// query param at build time.
export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  if (crumb.data && typeof crumb.data === "object") {
    const data = crumb.data as Record<string, unknown>
    if (typeof data.url === "string") {
      data.url = stripQuery(data.url)
    }
  }
  if (typeof crumb.message === "string") {
    crumb.message = redactSecrets(crumb.message)
  }
  return crumb
}
