import type { Metadata } from "next"
import { geist, instrumentSerif } from "../fonts"
import { IconFontHead } from "@/components/IconFontHead"
import CRMShell from "@/components/CRMShell"
import "../globals.css"

// CRM is one of two independent root layouts (see app/[locale]/layout.tsx
// for the other) — outside the locale-routing tree entirely, always
// Russian, no NextIntlClientProvider. A root layout must be a server
// component to export metadata, so all the interactive bits (role gate,
// sidebar) live in CRMShell instead.
export const metadata: Metadata = {
  title: "Connectus CRM",
  robots: { index: false, follow: false },
}

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <IconFontHead />
      </head>
      <body className={`${geist.className} ${instrumentSerif.variable}`}>
        <CRMShell>{children}</CRMShell>
      </body>
    </html>
  )
}
