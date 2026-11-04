"use client"

import { useTranslations } from "next-intl"

export default function ScheduleTimezoneNotice({ error, timeZone, retry }: {
  error: boolean
  timeZone: string
  retry: () => void
}) {
  const t = useTranslations("ScheduleTimezone")
  if (!error) return null
  return (
    <p role="status" className="px-4 py-2 text-xs text-amber-800">
      {t("unavailable", { timeZone })}{" "}
      <button type="button" onClick={retry} className="underline">{t("retry")}</button>
    </p>
  )
}
