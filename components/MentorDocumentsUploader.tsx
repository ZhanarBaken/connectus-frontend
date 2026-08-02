"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { authFetch } from "@/lib/api"
import { translateFileUploadErrorMessage } from "@/lib/fileUploadErrors"
import Icon from "@/components/Icon"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export interface MentorDocument {
  id: number
  kind: string
  original_filename: string
  content_type: string
  size_bytes: number
  status: "pending" | "approved" | "rejected"
  review_note: string
  uploaded_at: string
  download_url: string
}

// Matches apps.mentors.models.DOCUMENT_ALLOWED_TYPES — the `accept`
// attribute on the file input only filters the OS picker dialog, it does
// NOT apply to drag-and-drop, so this needs its own explicit check there.
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"]

// Matches apps.mentors.models.MentorProfile.submission_errors() — only
// these two kinds actually block submission, the rest are optional.
const REQUIRED_DOCUMENT_KINDS = new Set(["diploma", "enrollment_certificate"])

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  // When provided, banned state is gated externally. Defaults to false.
  isBanned?: boolean
  // Notifies parent with the full document list on every change — the
  // parent needs the actual `kind`s, not just a count, to reproduce the
  // backend's real requirement (a diploma AND an enrollment certificate
  // specifically, not just "any document").
  onDocumentsChange?: (documents: MentorDocument[]) => void
}

