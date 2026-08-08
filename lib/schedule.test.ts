import { describe, it, expect } from "vitest"
import {
  emptyWeekSchedule,
  flatToWeekSchedule,
  weekScheduleToFlat,
  formatDateISO,
  getNextDays,
  getMonthGrid,
  isoWeekday,
  DAY_LABELS,
  DAY_LABELS_FULL,
  type ScheduleWindow,
  type WeekSchedule,
} from "./schedule"

describe("emptyWeekSchedule", () => {
  it("returns all 7 days disabled with no slots", () => {
    const week = emptyWeekSchedule()
    expect(Object.keys(week)).toHaveLength(7)
    for (let day = 0; day <= 6; day++) {
      expect(week[day]).toEqual({ enabled: false, slots: [] })
    }
  })

  it("returns independent day objects (mutating one doesn't affect another)", () => {
    const week = emptyWeekSchedule()
    week[0].enabled = true
    week[0].slots.push({ start: "10:00", end: "11:00" })
    expect(week[1].enabled).toBe(false)
    expect(week[1].slots).toEqual([])
  })
})

describe("flatToWeekSchedule", () => {
  it("converts an empty list to an all-disabled week", () => {
    const week = flatToWeekSchedule([])
    expect(week).toEqual(emptyWeekSchedule())
  })

  it("enables the day and adds the slot for each window", () => {
    const windows: ScheduleWindow[] = [
      { weekday: 0, start_time: "09:00", end_time: "10:00" },
      { weekday: 0, start_time: "14:00", end_time: "15:00" },
      { weekday: 3, start_time: "08:00", end_time: "09:00" },
    ]
    const week = flatToWeekSchedule(windows)
    expect(week[0].enabled).toBe(true)
    expect(week[0].slots).toEqual([
      { start: "09:00", end: "10:00" },
      { start: "14:00", end: "15:00" },
    ])
    expect(week[3].enabled).toBe(true)
    expect(week[3].slots).toEqual([{ start: "08:00", end: "09:00" }])
    // Untouched days stay disabled.
    expect(week[1]).toEqual({ enabled: false, slots: [] })
  })
})

describe("weekScheduleToFlat", () => {
  it("returns an empty array when no day is enabled", () => {
    expect(weekScheduleToFlat(emptyWeekSchedule())).toEqual([])
  })

  it("skips disabled days even if they have slots", () => {
    const week: WeekSchedule = emptyWeekSchedule()
    week[2] = { enabled: false, slots: [{ start: "09:00", end: "10:00" }] }
    expect(weekScheduleToFlat(week)).toEqual([])
  })

  it("flattens enabled days with multiple slots into ScheduleWindow entries", () => {
    const week: WeekSchedule = emptyWeekSchedule()
    week[1] = {
      enabled: true,
      slots: [
        { start: "09:00", end: "10:00" },
        { start: "11:00", end: "12:00" },
      ],
    }
    week[5] = { enabled: true, slots: [{ start: "13:00", end: "14:00" }] }
    const flat = weekScheduleToFlat(week)
    expect(flat).toEqual([
      { weekday: 1, start_time: "09:00", end_time: "10:00" },
      { weekday: 1, start_time: "11:00", end_time: "12:00" },
      { weekday: 5, start_time: "13:00", end_time: "14:00" },
    ])
  })

  it("round-trips through flatToWeekSchedule", () => {
    const windows: ScheduleWindow[] = [
      { weekday: 0, start_time: "09:00", end_time: "10:00" },
      { weekday: 6, start_time: "20:00", end_time: "21:00" },
    ]
    const roundTripped = weekScheduleToFlat(flatToWeekSchedule(windows))
    expect(roundTripped).toEqual(windows)
  })
})

