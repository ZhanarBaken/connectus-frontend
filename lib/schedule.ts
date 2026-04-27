/**
 * Schedule data layer — localStorage MVP.
 * Replace with real API when backend adds schedule endpoints.
 *
 * Mentor sets weekly availability (day → time slots).
 * Students see available slots and pick one when booking.
 */

export interface TimeSlot {
  start: string // "09:00"
  end: string   // "10:00"
}

export interface DaySchedule {
  enabled: boolean
  slots: TimeSlot[]
}

// 0=Mon ... 6=Sun (ISO weekday, not JS getDay)
export type WeekSchedule = Record<number, DaySchedule>

export interface BlockedDate {
  date: string // "2026-05-15"
  reason?: string
}

export interface MentorScheduleData {
  mentorId: number
  timezone: string
  weekSchedule: WeekSchedule
  blockedDates: BlockedDate[]
}

const STORAGE_KEY = "connectus_schedules"

const DEFAULT_WEEK: WeekSchedule = {
  0: { enabled: true, slots: [{ start: "10:00", end: "18:00" }] },
  1: { enabled: true, slots: [{ start: "10:00", end: "18:00" }] },
  2: { enabled: true, slots: [{ start: "10:00", end: "18:00" }] },
  3: { enabled: true, slots: [{ start: "10:00", end: "18:00" }] },
  4: { enabled: true, slots: [{ start: "10:00", end: "18:00" }] },
  5: { enabled: false, slots: [] },
  6: { enabled: false, slots: [] },
}

function readAll(): Record<number, MentorScheduleData> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  } catch {
    return {}
  }
}

function writeAll(data: Record<number, MentorScheduleData>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getMentorSchedule(mentorId: number): MentorScheduleData {
  const all = readAll()
  return all[mentorId] ?? {
    mentorId,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    weekSchedule: DEFAULT_WEEK,
    blockedDates: [],
  }
}

export function saveMentorSchedule(data: MentorScheduleData) {
  const all = readAll()
  all[data.mentorId] = data
  writeAll(all)
}

export const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
export const DAY_LABELS_FULL = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]

/**
 * Generate available booking slots for a specific date.
 * Takes the mentor's weekly schedule + blocked dates + service duration.
 * Returns array of start times like ["10:00", "10:30", "11:00", ...]
 */
export function getAvailableSlots(
  schedule: MentorScheduleData,
  date: Date,
  durationMinutes: number,
  bookedSlots: string[] = [], // already booked start times
): string[] {
  // Check if date is blocked
  const dateStr = formatDateISO(date)
  if (schedule.blockedDates.some((b) => b.date === dateStr)) return []

  // Get day of week (ISO: Mon=0 ... Sun=6)
  const jsDay = date.getDay() // 0=Sun, 1=Mon...
  const isoDay = jsDay === 0 ? 6 : jsDay - 1

  const daySchedule = schedule.weekSchedule[isoDay]
  if (!daySchedule?.enabled || !daySchedule.slots.length) return []

  const slots: string[] = []
  const step = 30 // 30-minute intervals

  for (const window of daySchedule.slots) {
    const startMin = timeToMinutes(window.start)
    const endMin = timeToMinutes(window.end)

    for (let t = startMin; t + durationMinutes <= endMin; t += step) {
      const timeStr = minutesToTime(t)
      if (!bookedSlots.includes(timeStr)) {
        slots.push(timeStr)
      }
    }
  }

  return slots
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Get the next N days starting from today.
 */
export function getNextDays(count: number, startFrom?: Date): Date[] {
  const start = startFrom ?? new Date()
  const days: Date[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}
