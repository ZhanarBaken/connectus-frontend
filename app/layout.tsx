import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Header from "@/components/Header"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Connectus — найди ментора для поступления за рубеж",
  description: "Менторы помогают с поступлением, грантами, визами и документами",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={geist.className}>
        <Header />
        {children}
      </body>
    </html>
  )
}
