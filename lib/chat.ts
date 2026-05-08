// ─── Real chat: REST history + WebSocket live updates ──────────────────────
//
// Backend contract:
//   GET  /api/v1/chat/{conversation_id}/messages/   → cursor-paginated DRF list
//   WS   /ws/chat/{conversation_id}/?token=<JWT>    → bidirectional
//        send:    { text: string }
//        recv:    { id, sender_id, sender_email, text, created_at }
//
// SSR-safe — only call from "use client" components.

import { ChatAttachment, ChatMessage } from "@/types"
import { authFetch, getFreshAccessToken } from "./api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export interface Conversation {
  id: number
  mentor: number
  student: number
  created_at: string
  closed_at: string | null
  is_active: boolean
}

export async function fetchConversation(conversationId: number): Promise<Conversation> {
  const res = await authFetch(`${API_BASE}/chat/${conversationId}/`)
  if (!res.ok) {
    throw new Error("Не удалось загрузить чат")
  }
  return res.json()
}

export async function closeConversation(conversationId: number): Promise<{ closed_at: string }> {
  const res = await authFetch(`${API_BASE}/chat/${conversationId}/close/`, {
    method: "POST",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось закрыть чат")
  }
  return res.json()
}

function deriveWsBase(): string {
  // Convert HTTP API base → WS origin (drop /api/v1 suffix)
  const u = new URL(API_BASE)
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:"
  u.pathname = ""
  u.search = ""
  return u.toString().replace(/\/$/, "")
}

interface DRFListResponse<T> {
  next: string | null
  previous: string | null
  results: T[]
}

/**
 * Load chat history for a conversation. Backend returns the 50 most
 * recent messages newest-first (cursor pagination on `-created_at`);
 * we reverse them client-side so the UI renders chronologically with
 * the latest message at the bottom — matching the WhatsApp / Telegram
 * convention. Older history is loaded later via `next` cursor.
 */
export async function fetchChatMessages(conversationId: number): Promise<ChatMessage[]> {
  const res = await authFetch(`${API_BASE}/chat/${conversationId}/messages/`)
  if (!res.ok) {
    if (res.status === 404) return []
    throw new Error("Failed to fetch chat history")
  }
  const data: DRFListResponse<ChatMessage> | ChatMessage[] = await res.json()
  const list = Array.isArray(data) ? data : (data.results ?? [])
  // Reverse: backend gives newest-first, UI wants oldest-first (top → bottom).
  return list.slice().reverse()
}

export interface ChatConnection {
  send: (text: string) => boolean
  close: () => void
}

interface WsMessageEvent {
  id: number
  sender_id: number | null
  sender_email: string | null
  is_system?: boolean
  text: string
  created_at: string
  attachments?: ChatAttachment[]
}

/**
 * Open a WebSocket to a conversation. The backend echoes every message
 * (including the sender's own) so the UI should treat the WS as the single
 * source of truth — don't optimistically append, just call send() and wait
 * for onMessage to fire.
 *
 * Returns a connection handle. Call close() when leaving the page.
 */
/**
 * Send a message with optional file attachments via HTTP POST.
 * WS will broadcast the message to all participants including sender.
 */
export async function sendChatMessage(
  conversationId: number,
  text: string,
  files?: File[],
): Promise<ChatMessage> {
  const formData = new FormData()
  if (text) formData.append("text", text)
  if (files) {
    for (const f of files) formData.append("files", f)
  }
  const res = await authFetch(`${API_BASE}/chat/${conversationId}/messages/`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Не удалось отправить сообщение")
  }
  return res.json()
}

export function connectChat(
  conversationId: number,
  handlers: {
    onMessage: (msg: ChatMessage) => void
    onOpen?: () => void
    onClose?: (code: number) => void
    onError?: () => void
    onServerError?: (err: string) => void
  },
): ChatConnection {
  let ws: WebSocket | null = null
  let closed = false

  // Refresh the access token if it's near expiry BEFORE opening the
  // socket — WS handshakes aren't covered by authFetch's 401-retry,
  // so a stale token would mean a rejected handshake + fallback,
  // not a transparent retry. Returning the controller synchronously
  // preserves the existing API; close() handles the "ws not yet
  // created" case via the `closed` flag.
  ;(async () => {
    let token: string | null
    try {
      token = await getFreshAccessToken()
    } catch {
      // refreshAccessToken redirects to /auth/login on hard fail;
      // surface as an error here so the caller can stop spinning.
      handlers.onError?.()
      return
    }
    if (closed) return
    if (!token) {
      handlers.onError?.()
      return
    }

    const url = `${deriveWsBase()}/ws/chat/${conversationId}/?token=${encodeURIComponent(token)}`
    ws = new WebSocket(url)

    ws.onopen = () => {
      handlers.onOpen?.()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // Backend may send {error: '...'} when the message is rejected (e.g. closed chat)
        if (data && typeof data.error === "string") {
          handlers.onServerError?.(data.error)
          return
        }
        const msg = data as WsMessageEvent
        handlers.onMessage({
          id: msg.id,
          sender: msg.sender_id,
          sender_email: msg.sender_email,
          is_system: msg.is_system,
          text: msg.text,
          created_at: msg.created_at,
          attachments: msg.attachments,
        })
      } catch {
        // ignore malformed payloads
      }
    }

    ws.onerror = () => {
      handlers.onError?.()
    }

    ws.onclose = (event) => {
      handlers.onClose?.(event.code)
    }
  })()

  return {
    send: (text: string) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return false
      ws.send(JSON.stringify({ text }))
      return true
    },
    close: () => {
      closed = true
      if (ws) {
        // Detach handlers so a delayed close event doesn't fire callbacks
        // after the component has unmounted.
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close()
        }
        ws = null
      }
    },
  }
}
