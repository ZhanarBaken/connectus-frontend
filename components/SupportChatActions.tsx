"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { createSupportInvoice, createSupportTask, fetchMentorServices } from "@/lib/api"
import { translateInvoiceErrorMessage } from "@/lib/supportInvoiceErrors"
import { MentorService, Order } from "@/types"
import DatePicker from "@/components/DatePicker"

interface Props {
  studentId: number
  // Existing support engagement for this mentor/student pair, if any —
  // null hides "Add a task" (there's nothing to attach it to yet).
  engagementId: number | null
  // Fires after an invoice or task is posted, so the caller can bump its
  // ChatPanel's refetchTrigger — the backend's chat message for either
  // isn't pushed over the websocket.
  onActionPosted?: () => void
}

// Mentor-only "send invoice" / "add a task" controls for a support-
// engagement chat — same behavior as the order page's ChatPanel
// headerAction, factored out so the Mini App's other two chat entry
// points (orders list, Clients list) offer the exact same actions
// instead of a stripped-down chat with no buttons.
export default function SupportChatActions({ studentId, engagementId, onActionPosted }: Props) {
  const t = useTranslations("Orders.Detail")

  const [supportServices, setSupportServices] = useState<MentorService[]>([])
  const [supportServicesLoadError, setSupportServicesLoadError] = useState(false)
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false)
  const [invoiceServiceId, setInvoiceServiceId] = useState<number | null>(null)
  const [invoicePrice, setInvoicePrice] = useState("")
  const [invoiceMonths, setInvoiceMonths] = useState("")
  const [sendingInvoice, setSendingInvoice] = useState(false)
  const [invoiceError, setInvoiceError] = useState("")
  const [invoiceSent, setInvoiceSent] = useState(false)
  const [lastInvoiceOrder, setLastInvoiceOrder] = useState<Order | null>(null)

  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDeadline, setNewTaskDeadline] = useState("")
  const [creatingTask, setCreatingTask] = useState(false)
  const [taskError, setTaskError] = useState("")

  const loadServices = () => {
    setSupportServicesLoadError(false)
    fetchMentorServices()
      .then((services) => setSupportServices(services.filter((s) => s.payout_category === "support" && s.is_active)))
      .catch(() => setSupportServicesLoadError(true))
  }

  useEffect(() => {
    loadServices()
  }, [])

  const handleSendInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (invoiceServiceId === null) return
    setSendingInvoice(true)
    setInvoiceError("")
    try {
      const created = await createSupportInvoice(invoiceServiceId, studentId, invoicePrice, Number(invoiceMonths))
      setLastInvoiceOrder(created)
      setInvoiceSent(true)
      setInvoiceFormOpen(false)
      onActionPosted?.()
    } catch (e: unknown) {
      setInvoiceError(e instanceof Error ? e.message : t("errorInvoice"))
    } finally {
      setSendingInvoice(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (engagementId === null) return
    const title = newTaskTitle.trim()
    if (!title) return
    setCreatingTask(true)
    setTaskError("")
    try {
      await createSupportTask(engagementId, { title, deadline: newTaskDeadline || null })
      setNewTaskTitle("")
      setNewTaskDeadline("")
      setTaskFormOpen(false)
      onActionPosted?.()
    } catch (err: unknown) {
      setTaskError(err instanceof Error ? err.message : t("taskCreateError"))
    } finally {
      setCreatingTask(false)
    }
  }

  return (
    <>
      {(supportServices.length > 0 || supportServicesLoadError) && (
        <div className="px-4 py-3 sm:px-6 border-b border-gray-50 flex-shrink-0">
          {supportServicesLoadError ? (
            <div>
              <p className="text-xs text-red-600 mb-2">{t("servicesLoadError")}</p>
              <button
                type="button"
                onClick={loadServices}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                {t("retry")}
              </button>
            </div>
          ) : (
            <>
              {invoiceSent && !invoiceFormOpen && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-1 space-y-1">
                  <p>{t("invoiceSent")}</p>
                  {lastInvoiceOrder && (
                    <p className="text-emerald-800">
                      {t("invoiceSentAmounts", {
                        clientCharge: Number(lastInvoiceOrder.total_price).toLocaleString("ru-RU"),
                        mentorPayout: Number(lastInvoiceOrder.mentor_payout_amount).toLocaleString("ru-RU"),
                      })}
                    </p>
                  )}
                </div>
              )}
              {!invoiceFormOpen ? (
                <button
                  onClick={() => { setInvoiceFormOpen(true); setInvoiceSent(false); setLastInvoiceOrder(null); setTaskFormOpen(false) }}
                  className="w-full border border-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
                >
                  {t("sendInvoiceCta")}
                </button>
              ) : (
                <form onSubmit={handleSendInvoice} className="space-y-2">
                  <select
                    value={invoiceServiceId ?? ""}
                    onChange={(e) => setInvoiceServiceId(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  >
                    <option value="" disabled>{t("invoiceServicePlaceholder")}</option>
                    {supportServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={invoicePrice}
                      onChange={(e) => setInvoicePrice(e.target.value)}
                      required
                      type="number"
                      min="0"
                      step="1000"
                      placeholder={t("invoicePricePlaceholder")}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    />
                    <input
                      value={invoiceMonths}
                      onChange={(e) => setInvoiceMonths(e.target.value)}
                      required
                      type="number"
                      min="1"
                      max="36"
                      placeholder={t("invoiceMonthsPlaceholder")}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>
                  {invoiceError && (
                    <p className="text-xs text-red-600">{translateInvoiceErrorMessage(invoiceError, t)}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={sendingInvoice || invoiceServiceId === null}
                      className="flex-1 bg-gray-900 text-white py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {sendingInvoice ? t("sending") : t("send")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceFormOpen(false)}
                      className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}
      {engagementId !== null && (
        <div className="px-4 py-3 sm:px-6 border-b border-gray-50 flex-shrink-0">
          {!taskFormOpen ? (
            <button
              onClick={() => { setTaskFormOpen(true); setInvoiceFormOpen(false) }}
              className="w-full border border-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
            >
              {t("taskAddCta")}
            </button>
          ) : (
            <form onSubmit={handleCreateTask} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder={t("taskTitlePlaceholder")}
                  maxLength={200}
                  className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                />
                <DatePicker
                  value={newTaskDeadline}
                  onChange={setNewTaskDeadline}
                  placeholder={t("taskDeadlinePlaceholder")}
                  ariaLabel={t("taskDeadlinePlaceholder")}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-left whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                />
              </div>
              {taskError && <p className="text-xs text-red-600">{taskError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creatingTask || !newTaskTitle.trim()}
                  className="flex-1 bg-gray-900 text-white py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {creatingTask ? t("taskCreating") : t("taskAdd")}
                </button>
                <button
                  type="button"
                  onClick={() => { setTaskFormOpen(false); setTaskError("") }}
                  className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  )
}
