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
import { authFetch, firstErrorMessage, getFreshAccessToken } from "./api"

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
    // Empty fallback on purpose — forward backend detail when given,
    // otherwise let the caller show its own translated message instead
    // of a hardcoded one.
    throw new Error(err.detail || "")
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
    // `err.detail` alone misses attachment validation errors (size/MIME
    // type), which come back field-keyed (e.g. {"files": ["..."]}).
    throw new Error(err.detail || firstErrorMessage(err) || "Failed to send the message")
  }
  return res.json()
}

// Close code 4003 means the backend checked and this user has no access
// to the conversation — retrying with a fresh token changes nothing, so
// it's the only code that shouldn't trigger a reconnect. Everything else
// (a dropped connection, a server restart, even 4001 stale-token — the
// next attempt refreshes the token first) is worth retrying.
const WS_PERMANENT_CLOSE_CODES = [4003]

const WS_RECONNECT_MAX_ATTEMPTS = 8
const WS_RECONNECT_BASE_DELAY_MS = 1000
const WS_RECONNECT_MAX_DELAY_MS = 15000

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
  let reconnectAttempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const scheduleReconnect = () => {
    if (closed) return
    if (reconnectAttempt >= WS_RECONNECT_MAX_ATTEMPTS) {
      handlers.onError?.()
      return
    }
    const delay = Math.min(
      WS_RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt,
      WS_RECONNECT_MAX_DELAY_MS,
    )
    reconnectAttempt += 1
    reconnectTimer = setTimeout(() => { void connect() }, delay)
  }

  // Refresh the access token if it's near expiry BEFORE opening the
  // socket — WS handshakes aren't covered by authFetch's 401-retry,
  // so a stale token would mean a rejected handshake + fallback,
  // not a transparent retry. Returning the controller synchronously
  // preserves the existing API; close() handles the "ws not yet
  // created" case via the `closed` flag.
  const connect = async () => {
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
      reconnectAttempt = 0
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
      if (!closed && !WS_PERMANENT_CLOSE_CODES.includes(event.code)) {
        scheduleReconnect()
      }
    }
  }

  void connect()

  return {
    send: (text: string) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return false
      ws.send(JSON.stringify({ text }))
      return true
    },
    close: () => {
      closed = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
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
