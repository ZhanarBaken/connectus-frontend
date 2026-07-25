"use client"

import { useEffect, useState } from "react"
import { useLocale } from "next-intl"
import { fetchPublicSettings } from "@/lib/api"
import Icon from "./Icon"
import MarkdownText from "./MarkdownText"

type Status = "loading" | "ready" | "error"

interface Props {
  open: boolean
  onConsent: () => void
  onCancel: () => void
}

// Modal shown before any account is created so the user gives explicit,
// informed consent to personal-data processing — required by KZ Закон
// №94-V «О персональных данных и их защите». The consent text is
// editable in admin (SiteSettings.data_consent_text) and pulled lazily
// once the modal is first opened.
export default function DataConsentModal({ open, onConsent, onCancel }: Props) {
  const [status, setStatus] = useState<Status>("loading")
  const [text, setText] = useState("")
  const locale = useLocale()

  // Reset to "loading" on close so re-opening after a network error
   // gives the fetch another chance instead of being stuck on "error".
  useEffect(() => {
    if (!open) setStatus("loading")
  }, [open])

  useEffect(() => {
    if (!open || status !== "loading") return
    fetchPublicSettings(locale)
      .then((s) => {
        setText(s.data_consent_text)
        setStatus("ready")
      })
      .catch(() => setStatus("error"))
  }, [open, status, locale])

  const handleRetry = () => setStatus("loading")

  // Lock body scroll while the modal is open so a swipe doesn't drag
  // the register page underneath it.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg my-4 bg-white rounded-2xl shadow-xl flex flex-col max-h-[calc(100vh-2rem)]">
          {/* Header — fixed at top */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-3">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">
                Согласие на обработку персональных данных
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Прочитай и подтверди — этого требует Закон РК №94-V
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Закрыть"
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 [-webkit-tap-highlight-color:transparent]"
            >
              <Icon name="close" size={22} />
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {status === "loading" && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {status === "error" && (
              <div>
                <p className="text-sm text-red-600 mb-3">
                  Не удалось загрузить текст согласия.
                </p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Попробовать ещё раз
                </button>
              </div>
            )}
            {status === "ready" && text.trim() === "" && (
              <p className="text-sm text-gray-500">
                Текст согласия пока не опубликован. Обратись в поддержку.
              </p>
            )}
            {status === "ready" && text.trim() !== "" && (
              <MarkdownText text={text} className="text-sm" />
            )}
          </div>

          {/* Footer — sticky CTA. "Я даю согласие" is the load-bearing
              act of consent; it is intentionally a separate, explicit
              button (not bundled with a generic checkbox). */}
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={onConsent}
              disabled={status !== "ready" || text.trim() === ""}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Я даю согласие
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
