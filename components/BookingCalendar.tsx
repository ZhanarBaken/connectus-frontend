"use client"

import { useState, useEffect, useMemo } from "react"
import { fetchMentorAvailability, fetchMentorAvailabilityOverview } from "@/lib/api"
import {
  DAY_LABELS,
  formatDateISO,
  getNextDays,
} from "@/lib/schedule"
import Icon from "./Icon"

interface Props {
  mentorId: number
  durationMinutes: number
  onSelect: (date: string, time: string) => void
  onCancel: () => void
}

// Backend caps lookahead at 90 days; the calendar only shows 4 weeks.
const MAX_WEEK_OFFSET = 3

export default function BookingCalendar({ mentorId, durationMinutes, onSelect, onCancel }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState("")
  const [timezone, setTimezone] = useState("")

  // Map {YYYY-MM-DD: hasSlots} for the currently visible week. Drives
  // the dot indicator under each date cell. Fetched once per week
  // navigation — students don't tap dates to discover availability.
  const [overview, setOverview] = useState<Record<string, boolean>>({})

  // Show 7 days starting from today + offset (skip today on first week — same-day booking is rarely useful)
  const startDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    if (weekOffset === 0) d.setDate(d.getDate() + 1)
    return d
  }, [weekOffset])

  const days = useMemo(() => getNextDays(7, startDate), [startDate])

  // Fetch the {date: hasSlots} map for the currently visible window
  // whenever the user navigates weeks. One round trip per week swap,
  // not per date tap. Failure mode is "no dots" — students can still
  // tap to fetch slots, so we swallow the error silently.
  useEffect(() => {
    if (days.length === 0) return
    const fromDate = formatDateISO(days[0])
    const toDate = formatDateISO(days[days.length - 1])
    let cancelled = false
    fetchMentorAvailabilityOverview(mentorId, fromDate, toDate, durationMinutes)
      .then((res) => {
        if (!cancelled) setOverview(res.dates)
      })
      .catch(() => {
        if (!cancelled) setOverview({})
      })
    return () => { cancelled = true }
  }, [mentorId, durationMinutes, days])

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

  const formatMonth = (date: Date) =>
    date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })

  const monthLabel = useMemo(() => {
    const first = days[0]
    const last = days[days.length - 1]
    if (first.getMonth() === last.getMonth()) {
      return formatMonth(first)
    }
    return `${first.toLocaleDateString("ru-RU", { month: "short" })} — ${last.toLocaleDateString("ru-RU", { month: "short", year: "numeric" })}`
  }, [days])

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

      {/* Week navigation */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-gray-50">
        <button
          onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
        >
          <Icon name="chevron_left" size={20} className="text-gray-600" />
        </button>
        <span className="text-sm font-medium text-gray-700 capitalize">{monthLabel}</span>
        <button
          onClick={() => setWeekOffset(Math.min(MAX_WEEK_OFFSET, weekOffset + 1))}
          disabled={weekOffset >= MAX_WEEK_OFFSET}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
        >
          <Icon name="chevron_right" size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Day selector — backend decides what's available; here we just gate past dates. */}
      <div className="px-4 py-3 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = formatDateISO(day)
          const isPast = dateStr <= today
          const jsDay = day.getDay()
          const isoDay = jsDay === 0 ? 6 : jsDay - 1
          const isSelected = selectedDate === dateStr
          // `overview` may not have loaded yet — undefined means
          // "don't know", which we render as no dot (not "no slots").
          // Past dates always render without a dot regardless.
          const hasFreeSlots = !isPast && overview[dateStr] === true

          return (
            <button
              key={dateStr}
              onClick={() => {
                if (!isPast) {
                  setSelectedDate(dateStr)
                  setSelectedTime(null)
                }
              }}
              disabled={isPast}
              className={`flex flex-col items-center py-2.5 rounded-xl transition-all text-center ${
                isSelected
                  ? "bg-gray-900 text-white"
                  : !isPast
                    ? "hover:bg-gray-100 text-gray-900"
                    : "text-gray-300 cursor-not-allowed"
              }`}
            >
              <span className={`text-[10px] font-medium uppercase ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
                {DAY_LABELS[isoDay]}
              </span>
              <span className={`text-lg font-semibold mt-0.5 ${isSelected ? "text-white" : ""}`}>
                {day.getDate()}
              </span>
              {/* Availability indicator: small dot for dates with at
                  least one free slot. Reserved-height wrapper keeps
                  every cell the same height even when the dot is
                  absent, so the row doesn't twitch as overview loads. */}
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
