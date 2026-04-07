// ─── Messages (localStorage stopgap) ────────────────────────────────────────
// TODO: replace with real chat API when backend endpoint is ready.
// SSR-safe — returns [] / null on server.

export type SenderRole = "student" | "mentor"

export interface StoredMessage {
  id: string
  orderId: number
  senderRole: SenderRole
  content: string
  createdAt: string
}

export const MESSAGES_KEY = "chat_messages"
export const UNREAD_KEY = "chat_unread"

interface UnreadMap {
  [orderId: number]: { student: number; mentor: number }
}

function readAll(): StoredMessage[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(MESSAGES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(msgs: StoredMessage[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs))
}

function readUnread(): UnreadMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(UNREAD_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeUnread(map: UnreadMap) {
  if (typeof window === "undefined") return
  localStorage.setItem(UNREAD_KEY, JSON.stringify(map))
}

export function getOrderMessages(orderId: number): StoredMessage[] {
  return readAll()
    .filter((m) => m.orderId === orderId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function addMessage(input: Omit<StoredMessage, "id" | "createdAt">): StoredMessage {
  const msg: StoredMessage = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  const all = readAll()
  all.push(msg)
  writeAll(all)

  // Bump unread counter for the OTHER side
  const otherSide: SenderRole = input.senderRole === "mentor" ? "student" : "mentor"
  const unread = readUnread()
  if (!unread[input.orderId]) unread[input.orderId] = { student: 0, mentor: 0 }
  unread[input.orderId][otherSide] += 1
  writeUnread(unread)

  return msg
}

export function getLastMessage(orderId: number): StoredMessage | null {
  const msgs = getOrderMessages(orderId)
  return msgs.length > 0 ? msgs[msgs.length - 1] : null
}

export function markOrderRead(orderId: number, viewerRole: SenderRole) {
  const unread = readUnread()
  if (!unread[orderId]) return
  if (unread[orderId][viewerRole] === 0) return
  unread[orderId][viewerRole] = 0
  writeUnread(unread)
}

export function getOrderUnreadCount(orderId: number, viewerRole: SenderRole): number {
  return readUnread()[orderId]?.[viewerRole] ?? 0
}

export function getTotalUnreadCount(viewerRole: SenderRole): number {
  const unread = readUnread()
  return Object.values(unread).reduce((sum, c) => sum + (c[viewerRole] || 0), 0)
}
