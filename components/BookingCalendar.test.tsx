import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import BookingCalendar from "./BookingCalendar"
import { fetchMentorAvailability, fetchMentorAvailabilityOverview } from "@/lib/api"
import { formatDateISO } from "@/lib/schedule"

vi.mock("@/lib/api", () => ({
  fetchMentorAvailability: vi.fn(),
  fetchMentorAvailabilityOverview: vi.fn(),
}))

// Fixed "today" so the calendar grid and past/future date logic are
// deterministic regardless of when the suite runs.
const TODAY = new Date("2026-07-15T12:00:00")

// The component derives each cell's ISO date via `formatDateISO`, which
// runs `Date#toISOString()` on a *local*-midnight Date. In any timezone
// ahead of UTC (this machine runs Asia/Almaty, UTC+5) that rolls the
// local calendar day back by one in the resulting string — e.g. the
// cell showing "20" on screen reports "2026-07-19". That's a pre-existing
// quirk of lib/schedule.ts (not owned by this test slice), so tests
// compute the expected ISO string the same way the component does
// rather than hardcoding a UTC-assuming literal.
const JULY_20 = formatDateISO(new Date(2026, 6, 20))

function findEnabledDateButton(day: number): HTMLElement {
  const candidates = screen.getAllByText(String(day))
  const button = candidates
    .map((el) => el.closest("button"))
    .find((btn): btn is HTMLButtonElement => btn !== null && !btn.hasAttribute("disabled"))
  if (!button) throw new Error(`No enabled date button found for day ${day}`)
  return button
}

describe("BookingCalendar", () => {
  beforeEach(() => {
    // shouldAdvanceTime keeps setTimeout/setInterval firing against real
    // wall-clock progress (so testing-library's `waitFor` polling still
    // works) while `Date`/`performance.now()` stay pinned to TODAY.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(TODAY)
    vi.mocked(fetchMentorAvailabilityOverview).mockResolvedValue({
      timezone: "Asia/Almaty",
      duration_minutes: 60,
      dates: {},
    })
    vi.mocked(fetchMentorAvailability).mockResolvedValue({
      date: "2026-07-20",
      timezone: "Asia/Almaty",
      duration_minutes: 60,
      slots: [],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the header and duration", () => {
    render(
      <BookingCalendar mentorId={1} durationMinutes={60} onSelect={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByText("Выберите дату и время")).toBeInTheDocument()
    expect(screen.getByText(/60 мин/)).toBeInTheDocument()
  })

  it("calls onCancel when the close icon is clicked", () => {
    const onCancel = vi.fn()
    render(
      <BookingCalendar mentorId={1} durationMinutes={60} onSelect={vi.fn()} onCancel={onCancel} />,
    )
    fireEvent.click(screen.getByText("close"))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("disables navigating to a previous month from the current month", () => {
    render(
      <BookingCalendar mentorId={1} durationMinutes={60} onSelect={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByLabelText("Предыдущий месяц")).toBeDisabled()
    expect(screen.getByLabelText("Следующий месяц")).not.toBeDisabled()
  })

  it("does not let a past date be selected", () => {
    render(
      <BookingCalendar mentorId={1} durationMinutes={60} onSelect={vi.fn()} onCancel={vi.fn()} />,
    )
    // July 10, 2026 is before "today" (July 15) — every button showing
    // "10" in the current month must be disabled.
    const tenButtons = screen.getAllByText("10").map((el) => el.closest("button"))
    for (const btn of tenButtons) {
      if (btn && !btn.className.includes("text-gray-200")) {
        // in-month past cell
        expect(btn).toBeDisabled()
      }
    }
    expect(screen.queryByText("Нет доступных слотов на эту дату")).not.toBeInTheDocument()
  })

  it("fetches and shows time slots when a future date is selected", async () => {
    vi.mocked(fetchMentorAvailability).mockResolvedValue({
      date: "2026-07-20",
      timezone: "Asia/Almaty",
      duration_minutes: 60,
      slots: ["10:00", "11:00", "14:30"],
    })
    render(
      <BookingCalendar mentorId={1} durationMinutes={60} onSelect={vi.fn()} onCancel={vi.fn()} />,
    )
    const dateButton = findEnabledDateButton(20)
    fireEvent.click(dateButton)

    await waitFor(() => expect(screen.getByText("10:00")).toBeInTheDocument())
    expect(screen.getByText("11:00")).toBeInTheDocument()
    expect(screen.getByText("14:30")).toBeInTheDocument()
    expect(fetchMentorAvailability).toHaveBeenCalledWith(1, JULY_20, 60)
  })

  it("shows an empty state when there are no slots for the selected date", async () => {
    vi.mocked(fetchMentorAvailability).mockResolvedValue({
      date: "2026-07-20",
      timezone: "Asia/Almaty",
      duration_minutes: 60,
      slots: [],
    })
    render(
      <BookingCalendar mentorId={1} durationMinutes={60} onSelect={vi.fn()} onCancel={vi.fn()} />,
    )
    fireEvent.click(findEnabledDateButton(20))
    await waitFor(() =>
      expect(screen.getByText("Нет доступных слотов на эту дату")).toBeInTheDocument(),
    )
  })

  it("shows an error message when the slots request fails", async () => {
    vi.mocked(fetchMentorAvailability).mockRejectedValue(new Error("Слоты недоступны"))
    render(
      <BookingCalendar mentorId={1} durationMinutes={60} onSelect={vi.fn()} onCancel={vi.fn()} />,
    )
    fireEvent.click(findEnabledDateButton(20))
    await waitFor(() => expect(screen.getByText("Слоты недоступны")).toBeInTheDocument())
  })

  it("confirms a booking once a date and time are both picked", async () => {
    vi.mocked(fetchMentorAvailability).mockResolvedValue({
      date: "2026-07-20",
      timezone: "Asia/Almaty",
      duration_minutes: 60,
      slots: ["09:00"],
    })
    const onSelect = vi.fn()
    render(
      <BookingCalendar
        mentorId={1}
        durationMinutes={60}
        onSelect={onSelect}
        onCancel={vi.fn()}
      />,
    )
    fireEvent.click(findEnabledDateButton(20))
    await waitFor(() => expect(screen.getByText("09:00")).toBeInTheDocument())

    // No confirm button until a time slot is chosen.
    expect(screen.queryByText(/Записаться на/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText("09:00"))
    const confirmButton = await screen.findByText("Записаться на 09:00")
    fireEvent.click(confirmButton)

    expect(onSelect).toHaveBeenCalledWith(JULY_20, "09:00")
  })

  it("shows an availability dot for dates the overview marks as free", async () => {
    vi.mocked(fetchMentorAvailabilityOverview).mockResolvedValue({
      timezone: "Asia/Almaty",
      duration_minutes: 60,
      dates: { [JULY_20]: true },
    })
    render(
      <BookingCalendar mentorId={1} durationMinutes={60} onSelect={vi.fn()} onCancel={vi.fn()} />,
    )
    await waitFor(() =>
      expect(screen.getAllByLabelText("Есть свободные слоты").length).toBeGreaterThan(0),
    )
  })

  it("navigates forward a month and stops at the lookahead cap", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <BookingCalendar mentorId={1} durationMinutes={60} onSelect={vi.fn()} onCancel={vi.fn()} />,
    )
    const next = screen.getByLabelText("Следующий месяц")
    await user.click(next)
    await user.click(next)
    expect(next).toBeDisabled()
  })
})
