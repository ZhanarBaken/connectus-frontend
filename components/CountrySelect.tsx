"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { CIS_COUNTRY_CODES, countryFlag, countryLabel } from "@/lib/countries"
import CountryPickerModal from "@/components/CountryPickerModal"

interface Props {
  value: string
  onChange: (code: string) => void
}

// Single-select "which country are YOU based in" picker — a row of
// popular CIS one-tap chips (the platform's actual current user base)
// plus a search modal (reuses CountryPickerModal) for anyone else.
// Distinct from the mentor's multi-select "which countries do you help
// students get into" picker on the onboarding page, which uses a
// different popular-code list (POPULAR_COUNTRY_CODES).
export default function CountrySelect({ value, onChange }: Props) {
  const t = useTranslations("CountrySelect")
  const locale = useLocale()
  const [pickerOpen, setPickerOpen] = useState(false)
  const isOtherSelected = !(CIS_COUNTRY_CODES as readonly string[]).includes(value)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("label")}</label>
      <div className="grid grid-cols-3 gap-2">
        {CIS_COUNTRY_CODES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`px-2 py-2 rounded-xl text-xs border-2 font-medium transition-all text-left ${
              value === c
                ? "border-gray-900 bg-gray-50 text-gray-900"
                : "border-gray-100 text-gray-600 hover:border-gray-200"
            }`}
          >
            {value === c && <span className="mr-1">✓</span>}
            {countryFlag(c)} {countryLabel(c, locale)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={`col-span-3 px-2 py-2 rounded-xl text-xs border-2 font-medium transition-all text-left ${
            isOtherSelected
              ? "border-gray-900 bg-gray-50 text-gray-900"
              : "border-dashed border-gray-300 text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
          }`}
        >
          {isOtherSelected
            ? <>{countryFlag(value)} {countryLabel(value, locale)}</>
            : t("otherCountry")}
        </button>
      </div>
      <CountryPickerModal
        open={pickerOpen}
        selected={[value]}
        hiddenCodes={[...CIS_COUNTRY_CODES]}
        onSelect={(code) => onChange(code)}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  )
}
