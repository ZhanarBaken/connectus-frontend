import type { Metadata, Viewport } from "next"
import { hasLocale } from "next-intl"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { geist, instrumentSerif } from "../fonts"
import { IconFontHead } from "@/components/IconFontHead"
import { routing } from "@/i18n/routing"
import "../globals.css"
import AnalyticsInit from "@/components/AnalyticsInit"
import Header from "@/components/Header"
import TelegramAutoLogin from "@/components/TelegramAutoLogin"

export const metadata: Metadata = {
  title: "Connectus — найди ментора для поступления за рубеж",
  description: "Менторы помогают с поступлением, грантами, визами и документами",
  // Staging should never be indexed by search engines.
  robots: process.env.NEXT_PUBLIC_IS_STAGING === "true"
    ? { index: false, follow: false }
    : undefined,
}

// Telegram Mini App renders inside a narrow modal that resizes with
// the host window. Locking the viewport keeps the WebView from
// rendering at a default ~980px width and clipping cards.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  // Enables static rendering for pages that opt into it later — most
  // pages here are force-dynamic today (backend isn't reachable at
  // build time), but this is cheap to set up now.
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <head>
        <IconFontHead />
        {/* Google Sign-In SDK */}
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        {/* Telegram Mini App SDK — no-op outside Telegram, exposes
            window.Telegram.WebApp inside it. */}
        <script src="https://telegram.org/js/telegram-web-app.js" async defer></script>
      </head>
      <body className={`${geist.className} ${instrumentSerif.variable}`}>
        <NextIntlClientProvider messages={messages}>
          <AnalyticsInit />
          <TelegramAutoLogin />
          <Header />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
