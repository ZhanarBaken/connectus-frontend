import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DatePicker from "./DatePicker"

// Fixed "today" so month-navigation/min-max assertions are deterministic.
const TODAY = new Date("2026-07-15T12:00:00")

// jsdom does no real layout — getBoundingClientRect() and scrollHeight
// always report zero unless stubbed. The component measures both
// (trigger position + the popover's real rendered height) to position
// itself, so tests exercising that positioning logic need to fake both.
function mockTriggerRect(rect: Partial<DOMRect>) {
  const full: DOMRect = {
    top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0,
    toJSON: () => ({}),
    ...rect,
  }
  return vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(full)
}

function mockPopoverHeight(height: number) {
  // scrollHeight, not offsetHeight — the component reads scrollHeight
  // specifically so a stale CSS max-height from a previous render
  // doesn't undercount the real content height on re-measurement.
  return vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(height)
}

function mockViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true })
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true })
}

describe("DatePicker", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(TODAY)
    mockViewport(375, 700)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("shows the placeholder when there is no value", () => {
    render(<DatePicker value="" onChange={vi.fn()} placeholder="Выбери дату" />)
    expect(screen.getByText("Выбери дату")).toBeInTheDocument()
  })

  it("shows the formatted date when a value is set", () => {
    render(<DatePicker value="2026-07-20" onChange={vi.fn()} placeholder="Выбери дату" />)
    expect(screen.queryByText("Выбери дату")).not.toBeInTheDocument()
    // Exact formatting is locale-dependent (day/short-month/year) — just
    // confirm the day number made it through, not the whole string.
    expect(screen.getByRole("button", { name: /20/ })).toBeInTheDocument()
  })

  it("opens the calendar popover on click and closes it after picking a day", async () => {
    mockPopoverHeight(280)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onChange = vi.fn()
    render(<DatePicker value="" onChange={onChange} placeholder="Выбери дату" />)

    await user.click(screen.getByRole("button", { name: "Выбери дату" }))
    expect(screen.getByText(/июль 2026/)).toBeInTheDocument()

    const dayButtons = screen.getAllByRole("button", { name: "20" })
    const enabled = dayButtons.find((b) => !b.hasAttribute("disabled"))
    expect(enabled).toBeDefined()
    await user.click(enabled!)

    expect(onChange).toHaveBeenCalledWith("2026-07-20")
    expect(screen.queryByText(/июль 2026/)).not.toBeInTheDocument()
  })

  it("disables days before `min` and after `max`", async () => {
    mockPopoverHeight(280)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <DatePicker
        value=""
        onChange={vi.fn()}
        placeholder="Выбери дату"
        min="2026-07-10"
        max="2026-07-20"
      />,
    )
    await user.click(screen.getByRole("button", { name: "Выбери дату" }))

    // Day 5 is before min, day 25 is after max — both must be disabled.
    expect(screen.getAllByRole("button", { name: "5" })[0]).toBeDisabled()
    expect(screen.getAllByRole("button", { name: "25" })[0]).toBeDisabled()
    // Day 15 is inside [min, max] and must stay enabled.
    expect(screen.getAllByRole("button", { name: "15" })[0]).not.toBeDisabled()
  })

  it("closes without calling onChange when clicking outside", async () => {
    mockPopoverHeight(280)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onChange = vi.fn()
    render(
      <div>
        <DatePicker value="" onChange={onChange} placeholder="Выбери дату" />
        <button>outside</button>
      </div>,
    )
    await user.click(screen.getByRole("button", { name: "Выбери дату" }))
    expect(screen.getByText(/июль 2026/)).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByRole("button", { name: "outside" }))

    expect(screen.queryByText(/июль 2026/)).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it("closes on Escape", async () => {
    mockPopoverHeight(280)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<DatePicker value="" onChange={vi.fn()} placeholder="Выбери дату" />)
    await user.click(screen.getByRole("button", { name: "Выбери дату" }))
    expect(screen.getByText(/июль 2026/)).toBeInTheDocument()

    fireEvent.keyDown(document, { key: "Escape" })

    expect(screen.queryByText(/июль 2026/)).not.toBeInTheDocument()
  })

  function getPopoverStyle(): { top: number; maxHeight: number } {
    const popover = screen.getByTestId("date-picker-popover")
    return { top: parseFloat(popover.style.top), maxHeight: parseFloat(popover.style.maxHeight) }
  }

  it("opens below the trigger and fits within the viewport when there's plenty of room", async () => {
    mockPopoverHeight(280)
    mockTriggerRect({ top: 100, bottom: 130, left: 20, right: 100 })
    mockViewport(375, 700)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<DatePicker value="" onChange={vi.fn()} placeholder="Выбери дату" />)

    await user.click(screen.getByRole("button", { name: "Выбери дату" }))

    const { top, maxHeight } = getPopoverStyle()
    expect(top).toBe(138) // rect.bottom(130) + GAP(8)
    expect(maxHeight).toBe(280) // real height, no clamping needed
  })

  it("flips upward when there's more room above than below", async () => {
    mockPopoverHeight(280)
    mockTriggerRect({ top: 600, bottom: 630, left: 20, right: 100 })
    mockViewport(375, 700)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<DatePicker value="" onChange={vi.fn()} placeholder="Выбери дату" />)

    await user.click(screen.getByRole("button", { name: "Выбери дату" }))

    const { top, maxHeight } = getPopoverStyle()
    // spaceBelow = 700-630-8 = 62, spaceAbove = 600-8 = 592 → opens upward.
    expect(top).toBe(312) // rect.top(600) - GAP(8) - height(280)
    expect(maxHeight).toBe(280)
  })

  it("caps height and stays fully on-screen when the viewport is too short for the full popover in either direction", async () => {
    // Regression: after several rounds of hand-written clamp math kept
    // developing edge cases (a floor that could push the popover past
    // the viewport edge; a clamp missing on one side but not the other),
    // this now measures the popover's real height and runs both
    // directions through the exact same clamp function — this test
    // covers the case that broke a hand-written "minimum height" floor
    // in an earlier version: real available space below the trigger is
    // less than the popover's natural height, in a short viewport.
    mockPopoverHeight(280)
    mockTriggerRect({ top: 108, bottom: 152, left: 20, right: 100 })
    mockViewport(375, 300)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<DatePicker value="" onChange={vi.fn()} placeholder="Выбери дату" />)

    await user.click(screen.getByRole("button", { name: "Выбери дату" }))

    const { top, maxHeight } = getPopoverStyle()
    expect(top).toBeGreaterThanOrEqual(0)
    expect(top + maxHeight).toBeLessThanOrEqual(300)
    expect(screen.getByTestId("date-picker-popover")).toHaveClass("overflow-y-auto")
  })

  it("stays on-screen even when the trigger's own rect is already above the viewport", async () => {
    // A trigger rect read mid-scroll (or inside a container scrolled
    // independently of the window) can have a negative top/bottom —
    // must not push the popover off the top of the viewport either.
    mockPopoverHeight(280)
    mockTriggerRect({ top: -200, bottom: -160, left: 20, right: 100 })
    mockViewport(375, 300)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<DatePicker value="" onChange={vi.fn()} placeholder="Выбери дату" />)

    await user.click(screen.getByRole("button", { name: "Выбери дату" }))

    const { top, maxHeight } = getPopoverStyle()
    expect(top).toBeGreaterThanOrEqual(0)
    expect(top + maxHeight).toBeLessThanOrEqual(300)
  })

  it("re-measures and repositions when navigating to a month with a different row count", async () => {
    // A 5-week month grid is shorter than a 6-week one — the popover's
    // real height (and therefore its clamped position) can legitimately
    // change while it's still open, purely from month navigation.
    mockPopoverHeight(280)
    mockTriggerRect({ top: 600, bottom: 630, left: 20, right: 100 })
    mockViewport(375, 700)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<DatePicker value="" onChange={vi.fn()} placeholder="Выбери дату" />)
    await user.click(screen.getByRole("button", { name: "Выбери дату" }))
    expect(getPopoverStyle().top).toBe(312)

    mockPopoverHeight(238) // simulates a shorter (5-week) month grid
    await user.click(screen.getByRole("button", { name: "Следующий месяц" }))

    expect(getPopoverStyle().top).toBe(354) // rect.top(600) - GAP(8) - newHeight(238)
  })

  it("navigates to the next and previous month", async () => {
    mockPopoverHeight(280)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<DatePicker value="" onChange={vi.fn()} placeholder="Выбери дату" />)
    await user.click(screen.getByRole("button", { name: "Выбери дату" }))
    expect(screen.getByText(/июль 2026/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Следующий месяц" }))
    expect(screen.getByText(/август 2026/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Предыдущий месяц" }))
    await user.click(screen.getByRole("button", { name: "Предыдущий месяц" }))
    expect(screen.getByText(/июнь 2026/)).toBeInTheDocument()
  })
})
