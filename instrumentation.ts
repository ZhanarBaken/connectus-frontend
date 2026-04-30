// Next.js calls `register` once on server / edge runtime startup. We
// route to the matching Sentry config based on `NEXT_RUNTIME`. Both
// configs are noops if SENTRY_DSN is unset.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

// Surfaces unhandled rejections in React Server Components to Sentry —
// without this, RSC errors become opaque "something went wrong" pages
// with nothing in the dashboard.
export { captureRequestError as onRequestError } from "@sentry/nextjs"
