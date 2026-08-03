"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { markChatRead } from "@/lib/api"
import { fetchChatMessages, connectChat, sendChatMessage, type ChatConnection } from "@/lib/chat"
import { translateFileUploadErrorMessage } from "@/lib/fileUploadErrors"
import { ChatMessage } from "@/types"
import Icon from "@/components/Icon"
import { Linkified } from "@/components/Linkified"

interface Props {
  conversationId: number
  currentUserId: number | null
  // Extra content rendered right under the header — e.g. the mentor's
  // "send a support invoice" form on the order page. Positioned here
  // (not by the caller, elsewhere on the page) so it stays reachable
  // when the Mini App chat goes fullscreen — see orders/[id]/page.tsx.
  headerAction?: React.ReactNode
  // Rendered before the title in the header row — e.g. the order page's
  // "back" button that collapses its fullscreen Mini App chat overlay.
  leadingHeaderAction?: React.ReactNode
  // Replaces the default "Сообщения" title/subtitle block — e.g. the
  // standalone /messages/[id] page shows the other party's avatar and
  // name there instead.
  titleOverride?: React.ReactNode
  // The order page's CTA-collapse row (shown before the chat is expanded
  // in the Mini App) previews the other party's presence and the latest
  // message — both live inside this component's own state, so mirror
  // them out.
  onOtherPartyOnlineChange?: (online: boolean) => void
  onPreviewChange?: (preview: string | null) => void
  // Bump (any value change) to force a message-history refetch — e.g.
  // after the order page's invoice form posts a system message that
  // the backend doesn't push over the websocket.
  refetchTrigger?: number
  // Fires after a file attachment is successfully sent — the backend
  // mirrors it into the order's OrderDocument list in the same request
  // (apps.chat.views.MessageListView.post), but that side effect isn't
  // reflected in this component's own state, so the caller (the order
  // page's Files sidebar) needs to know to refetch its own document list.
  onAttachmentSent?: () => void
}

