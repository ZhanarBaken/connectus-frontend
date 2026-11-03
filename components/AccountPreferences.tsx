"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import CountrySelect from "@/components/CountrySelect"
import type { User } from "@/types"

type Preferences = { country?: string; time_zone?: string }

export default function AccountPreferences({ me, onUpdate }: {
  me: User
  onUpdate: (preferences: Preferences) => Promise<User>
}) {
  const t = useTranslations("AccountPreferences")
  const [baseline, setBaseline] = useState(me)
  const [country, setCountry] = useState("")
  const [timeZone, setTimeZone] = useState(me.time_zone ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [confirmed, setConfirmed] = useState(Boolean(me.country_declared_at))
  async function save(field: "country" | "time_zone") {
    setError("")
    setSaved(false)
    const preferences: Preferences = {}
    if (field === "country") preferences.country = country
    if (field === "time_zone") {
      const selectedTimeZone = timeZone.trim()
      if (!selectedTimeZone) {
        setError(t("invalidTimeZone"))
        return
      }
      try {
        new Intl.DateTimeFormat("en", { timeZone: selectedTimeZone })
      } catch (error) {
        if (!(error instanceof RangeError)) throw error
        setError(t("invalidTimeZone"))
        return
      }
      preferences.time_zone = selectedTimeZone
    }
    setSaving(true)
    try {
      const updated = await onUpdate(preferences)
      setBaseline(updated)
      if (field === "country") setCountry("")
      if (field === "time_zone") setTimeZone(updated.time_zone ?? "")
      setConfirmed(Boolean(updated.country_declared_at))
      setSaved(true)
    } catch (error) {
      if (!(error instanceof Error)) throw error
      setError(t("saveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">{t("title")}</h2>
      {!confirmed && <p className="text-sm text-gray-600 mb-3">{t("countryUnknown")}</p>}
      <fieldset disabled={saving} className="space-y-4">
        <CountrySelect value={country || (confirmed ? baseline.country ?? "" : "")} onChange={(value) => { setCountry(value); setSaved(false) }} />
        <button disabled={!country || saving} className="rounded-xl bg-gray-900 text-white px-4 py-2 disabled:opacity-50" type="button" onClick={() => save("country")}>{t("saveCountry")}</button>
        <label className="block text-sm font-medium">
          {t("timeZone")}
          <input className="block w-full border rounded-xl p-2 mt-1" value={timeZone} placeholder="Asia/Almaty" onChange={(event) => { setTimeZone(event.target.value); setSaved(false) }} />
        </label>
        <p className="text-sm text-gray-500">{t("timeZoneHelp")}</p>
        <button disabled={timeZone === (baseline.time_zone ?? "") || saving} className="rounded-xl bg-gray-900 text-white px-4 py-2 disabled:opacity-50" type="button" onClick={() => save("time_zone")}>{t("saveTimeZone")}</button>
      </fieldset>
      {error && <p role="alert" className="text-red-600 mt-3">{error}</p>}
      {saved && <p role="status" className="text-green-700 mt-3">{t("saved")}</p>}
    </section>
  )
}
