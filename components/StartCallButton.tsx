"use client"

import { useState } from "react"
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
    <div className="px-4 sm:px-6 pt-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !otherPartyOnline}
        title={otherPartyOnline ? t("startCall") : t("otherPartyOffline")}
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors [-webkit-tap-highlight-color:transparent]"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Icon name="videocam" size={18} />
        )}
        {t("startCall")}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{t("connectError")}</p>}
    </div>
  )
}