describe("formatDateISO", () => {
  // Constructed with the local-timezone Date constructor, matching every
  // real caller (getNextDays/getMonthGrid build local-midnight dates) —
  // a Z-suffixed UTC literal would only coincidentally match in
  // timezones that don't cross a calendar-day boundary from UTC.
  it("formats a local date as YYYY-MM-DD", () => {
    expect(formatDateISO(new Date(2026, 4, 12))).toBe("2026-05-12")
  })

  it("pads single-digit month/day", () => {
    expect(formatDateISO(new Date(2026, 0, 5))).toBe("2026-01-05")
  })

  it("is not shifted by a UTC+ host timezone (regression: previously routed through toISOString, rolling the date back one day east of UTC)", () => {
    // Asia/Almaty is UTC+5 — local midnight on the 1st is 19:00 UTC on
    // the *previous* day, which is exactly the case toISOString() got
    // wrong.
    expect(formatDateISO(new Date(2026, 6, 1))).toBe("2026-07-01")
  })
})

describe("getNextDays", () => {
  it("returns `count` consecutive days starting from the given date", () => {
    const start = new Date("2026-05-12T12:00:00.000Z")
    const days = getNextDays(5, start)
    expect(days).toHaveLength(5)
    expect(formatDateISO(days[0])).toBe("2026-05-12")
    expect(formatDateISO(days[4])).toBe("2026-05-16")
  })

  it("defaults to today when startFrom is omitted", () => {
    const days = getNextDays(1)
    expect(formatDateISO(days[0])).toBe(formatDateISO(new Date()))
  })

  it("returns an empty array for count 0", () => {
    expect(getNextDays(0, new Date("2026-05-12T00:00:00.000Z"))).toEqual([])
  })

  it("rolls over month boundaries correctly", () => {
    const start = new Date("2026-05-30T12:00:00.000Z")
    const days = getNextDays(3, start)
    expect(days.map(formatDateISO)).toEqual(["2026-05-30", "2026-05-31", "2026-06-01"])
  })
})

describe("isoWeekday", () => {
  it("maps Sunday (JS 0) to ISO 6", () => {
    // 2026-05-17 is a Sunday.
    expect(isoWeekday(new Date(2026, 4, 17))).toBe(6)
  })

  it("maps Monday (JS 1) to ISO 0", () => {
    // 2026-05-18 is a Monday.
    expect(isoWeekday(new Date(2026, 4, 18))).toBe(0)
  })

  it("maps Saturday (JS 6) to ISO 5", () => {
    // 2026-05-16 is a Saturday.
    expect(isoWeekday(new Date(2026, 4, 16))).toBe(5)
  })
})

describe("getMonthGrid", () => {
  it("always returns a multiple of 7 dates", () => {
    for (let month = 0; month < 12; month++) {
      const grid = getMonthGrid(2026, month)
      expect(grid.length % 7).toBe(0)
    }
  })

  it("first cell is always a Monday and last cell always a Sunday", () => {
    const grid = getMonthGrid(2026, 4) // May 2026
    expect(isoWeekday(grid[0])).toBe(0)
    expect(isoWeekday(grid[grid.length - 1])).toBe(6)
  })

  it("contains every day of the target month", () => {
    const grid = getMonthGrid(2026, 4) // May 2026 has 31 days
    const mayDates = grid.filter((d) => d.getMonth() === 4 && d.getFullYear() === 2026)
    expect(mayDates).toHaveLength(31)
    expect(mayDates[0].getDate()).toBe(1)
    expect(mayDates[30].getDate()).toBe(31)
  })

  it("pads a month that starts on Monday with zero leading days", () => {
    // 2026-06-01 is a Monday.
    const grid = getMonthGrid(2026, 5)
    expect(grid[0].getMonth()).toBe(5)
    expect(grid[0].getDate()).toBe(1)
  })

  it("handles February in a leap year", () => {
    const grid = getMonthGrid(2028, 1) // 2028 is a leap year
    const febDates = grid.filter((d) => d.getMonth() === 1 && d.getFullYear() === 2028)
    expect(febDates).toHaveLength(29)
  })
})

describe("DAY_LABELS / DAY_LABELS_FULL", () => {
  it("both have exactly 7 entries in Mon..Sun order", () => {
    expect(DAY_LABELS).toHaveLength(7)
    expect(DAY_LABELS_FULL).toHaveLength(7)
    expect(DAY_LABELS[0]).toBe("Пн")
    expect(DAY_LABELS_FULL[0]).toBe("Понедельник")
    expect(DAY_LABELS[6]).toBe("Вс")
    expect(DAY_LABELS_FULL[6]).toBe("Воскресенье")
  })
})
