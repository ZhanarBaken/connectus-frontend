"use client"

import { useId, useState } from "react"
import { useTranslations } from "next-intl"
import { useCall } from "@/components/CallProvider"
import Icon from "@/components/Icon"

interface Props {
  conversationId: number
  otherPartyName: string
  // Gates the button — mirrors ChatPanel's own online-dot logic, so
  // it's disabled exactly when that dot shows offline.
  otherPartyOnline: boolean
}

export default function StartCallButton({ conversationId, otherPartyName, otherPartyOnline }: Props) {
  const t = useTranslations("Calls")
  const { startCall } = useCall()
  const hintId = useId()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    setError(false)
    try {
      await startCall(conversationId, otherPartyName)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 pt-3 flex-shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !otherPartyOnline}
        title={otherPartyOnline ? t("startCall") : t("otherPartyOffline")}
        aria-describedby={hintId}
        aria-busy={loading}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors [-webkit-tap-highlight-color:transparent]"
      >
        <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center">
        {loading ? (
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Icon name="videocam" size={18} />
        )}
        </span>
        {t("startCall")}
      </button>
      <p id={hintId} role="status" className={`min-h-4 text-xs mt-1 ${error ? "text-red-600" : "text-gray-500"}`}>
        {error ? t("connectError") : !otherPartyOnline ? t("otherPartyOffline") : ""}
      </p>
    </div>
  )
}
