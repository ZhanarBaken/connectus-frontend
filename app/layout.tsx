import type { Metadata } from "next"
import { Geist, Instrument_Serif } from "next/font/google"
import "./globals.css"
import AnalyticsInit from "@/components/AnalyticsInit"
import Header from "@/components/Header"
import TelegramAutoLogin from "@/components/TelegramAutoLogin"

const geist = Geist({ subsets: ["latin"] })
const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Connectus — найди ментора для поступления за рубеж",
  description: "Менторы помогают с поступлением, грантами, визами и документами",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Google Material Symbols — used by <Icon> component */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-50..200&display=swap"
        />
        {/* Google Sign-In SDK */}
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        {/* Telegram Mini App SDK — no-op outside Telegram, exposes
            window.Telegram.WebApp inside it. */}
        <script src="https://telegram.org/js/telegram-web-app.js" async defer></script>
      </head>
      <body className={`${geist.className} ${instrumentSerif.variable}`}>
        <AnalyticsInit />
        <TelegramAutoLogin />
        <Header />
        {children}
      </body>
    </html>
  )
}
