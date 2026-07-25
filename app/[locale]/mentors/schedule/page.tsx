"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { fetchMyMentorSchedule, saveMyMentorSchedule } from "@/lib/api"
import {
  emptyWeekSchedule,
  flatToWeekSchedule,
  formatDateISO,
  weekScheduleToFlat,
  type ScheduleBlock,
  type TimeSlot,
  type WeekSchedule,
} from "@/lib/schedule"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"
import MentorStatusBanner from "@/components/MentorStatusBanner"

const TIME_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(
      `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
    )
  }
}

export default function MentorSchedulePage() {
  const t = useTranslations("Mentors.Schedule")
  const router = useRouter()
  const DAY_LABELS_FULL = [
    t("monday"), t("tuesday"), t("wednesday"), t("thursday"),
    t("friday"), t("saturday"), t("sunday"),
  ]
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(emptyWeekSchedule())
  const [blockedDates, setBlockedDates] = useState<ScheduleBlock[]>([])
  const [timezone, setTimezone] = useState("")

  // Blocked date form
  const [newBlockedDate, setNewBlockedDate] = useState("")
  const [newBlockedReason, setNewBlockedReason] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    const role = localStorage.getItem("role")
    if (!token || role !== "mentor") {
      router.replace(token ? "/mentor/dashboard" : "/auth/login")
      return
    }

    fetchMyMentorSchedule()
      .then((schedule) => {
        setWeekSchedule(flatToWeekSchedule(schedule.weekly))
        setBlockedDates(schedule.blocks)
        setTimezone(schedule.timezone)
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("loadError")),
      )
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  /* ── Day toggle ──────────────────────────────────────────── */
  const toggleDay = (day: number) => {
    setWeekSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        slots: prev[day].enabled
          ? prev[day].slots
          : prev[day].slots.length
            ? prev[day].slots
            : [{ start: "10:00", end: "18:00" }],
      },
    }))
  }

  /* ── Slot management ─────────────────────────────────────── */
  const updateSlot = (
    day: number,
    idx: number,
    field: keyof TimeSlot,
    value: string
  ) => {
    setWeekSchedule((prev) => {
      const slots = [...prev[day].slots]
      slots[idx] = { ...slots[idx], [field]: value }
      return { ...prev, [day]: { ...prev[day], slots } }
    })
  }

  const addSlot = (day: number) => {
    setWeekSchedule((prev) => {
      const slots = [...prev[day].slots, { start: "10:00", end: "18:00" }]
      return { ...prev, [day]: { ...prev[day], slots } }
    })
  }

  const removeSlot = (day: number, idx: number) => {
    setWeekSchedule((prev) => {
      const slots = prev[day].slots.filter((_, i) => i !== idx)
      return { ...prev, [day]: { ...prev[day], slots } }
    })
  }

  /* ── Blocked dates ───────────────────────────────────────── */
  const addBlockedDate = () => {
    if (!newBlockedDate) return
    const today = formatDateISO(new Date())
    if (newBlockedDate < today) return
    if (blockedDates.some((b) => b.date === newBlockedDate)) return
    setBlockedDates((prev) =>
      [...prev, { date: newBlockedDate, reason: newBlockedReason }].sort(
        (a, b) => a.date.localeCompare(b.date)
      )
    )
    setNewBlockedDate("")
    setNewBlockedReason("")
  }

  const removeBlockedDate = (date: string) => {
    setBlockedDates((prev) => prev.filter((b) => b.date !== date))
  }

  /* ── Save ────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      await saveMyMentorSchedule({
        weekly: weekScheduleToFlat(weekSchedule),
        blocks: blockedDates,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError"))
    } finally {
      setSaving(false)
    }
  }

  /* ── Loading state ───────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const todayISO = formatDateISO(new Date())
  const futureBlockedDates = blockedDates.filter((b) => b.date >= todayISO)

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <MentorStatusBanner />
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* ── Header ─────────────────────────────────────── */}
        <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-4 transition-colors group [-webkit-tap-highlight-color:transparent]" />
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-gray-500 mb-1">
          {t("pageSubtitle")}
        </p>
        {timezone && (
          <p className="text-xs text-gray-400 mb-8">{t("timezoneLabel", { timezone })}</p>
        )}

        {/* ── Alerts ─────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-6 flex items-center gap-2">
            <Icon name="error" size={16} className="text-red-500" />
            {error}
            <button
              onClick={() => setError("")}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        {saved && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700 mb-6 flex items-center gap-2">
            <Icon
              name="check_circle"
              size={16}
              className="text-emerald-600"
              filled
            />
            {t("saved")}
          </div>
        )}

        {/* ── Weekly schedule ────────────────────────────── */}
        <div className="space-y-3 mb-10">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const ds = weekSchedule[day]
            if (!ds) return null
            const enabled = ds.enabled

            return (
              <div
                key={day}
                className={`bg-white rounded-2xl border border-gray-200 p-5 transition-opacity ${
                  enabled ? "" : "opacity-60"
                }`}
              >
                {/* Day header */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={enabled}
                    className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                      enabled ? "bg-indigo-600" : "bg-gray-200"
                    } cursor-pointer`}
                  >
                    <span
                      className={`inline-block w-5 h-5 rounded-full bg-white shadow transform-gpu transition-transform duration-200 mt-0.5 ${
                        enabled ? "translate-x-[22px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-sm font-semibold ${
                      enabled ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {DAY_LABELS_FULL[day]}
                  </span>
                </div>

                {/* Slots */}
                {enabled && (
                  <div className="mt-4 ml-15 space-y-2">
                    {ds.slots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={slot.start}
                          onChange={(e) =>
                            updateSlot(day, idx, "start", e.target.value)
                          }
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>

                        <span className="text-gray-400 text-sm">&mdash;</span>

                        <select
                          value={slot.end}
                          onChange={(e) =>
                            updateSlot(day, idx, "end", e.target.value)
                          }
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => removeSlot(day, idx)}
                          className="ml-1 p-1 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                          aria-label={t("removeSlot")}
                        >
                          <Icon name="close" size={16} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addSlot(day)}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 font-medium mt-1 transition-colors"
                    >
                      <Icon name="add" size={14} />
                      {t("addSlot")}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Blocked dates ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">
            {t("blockedDatesTitle")}
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            {t("blockedDatesSubtitle")}
          </p>

          {/* Add form */}
          <div className="flex flex-wrap items-end gap-2 mb-5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("dateLabel")}</label>
              <input
                type="date"
                value={newBlockedDate}
                min={todayISO}
                onChange={(e) => setNewBlockedDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-gray-500 mb-1">
                {t("reasonLabel")}
              </label>
              <input
                type="text"
                value={newBlockedReason}
                onChange={(e) => setNewBlockedReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <button
              type="button"
              onClick={addBlockedDate}
              disabled={!newBlockedDate}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("add")}
            </button>
          </div>

          {/* List */}
          {futureBlockedDates.length === 0 ? (
            <p className="text-xs text-gray-400">{t("noBlockedDates")}</p>
          ) : (
            <div className="space-y-2">
              {futureBlockedDates.map((b) => (
                <div
                  key={b.date}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5"
                >
                  <Icon
                    name="event_busy"
                    size={16}
                    className="text-gray-400 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-900 font-medium">
                    {b.date}
                  </span>
                  {b.reason && (
                    <span className="text-xs text-gray-500">{b.reason}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeBlockedDate(b.date)}
                    className="ml-auto p-1 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    aria-label={t("removeDate")}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Save button ────────────────────────────────── */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Icon name="save" size={18} className="text-white" />
              {t("saveSchedule")}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
