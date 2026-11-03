export const LEGAL_DOCUMENT_KINDS = ["terms", "privacy", "data_consent"] as const
export type LegalDocumentKind = typeof LEGAL_DOCUMENT_KINDS[number]
export type LegalLanguage = "ru" | "en" | "kk"
export type LegalDocument = {
  version: string
  language: LegalLanguage
  text: string
  published_at: string
}
export type LegalDocuments = Record<LegalDocumentKind, LegalDocument | null>
export type LegalConsents = Record<LegalDocumentKind, {
  version: string
  language: LegalLanguage
  accepted: true
}>

// Callers show translated copy and fetch current documents for reacceptance.
export class LegalConsentError extends Error {
  constructor() {
    super("Legal documents must be reviewed and accepted again.")
    this.name = "LegalConsentError"
  }
}

export function checkLegalConsentError(error: Record<string, unknown>): void {
  if ("legal_consents" in error) throw new LegalConsentError()
}
