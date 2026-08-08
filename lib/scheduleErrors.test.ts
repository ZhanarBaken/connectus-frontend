import { describe, it, expect } from "vitest"
import { translateScheduleErrorMessage, WEEKDAY_KEYS } from "./scheduleErrors"

// Minimal stand-in for next-intl's t() — resolves the same keys the real
// Mentors.Schedule namespace defines, with {placeholder} interpolation.
function makeT(overrides: Record<string, string> = {}) {
  const messages: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
    errorEndBeforeStart: "End time must be after start time.",
    errorOverlappingWindows: "Overlapping windows on {day}.",
    errorDuplicateBlockedDate: "Date {date} is blocked twice.",
    errorOverlappingExceptions: "Overlapping exceptions on {date}.",
    saveError: "Couldn't save the schedule",
    ...overrides,
  }
  return (key: string, values?: Record<string, string | number>) => {
    let msg = messages[key] ?? `[MISSING:${key}]`
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        msg = msg.replaceAll(`{${k}}`, String(v))
      }
    }
    return msg
  }
}

describe("WEEKDAY_KEYS", () => {
  it("is Monday-first, matching apps.mentors.models Monday=0 convention", () => {
    expect(WEEKDAY_KEYS[0]).toBe("monday")
    expect(WEEKDAY_KEYS[6]).toBe("sunday")
    expect(WEEKDAY_KEYS).toHaveLength(7)
  })
})

describe("translateScheduleErrorMessage", () => {
  const t = makeT()

  it("translates end_time-before-start_time", () => {
    expect(translateScheduleErrorMessage("end_time must be strictly after start_time.", t))
      .toBe("End time must be after start time.")
  })

  it("translates overlapping weekly windows and resolves the weekday name", () => {
    expect(translateScheduleErrorMessage("Overlapping windows on weekday 0.", t))
      .toBe("Overlapping windows on Monday.")
    expect(translateScheduleErrorMessage("Overlapping windows on weekday 6.", t))
      .toBe("Overlapping windows on Sunday.")
  })

  it("does not swallow the trailing period into the extracted weekday number", () => {
    // Regression: an earlier \S+-based date regex captured "2026-08-05."
    // instead of "2026-08-05". The weekday case never had this bug (\d+
    // already stops at the period), but assert it explicitly so a future
    // refactor can't reintroduce it here either.
    const out = translateScheduleErrorMessage("Overlapping windows on weekday 2.", t)
    expect(out).not.toContain(".Wednesday")
    expect(out).toBe("Overlapping windows on Wednesday.")
  })

  it("translates a duplicate blocked date without swallowing the trailing period", () => {
    expect(translateScheduleErrorMessage("Duplicate blocked date 2026-08-05.", t))
      .toBe("Date 2026-08-05 is blocked twice.")
  })

  it("translates overlapping exception windows without swallowing the trailing period", () => {
    expect(translateScheduleErrorMessage("Overlapping exception windows on 2026-08-05.", t))
      .toBe("Overlapping exceptions on 2026-08-05.")
  })

  it("translates the generic save/load failure fallback", () => {
    expect(translateScheduleErrorMessage("Failed to save schedule", t)).toBe("Couldn't save the schedule")
    expect(translateScheduleErrorMessage("Failed to load schedule", t)).toBe("Couldn't save the schedule")
  })

  it("falls back to the raw text for an unrecognized message", () => {
    expect(translateScheduleErrorMessage("Something totally unexpected.", t))
      .toBe("Something totally unexpected.")
  })

  it("degrades gracefully for an out-of-range weekday number instead of throwing", () => {
    expect(translateScheduleErrorMessage("Overlapping windows on weekday 9.", t))
      .toBe("Overlapping windows on .")
  })
})