// Inline uploader + list for mentor's verification documents, one compact
// slot per document kind (rather than a single type-picker + dropzone) so
// which documents are required is unambiguous at a glance.
// Shared between the /mentors/profile edit page and other mentor surfaces
// that need document management, so the upload/list/delete logic lives once.
export default function MentorDocumentsUploader({ isBanned = false, onDocumentsChange }: Props) {
  const t = useTranslations("Mentors.Documents")
  const tDoc = useTranslations("Onboarding.Mentor")
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const KIND_OPTIONS: { value: string; label: string }[] = [
    // Паспорт / виза убраны (не подтверждают поступление). Существующие
    // документы с этими kind конвертированы миграцией в `other`.
    { value: "diploma", label: tDoc("docDiploma") },
    { value: "enrollment_certificate", label: tDoc("docEnrollment") },
    { value: "university_id", label: tDoc("docUniversityId") },
    { value: "other", label: tDoc("docOther") },
  ]

  const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    pending: { label: t("statusPending"), className: "bg-yellow-50 text-yellow-700" },
    approved: { label: t("statusApproved"), className: "bg-green-50 text-green-700" },
    rejected: { label: t("statusRejected"), className: "bg-red-50 text-red-700" },
  }
  const [documents, setDocuments] = useState<MentorDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [uploadingKind, setUploadingKind] = useState<string | null>(null)
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await authFetch(`${BASE_URL}/mentors/documents/`)
        if (!res.ok) throw new Error(t("loadDocumentsError"))
        const data = await res.json()
        if (cancelled) return
        const list: MentorDocument[] = Array.isArray(data) ? data : data.results ?? []
        setDocuments(list)
        onDocumentsChange?.(list)
      } catch (e: unknown) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : t("loadErrorGeneric"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function uploadFile(kind: string, file: File) {
    // A second click/drop before the in-flight request resolves would
    // otherwise fire a duplicate POST for the same (or another) kind.
    if (uploadingKind) return
    // The picker's `accept` attribute only filters the OS dialog (and not
    // at all when the user picks "All files"), and drag-and-drop bypasses
    // it entirely — so both paths funnel through this one explicit check
    // instead of a round trip to the API.
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      setUploadErrors((prev) => ({ ...prev, [kind]: t("fileTypeNotAllowed") }))
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadErrors((prev) => ({ ...prev, [kind]: t("fileTooLarge") }))
      return
    }
    setUploadErrors((prev) => {
      if (!(kind in prev)) return prev
      const next = { ...prev }
      delete next[kind]
      return next
    })
    setUploadingKind(kind)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("kind", kind)
      const res = await authFetch(`${BASE_URL}/mentors/documents/`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const first = Object.values(err)[0]
        const raw = Array.isArray(first) ? String(first[0]) : String(err.detail || first || t("loadErrorGeneric"))
        throw new Error(translateFileUploadErrorMessage(raw, t))
      }
      const doc: MentorDocument = await res.json()
      setDocuments((prev) => {
        const next = [doc, ...prev]
        onDocumentsChange?.(next)
        return next
      })
    } catch (e: unknown) {
      setUploadErrors((prev) => ({ ...prev, [kind]: e instanceof Error ? e.message : t("loadErrorGeneric") }))
    } finally {
      setUploadingKind(null)
    }
  }

  function handleFileInputChange(kind: string, e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0]
    e.target.value = ""
    if (!chosen) return
    uploadFile(kind, chosen)
  }

  function handleDrop(kind: string, e: React.DragEvent) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (!dropped) return
    uploadFile(kind, dropped)
  }

  async function handleDelete(id: number) {
    if (!confirm(t("confirmDelete"))) return
    setDeletingId(id)
    try {
      const res = await authFetch(`${BASE_URL}/mentors/documents/${id}/`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || t("deleteError"))
      }
      setDocuments((prev) => {
        const next = prev.filter((d) => d.id !== id)
        onDocumentsChange?.(next)
        return next
      })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("deleteErrorGeneric"))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {KIND_OPTIONS.map((opt) => {
        const kindDocs = documents.filter((d) => d.kind === opt.value)
        const required = REQUIRED_DOCUMENT_KINDS.has(opt.value)
        const isUploading = uploadingKind === opt.value
        // Another kind's upload is in flight — only one can run at a time
        // (see the single-flight guard in uploadFile), so this slot should
        // read as disabled rather than silently no-op if clicked.
        const blockedByOtherUpload = uploadingKind !== null && !isUploading
        const slotError = uploadErrors[opt.value]

        return (
          <div key={opt.value} className="border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-1 mb-2">
              <p className="text-sm font-medium text-gray-700">{opt.label}</p>
              {required && <span className="text-red-400 text-sm leading-none">*</span>}
            </div>

            {kindDocs.length > 0 && (
              <div className="space-y-2 mb-2">
                {kindDocs.map((doc) => {
                  const badge = STATUS_BADGE[doc.status] || STATUS_BADGE.pending
                  const isImage = doc.content_type.startsWith("image/")
                  return (
                    <div key={doc.id} className="flex items-start gap-2.5 bg-gray-50 rounded-lg px-3 py-2">
                      <Icon
                        name={isImage ? "image" : "picture_as_pdf"}
                        size={18}
                        className="text-gray-400 flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-medium text-gray-900 truncate">{doc.original_filename}</p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400">{formatFileSize(doc.size_bytes)}</p>
                        {doc.status === "rejected" && doc.review_note && (
                          <div className="mt-1.5 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">
                            <p className="text-[11px] text-red-600">
                              <span className="font-medium">{t("rejectionReason")}</span> {doc.review_note}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await authFetch(`${BASE_URL}/mentors/documents/${doc.id}/`)
                              if (res.ok) {
                                const fresh = await res.json()
                                setDocuments((prev) => prev.map((d) => d.id === doc.id ? fresh : d))
                                window.open(fresh.download_url, "_blank")
                              }
                            } catch {
                              window.open(doc.download_url, "_blank")
                            }
                          }}
                          className="text-gray-400 hover:text-gray-900 transition-colors"
                          aria-label={t("downloadAriaLabel")}
                        >
                          <Icon name="download" size={16} />
                        </button>
                        {doc.status !== "approved" && !isBanned && (
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            aria-label={t("deleteAriaLabel")}
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!isBanned && (
              <>
                {kindDocs.length === 0 ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(opt.value, e)}
                    onClick={() => fileInputRefs.current[opt.value]?.click()}
                    className={`border-2 border-dashed border-gray-200 rounded-lg py-2.5 px-3 text-center transition-colors ${
                      blockedByOtherUpload ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-gray-400"
                    }`}
                  >
                    {isUploading ? (
                      <p className="text-xs text-gray-400">{t("uploading")}</p>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500">{t("dropHint")}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{t("fileFormats")}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[opt.value]?.click()}
                    disabled={uploadingKind !== null}
                    className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? t("uploading") : `+ ${t("addAnother")}`}
                  </button>
                )}
                <input
                  ref={(el) => { fileInputRefs.current[opt.value] = el }}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => handleFileInputChange(opt.value, e)}
                />
              </>
            )}

            {slotError && <p className="text-xs text-red-500 mt-1.5">{slotError}</p>}
          </div>
        )
      })}
    </div>
  )
}
