"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ALL_COUNTRY_CODES, countryFlag, countryLabel } from "@/lib/countries"

interface Props {
  open: boolean
  // Codes already selected — shown with a check and disabled-feel; reuse to
  // avoid double-adding via the picker (toggle is still possible from the
  // popular-row buttons).
  selected: string[]
  // Codes already exposed in the popular row — the picker hides them so
  // the list stays focused on "everything else".
  hiddenCodes: string[]
  onSelect: (code: string) => void
  onClose: () => void
}

// Modal that lets a user choose any ISO 3166-1 country, not just the
// popular nine. Filterable by typed search against the localized name
// (Intl.DisplayNames) and the raw ISO code.
export default function CountryPickerModal({
  open,
  selected,
  hiddenCodes,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Build the candidate list once per `hiddenCodes` change.
  // Sort by localized name so users see countries in alphabetical order
  // they expect for their locale.
  const candidates = useMemo(() => {
    const hidden = new Set(hiddenCodes.map((c) => c.toUpperCase()))
    const items = ALL_COUNTRY_CODES
      .filter((c) => !hidden.has(c))
      .map((c) => ({ code: c, label: countryLabel(c) }))
    items.sort((a, b) => a.label.localeCompare(b.label, "ru"))
    return items
  }, [hiddenCodes])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter(
      (c) => c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    )
  }, [candidates, query])

  // Focus search input on open + reset query when reopening.
  useEffect(() => {
    if (open) {
      setQuery("")
      // Defer to next tick so the input is mounted.
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape; also close on click outside the dialog box.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const selectedSet = new Set(selected.map((c) => c.toUpperCase()))

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[85vh] sm:max-h-[600px]"
      >
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Выбери страну</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="text-gray-400 hover:text-gray-700 p-1"
            >
              ✕
            </button>
          </div>
          <input
            ref={inputRef}
            type="search"
            placeholder="Поиск..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
          />
        </div>

        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Ничего не нашлось</p>
          ) : (
            <ul>
              {filtered.map((item) => {
                const isSelected = selectedSet.has(item.code)
                return (
                  <li key={item.code}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(item.code)
                        onClose()
                      }}
                      className={`w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                        isSelected ? "bg-indigo-50" : ""
                      }`}
                    >
                      <span className="text-xl">{countryFlag(item.code)}</span>
                      <span className="flex-1 text-sm text-gray-900">{item.label}</span>
                      {isSelected && (
                        <span className="text-xs text-indigo-600 font-medium">Выбрано</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
