// Shared by mentors/schedule (the settings page) and onboarding/mentor
// (the initial setup flow) — both call saveMyMentorSchedule against the
// same backend endpoint and need the same error translation.

// Monday=0 convention, matches apps.mentors.models.MentorAvailability.weekday
// and each caller's own day-label array.
export const WEEKDAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

// apps.mentors.serializers.MentorScheduleSerializer / MentorAvailabilityWindowSerializer /
// AvailabilityExceptionSerializer raise plain English text with no locale
// awareness — translate the ones a mentor can realistically hit; anything
// unrecognized falls back to the raw text rather than showing nothing.
// `t` must be bound to the "Mentors.Schedule" namespace (for the
// monday..sunday day-name keys plus the error keys below).
export function translateScheduleErrorMessage(raw: string, t: (key: string, values?: Record<string, string | number>) => string): string {
  const lower = raw.toLowerCase()
  if (lower.includes("end_time must be strictly after start_time")) {
    return t("errorEndBeforeStart")
  }
  if (lower.includes("overlapping windows on weekday")) {
    const match = raw.match(/weekday (\d+)/)
    const weekdayNum = match ? Number(match[1]) : null
    const day = weekdayNum !== null && WEEKDAY_KEYS[weekdayNum] ? t(WEEKDAY_KEYS[weekdayNum]) : ""
    return t("errorOverlappingWindows", { day })
  }
  if (lower.includes("duplicate blocked date")) {
    // `\d{4}-\d{2}-\d{2}` (not `\S+`) so a sentence-ending period isn't
    // swallowed into the captured date.
    const match = raw.match(/(\d{4}-\d{2}-\d{2})/)
    return t("errorDuplicateBlockedDate", { date: match ? match[1] : "" })
  }
  if (lower.includes("overlapping exception windows on")) {
    const match = raw.match(/(\d{4}-\d{2}-\d{2})/)
    return t("errorOverlappingExceptions", { date: match ? match[1] : "" })
  }
  if (lower.includes("failed to save schedule") || lower.includes("failed to load schedule")) {
    return t("saveError")
  }
  return raw
}
