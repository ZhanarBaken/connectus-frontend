"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { authFetch, fetchMentorClients, type MentorClient, type MentorClients } from "@/lib/api"
import { startConversationWithClient } from "@/lib/chat"
import { useMentorOnboardingGate } from "@/lib/useMentorOnboardingGate"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import { Avatar } from "@/components/Avatar"
import BackButton from "@/components/BackButton"
import ChatPanel from "@/components/ChatPanel"
import Icon from "@/components/Icon"
import MentorStatusBanner from "@/components/MentorStatusBanner"

type Tab = "active" | "inactive"

interface ActiveChat {
  conversationId: number
  name: string
  photo: string | null
}

function ClientRow({
  client, isInTelegram, onOpenChat,
}: {
  client: MentorClient
  isInTelegram: boolean
  onOpenChat: (chat: ActiveChat) => void
}) {
  const t = useTranslations("Dashboard.MentorClients")
  const router = useRouter()
  const [startingChat, setStartingChat] = useState(false)
  const [chatError, setChatError] = useState("")

  const handleChat = async () => {
    let conversationId = client.conversation_id
    if (conversationId === null) {
      setStartingChat(true)
      setChatError("")
      try {
        conversationId = (await startConversationWithClient(client.id)).id
      } catch {
        setChatError(t("chatWithClientError"))
        setStartingChat(false)
        return
      }
      setStartingChat(false)
    }
    // In the Telegram Mini App, open the same fullscreen in-page overlay
    // the order page uses — no separate route, matches the rest of the
    // Mini App's chat UX. Outside Telegram, the standalone /messages/[id]
    // dialog page (already used by the mentor-profile "message" button)
    // is the right fit — a full page is normal there.
    if (isInTelegram) {
      onOpenChat({ conversationId, name: client.full_name, photo: client.profile_photo })
    } else {
      router.push(`/messages/${conversationId}`)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <Avatar
          src={client.profile_photo}
          name={client.full_name}
          className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500"
          letterClassName="text-white font-bold"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{client.full_name}</p>
          <p className="text-xs text-gray-400 truncate">
            {[client.current_school_or_university, client.city].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleChat}
          disabled={startingChat}
          aria-label={t("chatWithClient")}
          className="flex-shrink-0 w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
        >
          {startingChat ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <Icon name="chat" size={18} />
          )}
        </button>
      </div>
      {chatError && (
        <p className="text-xs text-red-600 mt-2">{chatError}</p>
      )}
    </div>
  )
}

export default function MentorClientsPage() {
  const t = useTranslations("Dashboard.MentorClients")
  const tCommon = useTranslations("Common")
  const router = useRouter()
  useMentorOnboardingGate()
  const { isInTelegram, webApp } = useTelegramWebApp()
  const [data, setData] = useState<MentorClients | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<Tab>("active")
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null)

  // Mini App opens at half-height by default — expand once the overlay
  // is up, same as the order page and the standalone /messages/[id] page.
  useEffect(() => {
    if (!activeChat || !webApp) return
    try { webApp.expand() } catch { /* older clients */ }
  }, [activeChat, webApp])

  // Lock the body scroll while the fullscreen chat overlay is up so a
  // swipe doesn't drag the client list underneath it — same as the
  // order page's chatExpanded overlay.
  useEffect(() => {
    if (!activeChat) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [activeChat])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.replace("/auth/login?next=/mentor/clients")
      return
    }
    fetchMentorClients()
      .then(setData)
      .catch((e) => setError(e instanceof Error && e.message ? e.message : t("errorLoading")))
      .finally(() => setLoading(false))
    authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => { if (me) setCurrentUserId(me.id) })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#fafafa] px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <BackButton fallbackHref="/mentor/dashboard" />
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mt-4">
            {error || t("errorGeneric")}
          </div>
        </div>
      </div>
    )
  }

  const list = data[tab]

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <MentorStatusBanner />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <BackButton fallbackHref="/mentor/dashboard" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-4">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>

        <div className="flex gap-2 mb-6">
          {(["active", "inactive"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {key === "active" ? t("activeTab") : t("inactiveTab")} · {data[key].length}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Icon name="group" size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {tab === "active" ? t("noActiveTitle") : t("noInactiveTitle")}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {tab === "active" ? t("noActiveBody") : t("noInactiveBody")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                isInTelegram={isInTelegram}
                onOpenChat={setActiveChat}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen in-page chat overlay for the Mini App — same pattern
          as the order page's chatExpanded overlay, so opening a chat from
          the Clients list feels the same everywhere in the Mini App. */}
      {activeChat && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col h-[100dvh]">
          <ChatPanel
            conversationId={activeChat.conversationId}
            currentUserId={currentUserId}
            leadingHeaderAction={(
              <button
                type="button"
                onClick={() => setActiveChat(null)}
                className="text-gray-500 hover:text-gray-900 transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0 [-webkit-tap-highlight-color:transparent]"
                aria-label={tCommon("back")}
              >
                <Icon name="arrow_back" size={22} />
              </button>
            )}
            titleOverride={(
              <div className="flex-1 min-w-0 flex items-center gap-2.5">
                <Avatar
                  src={activeChat.photo}
                  name={activeChat.name}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex-shrink-0"
                  letterClassName="text-white font-bold text-xs"
                />
                <h1 className="font-semibold text-gray-900 truncate">{activeChat.name}</h1>
              </div>
            )}
          />
        </div>
      )}
    </div>
  )
}
