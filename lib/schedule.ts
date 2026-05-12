/**
 * Schedule data layer.
 *
 * Backend stores the source of truth (apps.mentors.MentorAvailability +
 * AvailabilityBlock). The schedule editor still works with the
 * WeekSchedule shape (one row per day with an `enabled` flag) for UX,
 * so this module exposes adapters between the API's flat list of
 * windows and the editor's per-day form.
 *
 * Slot generation (which 30-min start times are free for a service of
 * duration N) lives entirely on the backend — call
 * `fetchMentorAvailability(mentorId, date, duration)` from `lib/api`.
 */

// ─── API-aligned types ──────────────────────────────────────────────────────

export interface ScheduleWindow {
  weekday: number // 0=Mon ... 6=Sun (ISO)
  start_time: string // "10:00"
  end_time: string
}

export interface ScheduleBlock {
  date: string // "2026-05-12"
  reason: string
}

export interface MentorSchedule {
  timezone: string
  weekly: ScheduleWindow[]
  blocks: ScheduleBlock[]
}

// ─── Editor-friendly shape (with explicit per-day enabled toggle) ───────────

export interface TimeSlot {
  start: string
  end: string
}

export interface DaySchedule {
  enabled: boolean
  slots: TimeSlot[]
}

export type WeekSchedule = Record<number, DaySchedule>

const EMPTY_DAY = (): DaySchedule => ({ enabled: false, slots: [] })

export function emptyWeekSchedule(): WeekSchedule {
  return {
    0: EMPTY_DAY(),
    1: EMPTY_DAY(),
    2: EMPTY_DAY(),
    3: EMPTY_DAY(),
    4: EMPTY_DAY(),
    5: EMPTY_DAY(),
    6: EMPTY_DAY(),
  }
}

export function flatToWeekSchedule(weekly: ScheduleWindow[]): WeekSchedule {
  const result = emptyWeekSchedule()
  for (const w of weekly) {
    const day = result[w.weekday]
    day.enabled = true
    day.slots.push({ start: w.start_time, end: w.end_time })
  }
  return result
}

export function weekScheduleToFlat(week: WeekSchedule): ScheduleWindow[] {
  const out: ScheduleWindow[] = []
  for (const [dayStr, ds] of Object.entries(week)) {
    if (!ds.enabled) continue
    for (const slot of ds.slots) {
      out.push({
        weekday: Number(dayStr),
        start_time: slot.start,
        end_time: slot.end,
      })
    }
  }
  return out
}

// ─── Utilities (no I/O) ─────────────────────────────────────────────────────

export const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
export const DAY_LABELS_FULL = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
]

export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0]
}

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

// Returns a 5- or 6-row calendar grid for the given month, always
// aligned to a Monday-to-Sunday week. Padding cells before the 1st and
// after the last day of the month are dates from the neighbouring
// month — the caller is expected to render them faded so it's obvious
// they're outside the current month.
//
// `month` is 0-indexed (JS Date convention). 35 or 42 dates total
// depending on how the month aligns to weekday boundaries.
export function getMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  // ISO weekday: 0=Mon .. 6=Sun. JS getDay() is 0=Sun.
  const isoFirst = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1
  const isoLast = lastOfMonth.getDay() === 0 ? 6 : lastOfMonth.getDay() - 1
  const padBefore = isoFirst
  const padAfter = 6 - isoLast

  const gridStart = new Date(year, month, 1 - padBefore)
  const total = padBefore + lastOfMonth.getDate() + padAfter

  const days: Date[] = []
  for (let i = 0; i < total; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    days.push(d)
  }
  return days
}

// JS Date.getDay() returns 0=Sun ... 6=Sat. Backend uses 0=Mon ... 6=Sun.
export function isoWeekday(date: Date): number {
  const jsDay = date.getDay()
  return jsDay === 0 ? 6 : jsDay - 1
}
