"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import Icon from "@/components/Icon"
import CallDialog from "@/components/CallDialog"

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
    lang: string
    configOverwrite: { deeplinking: { disabled: boolean } }
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
  const locale = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<JitsiMeetExternalAPIInstance | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    let failed = false
    let script: HTMLScriptElement | null = null
    const fail = () => {
      if (cancelled) return
      failed = true
      setLoadError(true)
      setConnecting(false)
      // A failed tag never fires load again. Let the next attempt download it.
      if (!window.JitsiMeetExternalAPI) script?.remove()
    }
    const timeout = setTimeout(fail, 20_000)

    const init = () => {
      if (cancelled || failed || apiRef.current || !containerRef.current) return
      clearTimeout(timeout)
      const JitsiMeetExternalAPI = window.JitsiMeetExternalAPI
      if (!JitsiMeetExternalAPI) {
        fail()
        return
      }
      const api = new JitsiMeetExternalAPI(jitsiDomain, {
        roomName,
        jwt,
        parentNode: containerRef.current,
        // The JWT carries our own name. displayName is the OTHER participant,
        // used only in this overlay's header, never as our Jitsi identity.
        lang: locale,
        // Keep mobile clients in this embedded call instead of opening an app.
        configOverwrite: { deeplinking: { disabled: true } },
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

    script = document.getElementById(SCRIPT_ELEMENT_ID) as HTMLScriptElement | null
    if (window.JitsiMeetExternalAPI) {
      init()
    } else {
      const isNew = !script
      if (!script) {
        script = document.createElement("script")
        script.id = SCRIPT_ELEMENT_ID
        script.src = `https://${jitsiDomain}/external_api.js`
        script.async = true
      }
      script.addEventListener("load", init)
      script.addEventListener("error", fail)
      if (isNew) document.body.appendChild(script)
    }

    return () => {
      cancelled = true
      clearTimeout(timeout)
      script?.removeEventListener("load", init)
      script?.removeEventListener("error", fail)
      apiRef.current?.dispose()
      apiRef.current = null
    }
    // onEnd is intentionally omitted — including it would tear down and
    // re-init the Jitsi iframe mid-call whenever the parent re-renders
    // with a new onEnd identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jitsiDomain, roomName, jwt, locale])

  return (
    <CallDialog label={t("videoCall")} onDismiss={onEnd} fullscreen>
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 flex-shrink-0">
        <span className="text-white text-sm font-medium min-w-0 truncate">{displayName}</span>
        <button
          type="button"
          onClick={onEnd}
          className="text-white/70 hover:text-white min-h-11 min-w-11 shrink-0 inline-flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors [-webkit-tap-highlight-color:transparent]"
          aria-label={t("close")}
        >
          <Icon name="close" size={22} />
        </button>
      </div>
      <div className="relative flex-1 min-h-0">
        {loadError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-white text-sm px-6 text-center">
            <p role="alert">{t("connectError")}</p>
            <button type="button" onClick={onEnd} className="min-h-11 rounded-xl border border-white/40 px-5 py-2.5 hover:bg-white/10">{t("backToChat")}</button>
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
    </CallDialog>
  )
}
