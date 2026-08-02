"use client"

import { useEffect, useState, use } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { authFetch } from "@/lib/api"
import { fetchConversation, type Conversation } from "@/lib/chat"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import BackButton from "@/components/BackButton"
import { Avatar } from "@/components/Avatar"
import Icon from "@/components/Icon"
import ChatPanel from "@/components/ChatPanel"

interface Props {
  params: Promise<{ conversationId: string }>
}

export default function ConversationPage({ params }: Props) {
  const { conversationId } = use(params)
  const t = useTranslations("Messages")
  const tCommon = useTranslations("Common")
  const router = useRouter()
  const { isInTelegram, webApp } = useTelegramWebApp()
  useEffect(() => {
    if (webApp) {
      try { webApp.expand() } catch { /* older clients */ }
    }
  }, [webApp])

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { router.replace(`/auth/login?next=/messages/${conversationId}`); return }

    fetchConversation(Number(conversationId))
      .then(setConversation)
      .catch(() => router.replace("/messages"))
      .finally(() => setLoading(false))

    authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => { if (me) setCurrentUserId(me.id) })
      .catch(() => {})
  }, [conversationId, router])

  if (loading || !conversation) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const otherPartyName = conversation.other_party_name || t("mentorDefault")

  return (
    <div className={`bg-[#fafafa] ${isInTelegram ? "min-h-[100dvh] flex flex-col" : "min-h-screen"}`}>
      <div className={`max-w-2xl mx-auto w-full ${isInTelegram ? "px-3 py-3 flex flex-col flex-1 min-h-0" : "px-4 py-10"}`}>
        {!isInTelegram && (
          <BackButton
            fallbackHref="/messages"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-4 transition-colors group [-webkit-tap-highlight-color:transparent]"
          />
        )}
        <div className={`bg-white border border-gray-200 flex flex-col ${isInTelegram ? "flex-1 min-h-0" : "rounded-2xl h-[70vh]"}`}>
          <ChatPanel
            conversationId={conversation.id}
            currentUserId={currentUserId}
            leadingHeaderAction={isInTelegram && (
              <button
                type="button"
                onClick={() => router.push("/messages")}
                className="text-gray-500 hover:text-gray-900 transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0 [-webkit-tap-highlight-color:transparent]"
                aria-label={tCommon("back")}
              >
                <Icon name="arrow_back" size={22} />
              </button>
            )}
            titleOverride={
              <div className="flex-1 min-w-0 flex items-center gap-2.5">
                <Avatar
                  src={conversation.other_party_photo}
                  name={otherPartyName}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex-shrink-0"
                  letterClassName="text-white font-bold text-xs"
                />
                <h1 className="font-semibold text-gray-900 truncate">{otherPartyName}</h1>
              </div>
            }
          />
        </div>
      </div>
    </div>
  )
}
