import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Link from "next/link"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Connectus — найди ментора для поступления за рубеж",
  description: "Менторы помогают с поступлением, грантами, визами и документами",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={geist.className}>
        <header className="border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">Connectus</Link>
            <div className="flex gap-4 text-sm">
              <Link href="/auth/login" className="text-gray-600 hover:text-black">Войти</Link>
              <Link href="/auth/register" className="bg-black text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 transition">
                Регистрация
              </Link>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
