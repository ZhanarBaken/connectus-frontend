import type { LegalConsents, LegalDocuments } from "@/lib/legalConsent"
export const legalDocuments: LegalDocuments = {
  terms: { version: "a".repeat(64), language: "ru", text: "Existing terms text", published_at: "2026-11-03T00:00:00Z" },
  privacy: { version: "b".repeat(64), language: "ru", text: "Existing privacy text", published_at: "2026-11-03T00:00:00Z" },
  data_consent: { version: "c".repeat(64), language: "ru", text: "Согласен на обработку данных.", published_at: "2026-11-03T00:00:00Z" },
}
export const legalConsents: LegalConsents = {
  terms: { version: "a".repeat(64), language: "ru", accepted: true },
  privacy: { version: "b".repeat(64), language: "ru", accepted: true },
  data_consent: { version: "c".repeat(64), language: "ru", accepted: true },
}
