// ─── Anonymous website support chat: REST history/send + WebSocket live push ──
//
// Backend contract (apps.support_chat):
//   POST /api/v1/support-chat/messages/                  { session_id?, text } → { session_id, message }
//   GET  /api/v1/support-chat/{session_id}/messages/      → SupportChatMessage[]
//   WS   /ws/support-chat/{session_id}/                   recv-only: staff replies
//
// No auth at all — unlike lib/chat.ts, there's no JWT in play. The only
// "credential" is session_id itself, minted by the backend on first
// send and persisted in localStorage so the widget resumes the same
// thread across reloads.
//
// SSR-safe — only call from "use client" components.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
const SESSION_STORAGE_KEY = "support_chat_session_id"

// Backend enforces the same cap (apps.support_chat.models.
// SUPPORT_CHAT_MESSAGE_MAX_LENGTH) — mirrored here so the input can
// cut a paste off client-side instead of only failing after submit.
export const SUPPORT_CHAT_MESSAGE_MAX_LENGTH = 2000

export interface SupportChatMessage {
  id: number
  sender: "visitor" | "staff"
  text: string
  created_at: string
}

export function getStoredSupportChatSessionId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(SESSION_STORAGE_KEY)
}

function storeSupportChatSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
}

// For a "not you? start a new chat" control — a shared/public computer
// must not silently resume the previous visitor's thread forever, and
// the backend has no session TTL of its own to fall back on.
export function clearStoredSupportChatSessionId(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_STORAGE_KEY)
}

export async function fetchSupportChatHistory(sessionId: string): Promise<SupportChatMessage[]> {
  const res = await fetch(`${API_BASE}/support-chat/${encodeURIComponent(sessionId)}/messages/`)
  if (!res.ok) {
    // A stored session_id the backend no longer recognizes (e.g. wiped
    // test data) shouldn't crash the widget — treat as a fresh, empty
    // thread rather than surfacing an error.
    if (res.status === 404) return []
    throw new Error("Failed to fetch support chat history")
  }
  return res.json()
}

export async function sendSupportChatMessage(
  text: string,
  sessionId: string | null,
): Promise<{ session_id: string; message: SupportChatMessage }> {
  const res = await fetch(`${API_BASE}/support-chat/messages/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sessionId ? { session_id: sessionId, text } : { text }),
  })
  if (!res.ok) {
    throw new Error("Failed to send message")
  }
  const data = await res.json()
  storeSupportChatSessionId(data.session_id)
  return data
}

function deriveWsBase(): string {
  // Convert HTTP API base → WS origin (drop /api/v1 suffix). Mirrors
  // lib/chat.ts's deriveWsBase — duplicated rather than shared since
  // it's the only other WS user and this keeps each module self-
  // contained.
  const u = new URL(API_BASE)
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:"
  u.pathname = ""
  u.search = ""
  return u.toString().replace(/\/$/, "")
}

export interface SupportChatConnection {
  close: () => void
}

// 4004 = backend's SupportChatConsumer closing because session_id
// doesn't exist — retrying changes nothing (see apps/support_chat/
// consumers.py), unlike a dropped connection or server restart.
const WS_PERMANENT_CLOSE_CODES = [4004]

const WS_RECONNECT_MAX_ATTEMPTS = 8
const WS_RECONNECT_BASE_DELAY_MS = 1000
const WS_RECONNECT_MAX_DELAY_MS = 15000

export function connectSupportChat(
  sessionId: string,
  handlers: {
    onMessage: (msg: SupportChatMessage) => void
    onOpen?: () => void
    onClose?: (code: number) => void
    onError?: () => void
  },
): SupportChatConnection {
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
    reconnectTimer = setTimeout(connect, delay)
  }

  const connect = () => {
    if (closed) return
    const url = `${deriveWsBase()}/ws/support-chat/${encodeURIComponent(sessionId)}/`
    ws = new WebSocket(url)

    ws.onopen = () => {
      reconnectAttempt = 0
      handlers.onOpen?.()
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as SupportChatMessage
        handlers.onMessage(msg)
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

  connect()

  return {
    close: () => {
      closed = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (ws) {
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
