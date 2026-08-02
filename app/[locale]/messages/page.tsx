"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter, Link } from "@/i18n/navigation"
import { clearAuth } from "@/lib/api"
import { fetchMyConversations, type ConversationListItem } from "@/lib/chat"
import { useStudentOnboardingGate } from "@/lib/useStudentOnboardingGate"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"
import { Avatar } from "@/components/Avatar"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"

export default function MessagesPage() {
  const t = useTranslations("Messages")
  const locale = useLocale()
  const router = useRouter()
  useStudentOnboardingGate()
  const { isInTelegram, webApp } = useTelegramWebApp()
  useEffect(() => {
    if (webApp) {
      try { webApp.expand() } catch { /* older clients */ }
    }
  }, [webApp])
  const [role, setRole] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { router.replace("/auth/login?next=/messages"); return }
    const r = localStorage.getItem("role")
    setRole(r)

    fetchMyConversations()
      .then(setConversations)
      .catch(() => {
        clearAuth()
        router.replace("/auth/login")
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`bg-[#fafafa] ${isInTelegram ? "min-h-[100dvh]" : "min-h-screen"}`}>
      <div className={`max-w-3xl mx-auto ${isInTelegram ? "px-3 py-3" : "px-4 py-10"}`}>
        {!isInTelegram && (
          <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-4 transition-colors group [-webkit-tap-highlight-color:transparent]" />
        )}
        <div className={isInTelegram ? "mb-4" : "mb-8"}>
          <h1 className={`font-bold text-gray-900 ${isInTelegram ? "text-xl" : "text-2xl"}`}>{t("title")}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {role === "mentor"
              ? t("subtitleMentor")
              : t("subtitleStudent")}
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="mb-4 flex justify-center">
              <Icon name="chat" size={48} className="text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{t("emptyTitle")}</h3>
            <p className="text-sm text-gray-400 mb-6">
              {role === "mentor"
                ? t("emptyBodyMentor")
                : t("emptyBodyStudent")}
            </p>
            {role !== "mentor" && (
              <Link
                href="/mentors"
                className="inline-flex bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                {t("findMentor")}
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {conversations.map((c, i) => {
              const counterpartName = c.other_party_name ||
                (role === "mentor" ? t("applicantDefault") : t("mentorDefault"))
              const dateLabel = c.last_message_at
                ? new Date(c.last_message_at).toLocaleDateString(locale, { day: "numeric", month: "short" })
                : ""
              // Orders still exist for chats that started from one — send
              // those to the order page (with the Mini App deep-link param
              // it already understands). Direct student→mentor chats with
              // no order have nowhere else to go but the standalone page.
              const href = c.order_id !== null
                ? (isInTelegram ? `/orders/${c.order_id}?chat=open` : `/orders/${c.order_id}`)
                : `/messages/${c.id}`

              return (
                <Link
                  key={c.id}
                  href={href}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                    i < conversations.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <Avatar
                    src={c.other_party_photo}
                    name={counterpartName}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500"
                    letterClassName="text-white font-bold"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{counterpartName}</h3>
                      {dateLabel && <span className="text-xs text-gray-400 flex-shrink-0">{dateLabel}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400 truncate flex-1">
                        {c.last_message_text || t("noMessagesYet")}
                      </p>
                      {c.unread_count > 0 && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold flex items-center justify-center">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
