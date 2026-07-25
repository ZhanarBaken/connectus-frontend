import Link from "next/link"

// Defensive fallback only — reachable if a request somehow matches
// neither /crm/* nor a resolvable /[locale]/* route (shouldn't happen
// given proxy.ts's matcher, but Next.js requires a top-level not-found
// since there's no shared app/layout.tsx to inherit one from). No
// next-intl here on purpose: this file exists specifically for the
// case where locale resolution didn't happen, and plain next/link
// (not @/i18n/navigation) since there's no resolved locale to route
// within.
export default function RootNotFound() {
  return (
    <html lang="ru">
      <body>
        <main style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 16px", fontFamily: "sans-serif" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Страница не найдена</h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>Такой страницы не существует</p>
          <Link href="/" style={{ color: "#4f46e5", fontWeight: 500 }}>На главную</Link>
        </main>
      </body>
    </html>
  )
}
