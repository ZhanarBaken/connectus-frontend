"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { authFetch, fetchMentorProfile } from "@/lib/api"
import { SUPPORT_EMAIL } from "@/lib/contacts"
import Icon from "@/components/Icon"
import BackButton from "@/components/BackButton"
import MentorStatusBanner from "@/components/MentorStatusBanner"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

interface MentorDocument {
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
  // Паспорт / виза убраны (не подтверждают поступление).
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

export default function MentorDocumentsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<MentorDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Upload state
  const [kind, setKind] = useState("diploma")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  // Ban state
  const [isBanned, setIsBanned] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const role = localStorage.getItem("role")
    if (!token) { router.replace("/auth/login"); return }
    if (role === "student") { router.replace("/student/dashboard"); return }
    fetchMentorProfile().then(p => setIsBanned(p.is_banned ?? false)).catch(() => {})
    loadDocuments()
  }, [router])

  async function loadDocuments() {
    setLoading(true)
    setError("")
    try {
      const res = await authFetch(`${BASE_URL}/mentors/documents/`)
      if (!res.ok) throw new Error("Не удалось загрузить документы")
      const data = await res.json()
      setDocuments(Array.isArray(data) ? data : data.results ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }

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
      setDocuments((prev) => [doc, ...prev])
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
      setDocuments((prev) => prev.filter((d) => d.id !== id))
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
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <MentorStatusBanner />
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <BackButton fallbackHref="/mentor/dashboard" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-4">
            Документы для верификации
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Загрузите документы для подтверждения вашего статуса ментора
          </p>
        </div>

        {isBanned && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <Icon name="block" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Аккаунт заблокирован</p>
              <p className="text-xs text-red-500 mt-1">Редактирование недоступно. Обратитесь в поддержку: {SUPPORT_EMAIL}</p>
            </div>
          </div>
        )}

        {/* Upload form */}
        {!isBanned && <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Загрузить документ</h2>

          {/* Kind select */}
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

          {/* Drop zone */}
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
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Загружаем..." : "Загрузить"}
          </button>
        </div>}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-6">
            {error}
          </div>
        )}

        {/* Documents list */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Мои документы</h2>

          {documents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Icon name="folder_open" size={48} className="text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Документов пока нет</h3>
              <p className="text-sm text-gray-400">Загрузите документы для прохождения верификации</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const badge = STATUS_BADGE[doc.status] || STATUS_BADGE.pending
                const isImage = doc.content_type.startsWith("image/")
                return (
                  <div key={doc.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                        <Icon
                          name={isImage ? "image" : "picture_as_pdf"}
                          size={22}
                          className={isImage ? "text-blue-500" : "text-red-500"}
                        />
                      </div>

                      {/* Info */}
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
                          {" · "}
                          {formatFileSize(doc.size_bytes)}
                          {" · "}
                          {new Date(doc.uploaded_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                        </p>

                        {/* Review note for rejected */}
                        {doc.status === "rejected" && doc.review_note && (
                          <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            <p className="text-xs text-red-600">
                              <span className="font-medium">Причина отклонения:</span> {doc.review_note}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={async () => {
                            // Refetch to get a fresh presigned URL (TTL 10 min)
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
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-medium transition-colors"
                        >
                          <Icon name="download" size={18} />
                        </button>
                        {doc.status !== "approved" && !isBanned && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className="inline-flex items-center text-xs text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
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
      </div>
    </div>
  )
}
