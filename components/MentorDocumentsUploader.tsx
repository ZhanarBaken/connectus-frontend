"use client"

import { useEffect, useRef, useState } from "react"
import { authFetch } from "@/lib/api"
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

const KIND_OPTIONS: { value: string; label: string }[] = [
  // Паспорт / виза убраны (не подтверждают поступление). Существующие
  // документы с этими kind конвертированы миграцией в `other`.
  { value: "diploma", label: "Диплом" },
  { value: "enrollment_certificate", label: "Справка о зачислении" },
  { value: "university_id", label: "Студенческий билет" },
  { value: "other", label: "Другое" },
]

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "На проверке", className: "bg-yellow-50 text-yellow-700" },
  approved: { label: "Одобрен", className: "bg-green-50 text-green-700" },
  rejected: { label: "Отклонён", className: "bg-red-50 text-red-700" },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  // When provided, banned state is gated externally. Defaults to false.
  isBanned?: boolean
  // Notifies parent when count changes — useful for progress / submit-gate
  // logic on the edit page.
  onCountChange?: (count: number) => void
}

// Inline uploader + list for mentor's verification documents.
// Same UI as the standalone /mentors/documents/ page, extracted so the
// edit-profile page can embed it without duplicating the upload logic.
export default function MentorDocumentsUploader({ isBanned = false, onCountChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
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
        if (!res.ok) throw new Error("Не удалось загрузить документы")
        const data = await res.json()
        if (cancelled) return
        const list: MentorDocument[] = Array.isArray(data) ? data : data.results ?? []
        setDocuments(list)
        onCountChange?.(list.length)
      } catch (e: unknown) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "Ошибка загрузки")
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
      setUploadError("Файл слишком большой. Максимум 15 MB.")
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
        throw new Error(Array.isArray(first) ? first[0] : err.detail || String(first || "Ошибка загрузки"))
      }
      const doc: MentorDocument = await res.json()
      setDocuments((prev) => {
        const next = [doc, ...prev]
        onCountChange?.(next.length)
        return next
      })
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Ошибка загрузки")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить документ?")) return
    setDeletingId(id)
    try {
      const res = await authFetch(`${BASE_URL}/mentors/documents/${id}/`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Не удалось удалить")
      }
      setDocuments((prev) => {
        const next = prev.filter((d) => d.id !== id)
        onCountChange?.(next.length)
        return next
      })
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка удаления")
    } finally {
      setDeletingId(null)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Тип документа</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 mb-4 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors mb-4"
          >
            <Icon name="upload_file" size={40} className="text-gray-300 mx-auto mb-2" />
            {file ? (
              <p className="text-sm text-gray-700 font-medium">{file.name} ({formatFileSize(file.size)})</p>
            ) : (
              <>
                <p className="text-sm text-gray-500">Перетащите файл сюда или нажмите для выбора</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPEG, PNG. Максимум 15 MB</p>
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
            <p className="text-sm text-red-600 mb-3">{uploadError}</p>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Загружаем..." : "Загрузить"}
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
          <p className="text-sm text-gray-500">Документов пока нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const badge = STATUS_BADGE[doc.status] || STATUS_BADGE.pending
            const isImage = doc.content_type.startsWith("image/")
            return (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                    <Icon
                      name={isImage ? "image" : "picture_as_pdf"}
                      size={22}
                      className={isImage ? "text-blue-500" : "text-red-500"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {doc.original_filename}
                      </h3>
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
                          <span className="font-medium">Причина отклонения:</span> {doc.review_note}
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
                      className="text-gray-500 hover:text-gray-900 transition-colors"
                      aria-label="Скачать"
                    >
                      <Icon name="download" size={18} />
                    </button>
                    {doc.status !== "approved" && !isBanned && (
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        aria-label="Удалить"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
