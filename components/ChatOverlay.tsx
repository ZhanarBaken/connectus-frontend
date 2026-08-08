"use client"

import { useEffect } from "react"
import Icon from "@/components/Icon"
import { Avatar } from "@/components/Avatar"
import ChatPanel from "@/components/ChatPanel"

interface Props {
  conversationId: number
  currentUserId: number | null
  onClose: () => void
  onCloseAriaLabel: string
  // Omit both to fall back to ChatPanel's own default "Сообщения" title
  // (the order page's chat doesn't show a name/avatar header, since the
  // order itself already identifies who this is).
  name?: string
  photo?: string | null
  headerAction?: React.ReactNode
  refetchTrigger?: number
  onOtherPartyOnlineChange?: (online: boolean) => void
  onPreviewChange?: (preview: string | null) => void
  onAttachmentSent?: () => void
  webApp: TelegramWebApp | null
  // Stays mounted but visually hidden instead of unmounting — the order
  // page needs this so its collapsed CTA row's online-dot/message preview
  // keep updating live off the same ChatPanel instance's open websocket.
  // The two client-list pages never pass this; they simply don't render
  // this component at all while there's no open chat.
  hidden?: boolean
}

// Fullscreen in-Mini-App chat overlay — same shell (back button, optional
// avatar+name header, viewport expand, background scroll lock) reused by
// the order page, the orders-list client view, and the Clients page, so a
// change here applies everywhere instead of needing three separate edits.
export default function ChatOverlay({
  conversationId, currentUserId, onClose, onCloseAriaLabel,
  name, photo, headerAction, refetchTrigger,
  onOtherPartyOnlineChange, onPreviewChange, onAttachmentSent, webApp, hidden = false,
}: Props) {
  // Mini App opens at half-height by default — expand once the overlay
  // is actually visible.
  useEffect(() => {
    if (hidden || !webApp) return
    try { webApp.expand() } catch { /* older clients */ }
  }, [hidden, webApp])

  // Lock the body scroll while the overlay is up so a swipe doesn't drag
  // the page underneath it.
  useEffect(() => {
    if (hidden) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [hidden])

  return (
    <div
      data-testid="chat-overlay"
      className={hidden ? "hidden" : "fixed inset-0 z-50 bg-white flex flex-col h-[100dvh]"}
    >
      <ChatPanel
        conversationId={conversationId}
        currentUserId={currentUserId}
        refetchTrigger={refetchTrigger}
        onOtherPartyOnlineChange={onOtherPartyOnlineChange}
        onPreviewChange={onPreviewChange}
        onAttachmentSent={onAttachmentSent}
        leadingHeaderAction={(
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0 [-webkit-tap-highlight-color:transparent]"
            aria-label={onCloseAriaLabel}
          >
            <Icon name="arrow_back" size={22} />
          </button>
        )}
        titleOverride={name ? (
          <div className="flex-1 min-w-0 flex items-center gap-2.5">
            <Avatar
              src={photo ?? null}
              name={name}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex-shrink-0"
              letterClassName="text-white font-bold text-xs"
            />
            <h1 className="font-semibold text-gray-900 truncate">{name}</h1>
          </div>
        ) : undefined}
        headerAction={headerAction}
      />
    </div>
  )
}