// The actual chat UI (header, message list, input) — reusable between the
// order detail page (which wraps this in its own Mini-App fullscreen-
// overlay/CTA-collapse chrome) and the standalone /messages/[id] page
// (which doesn't need that chrome, since chat is the whole page there).
export default function ChatPanel({
  conversationId, currentUserId, headerAction, leadingHeaderAction, titleOverride,
  onOtherPartyOnlineChange, onPreviewChange, refetchTrigger, onAttachmentSent,
}: Props) {
  const t = useTranslations("Orders.Detail")
  const locale = useLocale()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatHistoryLoadError, setChatHistoryLoadError] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [otherPartyOnline, setOtherPartyOnline] = useState(false)
  const [chatSendError, setChatSendError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<ChatConnection | null>(null)
  const isFirstRefetchTrigger = useRef(true)

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  }

  // Open WebSocket + load history.
  useEffect(() => {
    let cancelled = false

    fetchChatMessages(conversationId)
      .then((history) => {
        if (!cancelled) setMessages(history)
      })
      .catch(() => {
        // Chat still tries to open (WS-only, no history) — but the user
        // must be able to tell "empty history" from "history failed to load".
        if (!cancelled) setChatHistoryLoadError(true)
      })

    markChatRead(conversationId).catch(() => {})

    const conn = connectChat(conversationId, {
      onOpen: () => setWsConnected(true),
      // Our own socket dropping (even before a reconnect kicks in)
      // means we no longer have a live signal about the other side
      // either — don't leave a stale "online" showing.
      onClose: () => { setWsConnected(false); setOtherPartyOnline(false) },
      onError: () => { setWsConnected(false); setOtherPartyOnline(false) },
      onPresenceChange: (online) => setOtherPartyOnline(online),
      onMessage: (msg) => {
        setMessages((prev) => {
          // De-dupe in case the message also came back via REST refetch
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      },
    })
    wsRef.current = conn

    return () => {
      cancelled = true
      conn.close()
      wsRef.current = null
      setWsConnected(false)
      // Our own socket is gone, so we no longer have a live signal about
      // the other party either — don't leave a stale "online" showing.
      setOtherPartyOnline(false)
    }
  }, [conversationId])

  // Pin scroll to the bottom on every change to the messages list,
  // including the very first hydration. Two rAFs: the first lets the
  // browser finish laying out freshly mounted message rows before we
  // read scrollHeight; the second survives reflows from heavier siblings
  // (e.g. the order page's sidebar) that lay out after this panel.
  useEffect(() => {
    if (!chatRef.current) return
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight
        }
      })
      ;(chatRef.current as HTMLDivElement & { _rAF2?: number })._rAF2 = id2
    })
    return () => {
      cancelAnimationFrame(id1)
      const node = chatRef.current as
        (HTMLDivElement & { _rAF2?: number }) | null
      if (node?._rAF2 !== undefined) {
        cancelAnimationFrame(node._rAF2)
      }
    }
  }, [messages])

  useEffect(() => {
    onOtherPartyOnlineChange?.(otherPartyOnline)
  }, [otherPartyOnline, onOtherPartyOnlineChange])

  useEffect(() => {
    if (refetchTrigger === undefined) return
    if (isFirstRefetchTrigger.current) {
      isFirstRefetchTrigger.current = false
      return
    }
    fetchChatMessages(conversationId).then(setMessages).catch(() => {})
  }, [refetchTrigger, conversationId])

  useEffect(() => {
    if (!onPreviewChange) return
    if (messages.length === 0) {
      onPreviewChange(null)
      return
    }
    const last = messages[messages.length - 1]
    const text = last.text?.trim() ?? ""
    if (text) {
      onPreviewChange(text)
    } else if (last.attachments?.length) {
      onPreviewChange(t("chatPreviewAttachment"))
    } else {
      onPreviewChange("—")
    }
  }, [messages, onPreviewChange, t])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newMessage.trim()
    const hasFiles = attachedFiles.length > 0
    if (!text && !hasFiles) return

    // If files attached — send via HTTP POST (WS doesn't support binary)
    // Otherwise use WS for instant delivery
    if (hasFiles) {
      setSending(true)
      setChatSendError("")
      try {
        await sendChatMessage(conversationId, text, attachedFiles)
        // WS will broadcast the message back — don't append manually
        setNewMessage("")
        setAttachedFiles([])
        onAttachmentSent?.()
      } catch (err: unknown) {
        // keep message/files so user can retry
        setChatSendError(
          err instanceof Error && err.message
            ? translateFileUploadErrorMessage(err.message, t)
            : t("chatSendError"),
        )
      } finally {
        setSending(false)
      }
    } else {
      if (!wsRef.current) return
      const ok = wsRef.current.send(text)
      if (ok) setNewMessage("")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // Max 3 files, 10MB each, PDF/JPEG/PNG only — matches
    // apps.chat.models.ATTACHMENT_MAX_MB/ATTACHMENT_ALLOWED_TYPES.
    let rejected: "type" | "size" | null = null
    const valid = files.filter((f) => {
      if (!["application/pdf", "image/jpeg", "image/png"].includes(f.type)) {
        rejected ??= "type"
        return false
      }
      if (f.size > 10 * 1024 * 1024) {
        rejected ??= "size"
        return false
      }
      return true
    })
    if (rejected === "type") {
      setChatSendError(t("fileTypeNotAllowed"))
    } else if (rejected === "size") {
      setChatSendError(t("chatFileTooLarge"))
    } else {
      setChatSendError("")
    }
    setAttachedFiles((prev) => [...prev, ...valid].slice(0, 3))
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <>
      {/* Chat header */}
      <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-50 flex-shrink-0 flex items-center gap-3">
        {leadingHeaderAction}
        {titleOverride ?? (
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900">{t("messagesTitle")}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t("messagesSubtitleOpen")}</p>
          </div>
        )}
        {/* Green only when the OTHER participant is actually here —
            showing it the moment *our own* socket connects (regardless
            of whether anyone's on the other end) was misleading. */}
        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full ${
          wsConnected && otherPartyOnline ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${wsConnected && otherPartyOnline ? "bg-green-500" : "bg-gray-400"}`} />
          {!wsConnected ? t("statusConnecting") : otherPartyOnline ? t("statusOnline") : t("statusOffline")}
        </span>
      </div>

      {headerAction}

      {/* Messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {chatHistoryLoadError ? (
          <div className="text-center py-8">
            <p className="text-red-600 text-sm mb-2">{t("chatHistoryError")}</p>
            <button
              type="button"
              onClick={() => {
                setChatHistoryLoadError(false)
                fetchChatMessages(conversationId)
                  .then(setMessages)
                  .catch(() => setChatHistoryLoadError(true))
              }}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {t("retry")}
            </button>
          </div>
        ) : messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">{t("startConversation")}</p>
          </div>
        )}
        {messages.map((msg) => {
          const isSystem = msg.is_system === true || msg.sender === null
          const isOwn = !isSystem && currentUserId !== null && msg.sender === currentUserId

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 max-w-[85%]">
                  <p className="text-xs text-gray-600 text-center leading-relaxed whitespace-pre-wrap break-words">
                    <Linkified text={msg.text} />
                  </p>
                  <p className="text-[10px] text-gray-400 text-center mt-1">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            )
          }

          const hasAttachments = msg.attachments && msg.attachments.length > 0

          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-1`}>
                {msg.text && (
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isOwn
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}>
                    <Linkified text={msg.text} />
                  </div>
                )}
                {hasAttachments && (
                  <div className="flex flex-col gap-1.5 mt-0.5">
                    {msg.attachments!.map((att) => {
                      const isImage = att.content_type.startsWith("image/")
                      const sizeLabel = att.size_bytes < 1024 * 1024
                        ? `${Math.round(att.size_bytes / 1024)} KB`
                        : `${(att.size_bytes / (1024 * 1024)).toFixed(1)} MB`

                      if (isImage) {
                        return (
                          <a
                            key={att.id}
                            href={att.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors max-w-[240px]"
                          >
                            <img
                              src={att.download_url}
                              alt={att.original_filename}
                              className="w-full max-h-[200px] object-cover"
                              loading="lazy"
                            />
                            <div className="px-2.5 py-1.5 bg-white flex items-center gap-1.5">
                              <Icon name="image" size={12} className="text-gray-400" />
                              <span className="text-xs text-gray-500 truncate">{att.original_filename}</span>
                              <span className="text-[10px] text-gray-300 ml-auto flex-shrink-0">{sizeLabel}</span>
                            </div>
                          </a>
                        )
                      }

                      return (
                        <a
                          key={att.id}
                          href={att.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors ${
                            isOwn
                              ? "border-indigo-400/30 bg-indigo-500/20 hover:bg-indigo-500/30"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isOwn ? "bg-white/20" : "bg-red-50"
                          }`}>
                            <Icon name="description" size={16} className={isOwn ? "text-white" : "text-red-500"} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${isOwn ? "text-white" : "text-gray-900"}`}>
                              {att.original_filename}
                            </p>
                            <p className={`text-[10px] ${isOwn ? "text-indigo-200" : "text-gray-400"}`}>
                              PDF · {sizeLabel}
                            </p>
                          </div>
                          <Icon name="download" size={16} className={isOwn ? "text-white/60" : "text-gray-400"} />
                        </a>
                      )
                    })}
                  </div>
                )}
                {/* A task's attached document — same preview treatment as
                    a plain chat attachment (image thumbnail, or a file
                    chip otherwise), just sourced from related_task
                    instead of msg.attachments. */}
                {msg.kind === "support_task" && msg.related_task?.document && (() => {
                  const doc = msg.related_task.document
                  const isImage = doc.content_type.startsWith("image/")
                  const sizeLabel = doc.size_bytes < 1024 * 1024
                    ? `${Math.round(doc.size_bytes / 1024)} KB`
                    : `${(doc.size_bytes / (1024 * 1024)).toFixed(1)} MB`
                  return isImage ? (
                    <a
                      href={doc.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors max-w-[240px] mt-0.5"
                    >
                      <img
                        src={doc.download_url}
                        alt={doc.original_filename}
                        className="w-full max-h-[200px] object-cover"
                        loading="lazy"
                      />
                      <div className="px-2.5 py-1.5 bg-white flex items-center gap-1.5">
                        <Icon name="image" size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-500 truncate">{doc.original_filename}</span>
                      </div>
                    </a>
                  ) : (
                    <a
                      href={doc.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors mt-0.5 ${
                        isOwn
                          ? "border-indigo-400/30 bg-indigo-500/20 hover:bg-indigo-500/30"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isOwn ? "bg-white/20" : "bg-red-50"
                      }`}>
                        <Icon name="description" size={16} className={isOwn ? "text-white" : "text-red-500"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isOwn ? "text-white" : "text-gray-900"}`}>
                          {doc.original_filename}
                        </p>
                        <p className={`text-[10px] ${isOwn ? "text-indigo-200" : "text-gray-400"}`}>
                          {sizeLabel}
                        </p>
                      </div>
                      <Icon name="download" size={16} className={isOwn ? "text-white/60" : "text-gray-400"} />
                    </a>
                  )
                })()}
                <span className="text-xs text-gray-300 px-1">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
        {chatSendError && (
          <p className="text-xs text-red-600 mb-2">{chatSendError}</p>
        )}
        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs text-gray-600">
                <Icon name={f.type === "application/pdf" ? "description" : "image"} size={14} className="text-gray-400" />
                <span className="max-w-[120px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          {/* Attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!wsConnected || attachedFiles.length >= 3}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
            title={t("attachTitle")}
          >
            <Icon name="attach_file" size={20} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t("messagePlaceholder")}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
            disabled={!wsConnected || sending}
          />
          <button
            type="submit"
            disabled={!wsConnected || sending || (!newMessage.trim() && attachedFiles.length === 0)}
            className="bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 flex-shrink-0"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="send" size={20} />
            )}
          </button>
        </form>
        <p className="text-xs text-gray-300 mt-2 text-center">
          {t("noContactsWarning")}
        </p>
      </div>
    </>
  )
}
