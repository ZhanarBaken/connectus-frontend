"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useLocale, useTranslations } from "next-intl"
import { formatDateISO, formatMonthYearLabel, formatShortDateLabel, getMonthGrid } from "@/lib/schedule"
import Icon from "./Icon"

interface Props {
  value: string // ISO "YYYY-MM-DD", or "" for no selection
  onChange: (value: string) => void
  min?: string // ISO — days before this are disabled
  max?: string // ISO — days after this are disabled
  placeholder?: string
  ariaLabel?: string
  className?: string // overrides the trigger button's default styling
}

const POPOVER_WIDTH = 288
const VIEWPORT_MARGIN = 8
const GAP = 8

// Clamps `top` so the popover's bottom edge never crosses the viewport
// (true for any viewport size), and its top edge stays on-screen too for
// any realistic viewport (>= 2*VIEWPORT_MARGIN tall — i.e. always, in
// practice). `height` is first capped to fit between both margins. This
// is deliberately the ONLY place that does viewport clamping, used
// identically for "open above" and "open below", so the two directions
// can't drift out of sync with each other the way two hand-written
// mirror branches did in earlier iterations of this component (each got
// its own clamp bug at different points).
function clampTop(idealTop: number, height: number, viewportHeight: number): { top: number; maxHeight: number } {
  const maxHeight = Math.min(height, Math.max(0, viewportHeight - 2 * VIEWPORT_MARGIN))
  const minTop = VIEWPORT_MARGIN
  const maxTop = viewportHeight - VIEWPORT_MARGIN - maxHeight
  const top = Math.min(Math.max(idealTop, minTop), maxTop)
  return { top, maxHeight }
}

