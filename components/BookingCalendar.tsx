"use client"

import { useState, useEffect, useMemo } from "react"
import { fetchMentorAvailability, fetchMentorAvailabilityOverview } from "@/lib/api"
import {
  DAY_LABELS,
  formatDateISO,
  getMonthGrid,
} from "@/lib/schedule"
import Icon from "./Icon"

interface Props {
  mentorId: number
  durationMinutes: number
  onSelect: (date: string, time: string) => void
  onCancel: () => void
}

// Backend caps lookahead at 90 days ≈ 3 months. monthOffset is
// relative to the current month, so {0, 1, 2} covers ~today..+90d.
const MAX_MONTH_OFFSET = 2

export default function BookingCalendar({ mentorId, durationMinutes, onSelect, onCancel }: Props) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState("")
  const [timezone, setTimezone] = useState("")

  // Map {YYYY-MM-DD: hasSlots} for the currently visible month. Drives
  // the dot indicator under each date cell. Fetched once per month
  // navigation — students don't tap dates to discover availability.
  const [overview, setOverview] = useState<Record<string, boolean>>({})

  // The month currently rendered as a grid. year+month (0-indexed)
  // are memoized off `monthOffset` so the month grid identity is
  // stable across renders.
  const visibleMonth = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + monthOffset)
    return { year: d.getFullYear(), month: d.getMonth() }
  }, [monthOffset])

  const monthGrid = useMemo(
    () => getMonthGrid(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  )

  // Fetch the {date: hasSlots} map for the visible month. We fetch
  // ONLY for first-of-month → last-of-month (not the padding cells
  // from neighbouring months) so we never exceed the backend's 31-day
  // range cap. Failure → no dots, students can still tap.
  useEffect(() => {
    const firstOfMonth = new Date(visibleMonth.year, visibleMonth.month, 1)
    const lastOfMonth = new Date(visibleMonth.year, visibleMonth.month + 1, 0)
    const fromDate = formatDateISO(firstOfMonth)
    const toDate = formatDateISO(lastOfMonth)
    let cancelled = false
    fetchMentorAvailabilityOverview(mentorId, fromDate, toDate, durationMinutes)
      .then((res) => {
        if (!cancelled) setOverview(res.dates)
      })
      .catch(() => {
        if (!cancelled) setOverview({})
      })
    return () => { cancelled = true }
  }, [mentorId, durationMinutes, visibleMonth])

  // Fetch availability when the user picks a date.
  useEffect(() => {
    if (!selectedDate) {
      setSlots([])
      return
    }
    let cancelled = false
    setSlotsLoading(true)
    setSlotsError("")
    fetchMentorAvailability(mentorId, selectedDate, durationMinutes)
      .then((res) => {
        if (cancelled) return
        setSlots(res.slots)
        setTimezone(res.timezone)
      })
      .catch((err) => {
        if (cancelled) return
        setSlots([])
        setSlotsError(err instanceof Error ? err.message : "Не удалось загрузить слоты")
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mentorId, selectedDate, durationMinutes])

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onSelect(selectedDate, selectedTime)
    }
  }

  const today = formatDateISO(new Date())

  const monthLabel = useMemo(() => {
    const d = new Date(visibleMonth.year, visibleMonth.month, 1)
    return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
  }, [visibleMonth])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 text-sm">Выберите дату и время</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <Icon name="close" size={20} />
          </button>
        </div>
        <p className="text-xs text-gray-400">
          {durationMinutes} мин{timezone ? ` · ${timezone}` : ""}
        </p>
      </div>

      {/* Month navigation */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
        <button
          onClick={() => setMonthOffset(Math.max(0, monthOffset - 1))}
          disabled={monthOffset === 0}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
          aria-label="Предыдущий месяц"
        >
          <Icon name="chevron_left" size={20} className="text-gray-600" />
        </button>
        <span className="text-sm font-medium text-gray-700 capitalize">{monthLabel}</span>
        <button
          onClick={() => setMonthOffset(Math.min(MAX_MONTH_OFFSET, monthOffset + 1))}
          disabled={monthOffset >= MAX_MONTH_OFFSET}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
          aria-label="Следующий месяц"
        >
          <Icon name="chevron_right" size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Weekday header row */}
      <div className="px-3 pt-3 grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label) => (
          <span
            key={label}
            className="text-[10px] font-medium uppercase text-gray-400 text-center py-1"
          >
            {label}
          </span>
        ))}
      </div>

      {/* Month grid: dates from the visible month + padding cells from
          neighbouring months (rendered faded, not clickable). */}
      <div className="px-3 pb-3 grid grid-cols-7 gap-1">
        {monthGrid.map((day) => {
          const dateStr = formatDateISO(day)
          const isOutsideMonth = day.getMonth() !== visibleMonth.month
          const isPast = dateStr <= today
          const isDisabled = isOutsideMonth || isPast
          const isSelected = selectedDate === dateStr
          // `overview` may not have loaded yet — undefined means
          // "don't know", which we render as no dot (not "no slots").
          // Disabled cells (past / outside month) never show a dot.
          const hasFreeSlots = !isDisabled && overview[dateStr] === true

          return (
            <button
              key={dateStr}
              onClick={() => {
                if (!isDisabled) {
                  setSelectedDate(dateStr)
                  setSelectedTime(null)
                }
              }}
              disabled={isDisabled}
              className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all text-center ${
                isSelected
                  ? "bg-gray-900 text-white"
                  : isDisabled
                    ? isOutsideMonth ? "text-gray-200 cursor-not-allowed" : "text-gray-300 cursor-not-allowed"
                    : "hover:bg-gray-100 text-gray-900"
              }`}
            >
              <span className={`text-sm font-semibold ${isSelected ? "text-white" : ""}`}>
                {day.getDate()}
              </span>
              {/* Availability indicator: small dot for dates with at
                  least one free slot. Reserved-height wrapper keeps
                  every cell the same height even when the dot is
                  absent, so the grid doesn't twitch as overview loads. */}
              <span className="h-1.5 mt-1 flex items-center justify-center">
                {hasFreeSlots && (
                  <span
                    className={`block w-1.5 h-1.5 rounded-full ${
                      isSelected ? "bg-white/80" : "bg-emerald-500"
                    }`}
                    aria-label="Есть свободные слоты"
                  />
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-3">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>

          {slotsLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : slotsError ? (
            <p className="text-sm text-red-500 text-center py-6">{slotsError}</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Нет доступных слотов на эту дату
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
              {slots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTime === time
                      ? "bg-gray-900 text-white"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm */}
      {selectedDate && selectedTime && (
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Записаться на {selectedTime}
          </button>
        </div>
      )}
    </div>
  )
}
