"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { fetchPublicSettings } from "@/lib/api"
import { LEGAL_DOCUMENT_KINDS, type LegalConsents, type LegalDocuments } from "@/lib/legalConsent"
import Icon from "./Icon"
import MarkdownText from "./MarkdownText"

type Status = "loading" | "ready" | "error"

interface Props {
  open: boolean
  onConsent: (consents: LegalConsents) => void
  error?: string
  onCancel: () => void
}

// Render the exact versioned documents returned by the server. No acceptance
// is inferred from opening this dialog, country selection, or legacy flags.
export default function DataConsentModal({ open, ...props }: Props) {
  const locale = useLocale()
  if (!open) return null
  return <ConsentDialog key={locale} {...props} locale={locale} />
}

function ConsentDialog({ onConsent, onCancel, error, locale }: Omit<Props, "open"> & { locale: string }) {
  const [status, setStatus] = useState<Status>("loading")
  const [documents, setDocuments] = useState<LegalDocuments | undefined>()
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const [retry, setRetry] = useState(0)
  const t = useTranslations("DataConsentModal")

  useEffect(() => {
    let active = true
    fetchPublicSettings(locale)
      .then((settings) => {
        if (!active) return
        setDocuments(settings.legal_documents)
        setStatus("ready")
      })
      .catch(() => { if (active) setStatus("error") })
    return () => { active = false }
  }, [locale, retry])

  const handleRetry = () => {
    setStatus("loading")
    setDocuments(undefined)
    setAccepted({})
    setRetry(value => value + 1)
  }
  const available = status === "ready" && LEGAL_DOCUMENT_KINDS.every(kind => {
    const document = documents?.[kind]
    return document && document.text.trim() && document.version.length === 64
      && ["ru", "en", "kk"].includes(document.language)
  })
  const canAccept = available && LEGAL_DOCUMENT_KINDS.every(kind => accepted[kind])
  const handleConsent = () => {
    if (!canAccept || !documents) return
    const payload = {} as LegalConsents
    for (const kind of LEGAL_DOCUMENT_KINDS) {
      const document = documents[kind]!
      payload[kind] = { version: document.version, language: document.language, accepted: true }
    }
    onConsent(payload)
  }

  // Lock body scroll while the modal is open so a swipe doesn't drag
  // the register page underneath it.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [])

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative min-h-full flex items-center justify-center p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="legal-consent-title" className="relative w-full max-w-lg my-4 bg-white rounded-2xl shadow-xl flex flex-col max-h-[calc(100vh-2rem)]">
          {/* Header — fixed at top */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-3">
            <div className="flex-1">
              <h2 id="legal-consent-title" className="text-lg font-bold text-gray-900">
                {t("title")}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {t("subtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label={t("close")}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 [-webkit-tap-highlight-color:transparent]"
            >
              <Icon name="close" size={22} />
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}
            {status === "loading" && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {status === "error" && (
              <div>
                <p className="text-sm text-red-600 mb-3">
                  {t("loadError")}
                </p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  {t("retry")}
                </button>
              </div>
            )}
            {status === "ready" && !available && (
              <p className="text-sm text-gray-500">{t("notPublished")}</p>
            )}
            {status === "ready" && available && LEGAL_DOCUMENT_KINDS.map(kind => {
              const document = documents![kind]!
              return (
                <section key={kind} className="mb-6">
                  <h3 className="font-semibold mb-1">{t(kind)}</h3>
                  <p className="text-xs text-gray-500 mb-3">{t("documentLanguage", { language: document.language.toUpperCase() })}</p>
                  <MarkdownText text={document.text} className="text-sm" />
                  <label className="flex items-start gap-3 mt-4 text-sm font-medium">
                    <input type="checkbox" checked={!!accepted[kind]}
                      onChange={event => setAccepted(previous => ({ ...previous, [kind]: event.target.checked }))}
                      className="mt-1 accent-indigo-600" />
                    {t(`accept_${kind}`)}
                  </label>
                </section>
              )
            })}
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
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleConsent}
              disabled={!canAccept}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("consent")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
