"use client"

import { useEffect, useState } from "react"
import {
  fetchAdminDisputes,
  resolveDispute,
  adminCancelSupportEngagement,
  adminPauseSupportEngagement,
  adminResumeSupportEngagement,
} from "@/lib/api"
import { AdminDispute, SupportEngagement } from "@/types"

export default function CRMDisputesPage() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchAdminDisputes()
      .then(setDisputes)
      .catch(() => setError("Не удалось загрузить споры"))
      .finally(() => setLoading(false))
  }, [])

  const handleResolve = async (id: number, resolution: "full_refund" | "payout_mentor") => {
    setActionLoading(id)
    setError("")
    try {
      const updated = await resolveDispute(id, resolution)
      setDisputes((prev) => prev.map((d) => (d.id === id ? updated : d)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setActionLoading(null)
    }
  }

  const updateEngagement = (disputeId: number, engagement: SupportEngagement) => {
    setDisputes((prev) => prev.map((d) => (d.id === disputeId ? { ...d, support_engagement: engagement } : d)))
  }

  const handleEngagementCancel = async (disputeId: number, engagementId: number, reason: string) => {
    setActionLoading(disputeId)
    setError("")
    try {
      const updated = await adminCancelSupportEngagement(engagementId, reason)
      updateEngagement(disputeId, updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setActionLoading(null)
    }
  }

  const handleEngagementPause = async (disputeId: number, engagementId: number, reason: string) => {
    setActionLoading(disputeId)
    setError("")
    try {
      const updated = await adminPauseSupportEngagement(engagementId, reason)
      updateEngagement(disputeId, updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setActionLoading(null)
    }
  }

  const handleEngagementResume = async (disputeId: number, engagementId: number) => {
    setActionLoading(disputeId)
    setError("")
    try {
      const updated = await adminResumeSupportEngagement(engagementId)
      updateEngagement(disputeId, updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setActionLoading(null)
    }
  }

  const open = disputes.filter((d) => !d.resolution)
  const resolved = disputes.filter((d) => d.resolution)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Споры</h1>
        <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-medium">
          {open.length} открытых
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div className="space-y-3 mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Открытые</h2>
              {open.map((d) => (
                <DisputeCard
                  key={d.id}
                  dispute={d}
                  loading={actionLoading === d.id}
                  onResolve={handleResolve}
                  onEngagementCancel={handleEngagementCancel}
                  onEngagementPause={handleEngagementPause}
                  onEngagementResume={handleEngagementResume}
                />
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Разрешённые</h2>
              {resolved.map((d) => (
                <DisputeCard
                  key={d.id}
                  dispute={d}
                  loading={actionLoading === d.id}
                  onResolve={() => {}}
                  onEngagementCancel={handleEngagementCancel}
                  onEngagementPause={handleEngagementPause}
                  onEngagementResume={handleEngagementResume}
                />
              ))}
            </div>
          )}

          {disputes.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-2">⚖️</p>
              <p className="text-sm">Нет споров</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const ENGAGEMENT_STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "ожидает оплаты",
  active: "активно",
  paused: "на паузе",
  completed: "завершено",
  cancelled: "отменено",
}

function DisputeCard({
  dispute,
  loading,
  onResolve,
  onEngagementCancel,
  onEngagementPause,
  onEngagementResume,
}: {
  dispute: AdminDispute
  loading: boolean
  onResolve: (id: number, resolution: "full_refund" | "payout_mentor") => void
  onEngagementCancel: (disputeId: number, engagementId: number, reason: string) => void
  onEngagementPause: (disputeId: number, engagementId: number, reason: string) => void
  onEngagementResume: (disputeId: number, engagementId: number) => void
}) {
  const resolved = !!dispute.resolution
  const engagement = dispute.support_engagement

  return (
    <div className={`bg-white border rounded-2xl p-5 ${resolved ? "border-gray-100" : "border-gray-200"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">Спор по заказу #{dispute.order}</span>
            {resolved ? (
              <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                {dispute.resolution === "full_refund" ? "Возврат" : "Выплата ментору"}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">открыт</span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-1">{dispute.reason}</p>
          <p className="text-xs text-gray-400">
            Открыл: {dispute.opened_by_email} · {new Date(dispute.opened_at).toLocaleString("ru-RU")}
          </p>
          {resolved && dispute.resolved_at && (
            <p className="text-xs text-gray-400 mt-0.5">
              Разрешил: {dispute.resolved_by_email} · {new Date(dispute.resolved_at).toLocaleString("ru-RU")}
            </p>
          )}
        </div>

        {!resolved && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onResolve(dispute.id, "full_refund")}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-medium hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              Возврат студенту
            </button>
            <button
              onClick={() => onResolve(dispute.id, "payout_mentor")}
              disabled={loading}
              className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              Выплатить ментору
            </button>
          </div>
        )}
      </div>

      {engagement && (
        <EngagementPanel
          disputeId={dispute.id}
          engagement={engagement}
          loading={loading}
          onCancel={onEngagementCancel}
          onPause={onEngagementPause}
          onResume={onEngagementResume}
        />
      )}
    </div>
  )
}

function EngagementPanel({
  disputeId,
  engagement,
  loading,
  onCancel,
  onPause,
  onResume,
}: {
  disputeId: number
  engagement: SupportEngagement
  loading: boolean
  onCancel: (disputeId: number, engagementId: number, reason: string) => void
  onPause: (disputeId: number, engagementId: number, reason: string) => void
  onResume: (disputeId: number, engagementId: number) => void
}) {
  const [pendingAction, setPendingAction] = useState<"cancel" | "pause" | null>(null)
  const [reason, setReason] = useState("")

  const submit = () => {
    const trimmed = reason.trim()
    if (!trimmed) return
    if (pendingAction === "cancel") onCancel(disputeId, engagement.id, trimmed)
    else if (pendingAction === "pause") onPause(disputeId, engagement.id, trimmed)
    setPendingAction(null)
    setReason("")
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Сопровождение «{engagement.service_title}»: {engagement.mentor_name} → {engagement.student_name} ·{" "}
          <span className="font-medium text-gray-700">
            {ENGAGEMENT_STATUS_LABEL[engagement.status] ?? engagement.status}
          </span>
        </p>
        {(engagement.status === "active" || engagement.status === "paused") && !pendingAction && (
          <div className="flex gap-2 shrink-0">
            {engagement.status === "active" && (
              <button
                onClick={() => setPendingAction("pause")}
                disabled={loading}
                className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                Приостановить
              </button>
            )}
            {engagement.status === "paused" && (
              <button
                onClick={() => onResume(disputeId, engagement.id)}
                disabled={loading}
                className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-medium hover:bg-emerald-100 disabled:opacity-50 transition-colors"
              >
                Возобновить
              </button>
            )}
            <button
              onClick={() => setPendingAction("cancel")}
              disabled={loading}
              className="px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              Прекратить
            </button>
          </div>
        )}
      </div>

      {pendingAction && (
        <div className="mt-2 flex gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Причина — студент её увидит"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          <button
            onClick={submit}
            disabled={loading || !reason.trim()}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Подтвердить
          </button>
          <button
            onClick={() => { setPendingAction(null); setReason("") }}
            className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:border-gray-300 transition-colors"
          >
            Отмена
          </button>
        </div>
      )}
    </div>
  )
}
