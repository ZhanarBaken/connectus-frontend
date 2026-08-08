import createMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"

export default createMiddleware(routing)

export const config = {
  // Excludes: /crm/* entirely (must never be touched by locale
  // negotiation/redirects — an admin whose browser sends a non-ru
  // Accept-Language header must not get bounced toward a nonexistent
  // /en/crm/... route), Next internals, and any request path that
  // looks like a static file (has a dot, e.g. .png/.ico/.txt). No
  // /api/* exclusion needed today (no app/api route handlers exist in
  // this repo), included defensively so adding one later doesn't
  // silently break it.
  matcher: ["/((?!api|crm|_next|_vercel|.*\\..*).*)"],
}
