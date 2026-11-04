"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import CountryPickerModal from "./CountryPickerModal"
import { countryFlag, countryLabel } from "@/lib/countries"

export default function StudentDesiredCountries({ value, onChange }: {
  value: string[]
  onChange: (codes: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const locale = useLocale()
  const t = useTranslations("CountrySelect")
  return (
    <div className="flex flex-wrap gap-2">
      {value.map((code) => (
        <button key={code} type="button" aria-pressed="true"
          className="border rounded-xl px-3 py-2 text-sm"
          onClick={() => onChange(value.filter((selected) => selected !== code))}>
          {countryFlag(code)} {countryLabel(code, locale)} ×
        </button>
      ))}
      <button type="button" className="border rounded-xl px-3 py-2 text-sm" onClick={() => setOpen(true)}>
        {t("otherCountry")}
      </button>
      <CountryPickerModal open={open} selected={value} hiddenCodes={[]}
        onSelect={(code) => { if (!value.includes(code)) onChange([...value, code]) }}
        onClose={() => setOpen(false)} />
    </div>
  )
}
