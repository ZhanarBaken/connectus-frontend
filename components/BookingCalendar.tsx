"use client"

import { useState, useMemo } from "react"
import {
  getMentorSchedule,
  getAvailableSlots,
  getNextDays,
  formatDateISO,
  DAY_LABELS,
} from "@/lib/schedule"
import Icon from "./Icon"

interface Props {
  mentorId: number
  durationMinutes: number
  onSelect: (date: string, time: string) => void
  onCancel: () => void
}

export default function BookingCalendar({ mentorId, durationMinutes, onSelect, onCancel }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const schedule = useMemo(() => getMentorSchedule(mentorId), [mentorId])

  // Show 7 days at a time, starting from today + offset
  const startDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    // If first week, start from tomorrow (can't book today)
    if (weekOffset === 0) d.setDate(d.getDate() + 1)
    return d
  }, [weekOffset])

  const days = useMemo(() => getNextDays(7, startDate), [startDate])

  const slots = useMemo(() => {
    if (!selectedDate) return []
    const date = new Date(selectedDate + "T00:00:00")
    return getAvailableSlots(schedule, date, durationMinutes)
  }, [selectedDate, schedule, durationMinutes])

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onSelect(selectedDate, selectedTime)
    }
  }

  const today = formatDateISO(new Date())

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
  }

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
          {durationMinutes} мин · {schedule.timezone}
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
          onClick={() => setWeekOffset(Math.min(3, weekOffset + 1))}
          disabled={weekOffset >= 3}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
        >
          <Icon name="chevron_right" size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Day selector */}
      <div className="px-4 py-3 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = formatDateISO(day)
          const isPast = dateStr <= today
          const jsDay = day.getDay()
          const isoDay = jsDay === 0 ? 6 : jsDay - 1
          const daySchedule = schedule.weekSchedule[isoDay]
          const isBlocked = schedule.blockedDates.some((b) => b.date === dateStr)
          const isAvailable = !isPast && !isBlocked && daySchedule?.enabled
          const isSelected = selectedDate === dateStr

          return (
            <button
              key={dateStr}
              onClick={() => {
                if (isAvailable) {
                  setSelectedDate(dateStr)
                  setSelectedTime(null)
                }
              }}
              disabled={!isAvailable}
              className={`flex flex-col items-center py-2.5 rounded-xl transition-all text-center ${
                isSelected
                  ? "bg-gray-900 text-white"
                  : isAvailable
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
              {isAvailable && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1" />
              )}
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

          {slots.length === 0 ? (
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
