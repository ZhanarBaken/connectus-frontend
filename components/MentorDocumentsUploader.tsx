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
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"]

function formatFileSize(bytes: number): string {
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

// Inline uploader + list for mentor's verification documents.
// Shared between the /mentors/profile edit page and other mentor surfaces
// that need document management, so the upload/list/delete logic lives once.
export default function MentorDocumentsUploader({ isBanned = false, onDocumentsChange }: Props) {
  const t = useTranslations("Mentors.Documents")
  const tDoc = useTranslations("Onboarding.Mentor")
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const [kind, setKind] = useState("diploma")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
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

  async function handleUpload() {
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      setUploadError(t("fileTooLarge"))
      return
    }
    setUploading(true)
    setUploadError("")
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
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : t("loadErrorGeneric"))
    } finally {
      setUploading(false)
    }
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (!dropped) return
    // The picker's `accept` attribute doesn't constrain drag-and-drop —
    // check explicitly so a mentor dragging e.g. a .docx gets an
    // immediate, translated message instead of a round trip to the API.
    if (!ALLOWED_DOCUMENT_TYPES.includes(dropped.type)) {
      setUploadError(t("fileTypeNotAllowed"))
      return
    }
    setUploadError("")
    setFile(dropped)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Upload form */}
      {!isBanned && (
        <div className="border border-gray-200 rounded-2xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("documentTypeLabel")}</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 mb-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-gray-400 transition-colors mb-3"
          >
            <Icon name="upload_file" size={32} className="text-gray-300 mx-auto mb-2" />
            {file ? (
              <p className="text-sm text-gray-700 font-medium">{file.name} ({formatFileSize(file.size)})</p>
            ) : (
              <>
                <p className="text-sm text-gray-500">{t("dropHint")}</p>
                <p className="text-xs text-gray-400 mt-1">{t("fileFormats")}</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {uploadError && (
            <p className="text-xs text-red-500 mb-2">{uploadError}</p>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {uploading ? t("uploading") : t("upload")}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Documents list */}
      {documents.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <Icon name="folder_open" size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t("noDocumentsTitle")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const badge = STATUS_BADGE[doc.status] || STATUS_BADGE.pending
            const isImage = doc.content_type.startsWith("image/")
            return (
              <div key={doc.id} className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <Icon
                  name={isImage ? "image" : "picture_as_pdf"}
                  size={20}
                  className="text-gray-400 flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.original_filename}
                    </p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {KIND_OPTIONS.find((o) => o.value === doc.kind)?.label || doc.kind}
                    {" · "}{formatFileSize(doc.size_bytes)}
                  </p>
                  {doc.status === "rejected" && doc.review_note && (
                    <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <p className="text-xs text-red-600">
                        <span className="font-medium">{t("rejectionReason")}</span> {doc.review_note}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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
                    <Icon name="download" size={18} />
                  </button>
                  {doc.status !== "approved" && !isBanned && (
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      aria-label={t("deleteAriaLabel")}
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
