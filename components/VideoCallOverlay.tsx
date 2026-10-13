"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import Icon from "@/components/Icon"

// Loaded from the self-hosted Jitsi domain itself (not npm) — the
// External API script must come from that server, so there's no real
// savings from the @jitsi/react-sdk wrapper package. See the video
// call implementation plan for why this domain is self-hosted rather
// than the public meet.jit.si.
interface JitsiMeetExternalAPIInstance {
  addListener: (event: string, handler: () => void) => void
  dispose: () => void
}

interface JitsiMeetExternalAPIConstructor {
  new (domain: string, options: {
    roomName: string
    jwt: string
    parentNode: HTMLElement
    userInfo: { displayName: string }
    width: string
    height: string
  }): JitsiMeetExternalAPIInstance
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiMeetExternalAPIConstructor
  }
}

const SCRIPT_ELEMENT_ID = "jitsi-external-api-script"

interface Props {
  jitsiDomain: string
  roomName: string
  jwt: string
  displayName: string
  onEnd: () => void
}

// Fullscreen in-call view — modeled on ChatOverlay.tsx's shell (fixed
// fullscreen, scroll-lock), but fully unmounts on close instead of
// staying mounted-but-hidden: a call has no CTA-collapse preview state
// to keep alive in the background the way chat's online-dot/preview do.
export default function VideoCallOverlay({ jitsiDomain, roomName, jwt, displayName, onEnd }: Props) {
  const t = useTranslations("Calls")
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<JitsiMeetExternalAPIInstance | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const init = () => {
      if (cancelled || !containerRef.current) return
      const JitsiMeetExternalAPI = window.JitsiMeetExternalAPI
      if (!JitsiMeetExternalAPI) {
        setLoadError(true)
        return
      }
      const api = new JitsiMeetExternalAPI(jitsiDomain, {
        roomName,
        jwt,
        parentNode: containerRef.current,
        userInfo: { displayName },
        width: "100%",
        height: "100%",
      })
      apiRef.current = api
      setConnecting(false)
      // Either event means the local participant left — treat both as
      // "the call is over" for this client, matching the client-
      // reported end-of-call design (see apps.calls.views.EndCallView).
      api.addListener("videoConferenceLeft", onEnd)
      api.addListener("readyToClose", onEnd)
    }

    let script = document.getElementById(SCRIPT_ELEMENT_ID) as HTMLScriptElement | null
    let attachedLoadListener: HTMLScriptElement | null = null
    if (window.JitsiMeetExternalAPI) {
      init()
    } else if (script) {
      script.addEventListener("load", init)
      attachedLoadListener = script
    } else {
      script = document.createElement("script")
      script.id = SCRIPT_ELEMENT_ID
      script.src = `https://${jitsiDomain}/external_api.js`
      script.async = true
      script.onload = init
      script.onerror = () => setLoadError(true)
      document.body.appendChild(script)
    }

    return () => {
      cancelled = true
      document.body.style.overflow = previousOverflow
      attachedLoadListener?.removeEventListener("load", init)
      apiRef.current?.dispose()
      apiRef.current = null
    }
    // onEnd is intentionally omitted — including it would tear down and
    // re-init the Jitsi iframe mid-call whenever the parent re-renders
    // with a new onEnd identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jitsiDomain, roomName, jwt, displayName])

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col h-[100dvh]">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 flex-shrink-0">
        <span className="text-white text-sm font-medium truncate">{displayName}</span>
        <button
          type="button"
          onClick={onEnd}
          className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors [-webkit-tap-highlight-color:transparent]"
          aria-label={t("close")}
        >
          <Icon name="close" size={22} />
        </button>
      </div>
      <div className="relative flex-1 min-h-0">
        {loadError ? (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm px-6 text-center">
            {t("connectError")}
          </div>
        ) : (
          <>
            {connecting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-white/70 text-sm">{t("connecting")}</span>
              </div>
            )}
            <div ref={containerRef} className="absolute inset-0" />
          </>
        )}
      </div>
    </div>
  )
}