// Renders a compact React-owned calendar dropdown instead of the browser's
// native <input type="date"> picker — the native one is positioned by the
// browser/WebView itself and can render clipped off-screen inside a narrow
// or scrollable layout (reported inside the Telegram Mini App). Reuses the
// same month-grid utilities and day-label copy as BookingCalendar.
export default function DatePicker({ value, onChange, min, max, placeholder, ariaLabel, className }: Props) {
  const t = useTranslations("BookingCalendar")
  const locale = useLocale()
  const DAY_LABELS = [
    t("monShort"), t("tueShort"), t("wedShort"), t("thuShort"),
    t("friShort"), t("satShort"), t("sunShort"),
  ]

  const [open, setOpen] = useState(false)
  // Null until the popover has been measured post-mount — kept
  // invisible until then so there's never a frame at the wrong position.
  const [coords, setCoords] = useState<{ top: number; left: number; maxHeight: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const initial = value ? new Date(value + "T00:00:00") : new Date()
  const [visibleYear, setVisibleYear] = useState(initial.getFullYear())
  const [visibleMonth, setVisibleMonth] = useState(initial.getMonth())

  const monthGrid = getMonthGrid(visibleYear, visibleMonth)
  const monthLabel = formatMonthYearLabel(visibleYear, visibleMonth, locale, t.raw("monthsLong"))

  const goToMonth = (delta: number) => {
    const d = new Date(visibleYear, visibleMonth + delta, 1)
    setVisibleYear(d.getFullYear())
    setVisibleMonth(d.getMonth())
  }

  const prevMonthDisabled = min != null && formatDateISO(new Date(visibleYear, visibleMonth, 0)) < min
  const nextMonthDisabled = max != null && formatDateISO(new Date(visibleYear, visibleMonth + 1, 1)) > max

  const handleToggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    const base = value ? new Date(value + "T00:00:00") : new Date()
    setVisibleYear(base.getFullYear())
    setVisibleMonth(base.getMonth())
    // Force a fresh, unconstrained measurement on the next mount instead
    // of reusing a previous open's (possibly clamped) height.
    setCoords(null)
    setOpen(true)
  }

  // Measures the popover's REAL rendered height once it's in the DOM,
  // rather than guessing ahead of time — runs before the browser paints
  // (useLayoutEffect, not useEffect), so there's no visible flash between
  // the unpositioned first commit and the positioned one.
  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const popover = popoverRef.current
    if (!trigger || !popover) return

    const rect = trigger.getBoundingClientRect()
    // scrollHeight, not offsetHeight — on a month-nav re-run while
    // already clamped, offsetHeight would report the *previous* render's
    // CSS max-height instead of this render's true content height (the
    // state update that would clear it hasn't committed yet at this
    // point), permanently undercounting available room. scrollHeight
    // reflects the real content height regardless of the currently
    // applied max-height/overflow-y clamp.
    const popoverHeight = popover.scrollHeight
    const spaceBelow = window.innerHeight - rect.bottom - GAP
    const spaceAbove = rect.top - GAP
    const openUpward = spaceBelow < popoverHeight && spaceAbove > spaceBelow
    const idealTop = openUpward ? rect.top - GAP - popoverHeight : rect.bottom + GAP
    const { top, maxHeight } = clampTop(idealTop, popoverHeight, window.innerHeight)

    let left = rect.left
    if (left + POPOVER_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
      left = window.innerWidth - VIEWPORT_MARGIN - POPOVER_WIDTH
    }
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN

    setCoords({ top, left, maxHeight })
    // Re-measure on month navigation too — a 5-week vs 6-week grid
    // changes the popover's real height while it's still open.
  }, [open, visibleYear, visibleMonth])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("mousedown", onClickOutside)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousedown", onClickOutside)
    }
  }, [open])

  const displayLabel = value
    ? formatShortDateLabel(new Date(value + "T00:00:00"), locale, t.raw("monthsShort"))
    : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        onClick={handleToggle}
        className={
          className
          ?? "border border-gray-200 rounded-xl px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
        }
      >
        {displayLabel !== null ? (
          <span className="text-gray-900">{displayLabel}</span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={popoverRef}
          data-testid="date-picker-popover"
          style={{
            position: "fixed",
            top: coords?.top ?? 0,
            left: coords?.left ?? 0,
            width: POPOVER_WIDTH,
            maxHeight: coords?.maxHeight,
            visibility: coords ? "visible" : "hidden",
          }}
          className="z-[100] bg-white rounded-2xl border border-gray-200 shadow-lg overflow-y-auto"
        >
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-gray-50">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              disabled={prevMonthDisabled}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
              aria-label={t("prevMonth")}
            >
              <Icon name="chevron_left" size={18} className="text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 capitalize">{monthLabel}</span>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              disabled={nextMonthDisabled}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
              aria-label={t("nextMonth")}
            >
              <Icon name="chevron_right" size={18} className="text-gray-600" />
            </button>
          </div>

          <div className="px-2.5 pt-2.5 grid grid-cols-7 gap-1">
            {DAY_LABELS.map((label) => (
              <span key={label} className="text-[10px] font-medium uppercase text-gray-400 text-center py-1">
                {label}
              </span>
            ))}
          </div>

          <div className="px-2.5 pb-2.5 grid grid-cols-7 gap-1">
            {monthGrid.map((day) => {
              const dateStr = formatDateISO(day)
              const isOutsideMonth = day.getMonth() !== visibleMonth
              const isOutOfRange = (min != null && dateStr < min) || (max != null && dateStr > max)
              const isDisabled = isOutsideMonth || isOutOfRange
              const isSelected = value === dateStr

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => {
                    if (isDisabled) return
                    onChange(dateStr)
                    setOpen(false)
                  }}
                  disabled={isDisabled}
                  className={`py-1.5 rounded-lg text-sm text-center transition-all ${
                    isSelected
                      ? "bg-gray-900 text-white font-semibold"
                      : isDisabled
                        ? "text-gray-200 cursor-not-allowed"
                        : "hover:bg-gray-100 text-gray-900"
                  }`}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
