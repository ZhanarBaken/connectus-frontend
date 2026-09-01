"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { startCall as startCallApi, endCall as endCallApi, getFreshAccessToken } from "@/lib/api"
import Icon from "@/components/Icon"
import VideoCallOverlay from "@/components/VideoCallOverlay"

interface ActiveCall {
  conversationId: number
  callSessionId: number
  roomName: string
  jitsiDomain: string
  jwt: string
  displayName: string
}

interface IncomingCall {
  conversationId: number
  callSessionId: number
  callerName: string
}

interface CallContextValue {
  // Starts (or joins, if the other side already started one) a call
  // for this conversation and opens the in-call overlay. Used both by
  // StartCallButton and by this provider's own "accept" handler.
  startCall: (conversationId: number, otherPartyName: string) => Promise<void>
}

const CallContext = createContext<CallContextValue | null>(null)

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error("useCall must be used within CallProvider")
  return ctx
}

// A rung-but-unanswered call auto-dismisses after this long — there's
// no signal telling the callee the caller hung up before pickup (v1
// scope, see the video call plan), so without a timeout the ring
// modal would otherwise stay up forever.
const RING_TIMEOUT_MS = 45_000

function buildNotificationsWsUrl(token: string): string | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return null
  try {
    const url = new URL(apiUrl)
    const scheme = url.protocol === "https:" ? "wss:" : "ws:"
    return `${scheme}//${url.host}/ws/notifications/?token=${encodeURIComponent(token)}`
  } catch {
    return null
  }
}

interface CallIncomingPayload {
  kind?: string
  payload?: {
    conversation_id?: number
    call_session_id?: number
    room_name?: string
    caller_name?: string
  }
}

// Mounted once at the root layout, alongside Header/SupportChatWidget.
// Owns a dedicated WebSocket to the per-user notifications channel —
// separate from NotificationBell's own connection (deliberately not
// shared/extracted for this pass, to avoid touching that already-
// working component; see the video call implementation plan). Renders
// the incoming-call ring modal and the in-call overlay globally, so
// either one survives client-side navigation while a call is live.
export default function CallProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Calls")
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState(false)
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Read inside the WS onmessage closure below, which is created once
  // (effect has an empty dep array) — a plain `activeCall` read there
  // would always see the value from the first render, not the current
  // one, so a ref is mirrored on every state change instead.
  const activeCallRef = useRef<ActiveCall | null>(null)
  useEffect(() => { activeCallRef.current = activeCall }, [activeCall])

  const clearRingTimer = () => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current)
      ringTimerRef.current = null
    }
  }

  useEffect(() => {
    let active = true
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let backoffMs = 1_000

    const connect = async () => {
      let token: string | null
      try {
        token = await getFreshAccessToken()
      } catch {
        return
      }
      if (!active || !token) return

      const url = buildNotificationsWsUrl(token)
      if (!url) return

      try {
        ws = new WebSocket(url)
      } catch {
        return
      }

      ws.onopen = () => { backoffMs = 1_000 }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as CallIncomingPayload
          if (data.kind !== "call.incoming" || !data.payload) return
          // Already on a call — don't interrupt it with a ring for a
          // second one. No "busy" signal goes back to the other
          // caller (v1 scope); this just avoids surfacing a stale
          // ring modal for a call that may be long over by the time
          // the current one ends.
          if (activeCallRef.current) return
          const { conversation_id, call_session_id, room_name, caller_name } = data.payload
          if (!conversation_id || !call_session_id || !room_name) return
          clearRingTimer()
          setAccepting(false)
          setAcceptError(false)
          setIncomingCall({
            conversationId: conversation_id,
            callSessionId: call_session_id,
            callerName: caller_name || t("unknownCaller"),
          })
          ringTimerRef.current = setTimeout(() => setIncomingCall(null), RING_TIMEOUT_MS)
        } catch {
          // ignore malformed payloads
        }
      }

      ws.onclose = () => {
        ws = null
        if (!active) return
        const delay = Math.min(backoffMs, 60_000)
        backoffMs = Math.min(backoffMs * 2, 60_000)
        reconnectTimer = setTimeout(connect, delay)
      }

      ws.onerror = () => { /* onclose drives the reconnect */ }
    }

    void connect()

    return () => {
      active = false
      clearRingTimer()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) {
        ws.onclose = null
        ws.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t() is stable enough for this fallback string
  }, [])

  // Deliberately doesn't swallow errors — StartCallButton and this
  // provider's own handleAccept below each need to know if the call
  // failed to start, so each catches this itself and shows its own
  // error UI in the right place (inline on the button vs. in the ring
  // modal).
  const startCall = useCallback(async (conversationId: number, otherPartyName: string) => {
    const res = await startCallApi(conversationId)
    clearRingTimer()
    setIncomingCall(null)
    setActiveCall({
      conversationId,
      callSessionId: res.call_session_id,
      roomName: res.room_name,
      jitsiDomain: res.jitsi_domain,
      jwt: res.jwt,
      displayName: otherPartyName,
    })
  }, [])

  const handleAccept = async () => {
    if (!incomingCall) return
    setAccepting(true)
    setAcceptError(false)
    try {
      await startCall(incomingCall.conversationId, incomingCall.callerName)
    } catch {
      setAcceptError(true)
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = () => {
    clearRingTimer()
    setIncomingCall(null)
  }

  const handleCallEnd = useCallback(() => {
    setActiveCall((current) => {
      if (current) {
        // Best-effort — a failed "end" POST just means ended_at stays
        // null server-side (see apps.calls.views.EndCallView's own
        // docstring), not something worth blocking the UI on. Still
        // worth a console line so a real pattern of failures is
        // visible during development/staging rather than fully silent.
        endCallApi(current.callSessionId).catch((err) => {
          console.warn("Failed to report call end", err)
        })
      }
      return null
    })
  }, [])

  return (
    <CallContext.Provider value={{ startCall }}>
      {children}

      {incomingCall && !activeCall && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <Icon name="videocam" size={28} className="text-indigo-600" />
            </div>
            <p className="text-sm text-gray-500 mb-1">{t("incomingCall")}</p>
            <p className="text-lg font-semibold text-gray-900 mb-6 truncate">{incomingCall.callerName}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDecline}
                disabled={accepting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t("decline")}
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {accepting ? t("connecting") : t("accept")}
              </button>
            </div>
            {acceptError && (
              <p className="text-xs text-red-600 mt-3">{t("connectError")}</p>
            )}
          </div>
        </div>
      )}

      {activeCall && (
        <VideoCallOverlay
          jitsiDomain={activeCall.jitsiDomain}
          roomName={activeCall.roomName}
          jwt={activeCall.jwt}
          displayName={activeCall.displayName}
          onEnd={handleCallEnd}
        />
      )}
    </CallContext.Provider>
  )
}
