"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { fetchAllReviews, type Review } from "@/lib/reviews"
import Icon from "./Icon"

export default function PlatformReviews() {
  const t = useTranslations("PlatformReviews")
  const locale = useLocale()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchAllReviews()
      .then((data) => setReviews(data))
      .finally(() => setLoaded(true))
  }, [])

  if (!loaded) return null

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-xl mx-auto">
        <div className="mb-3 flex justify-center">
          <Icon name="chat" size={40} className="text-gray-300" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">{t("emptyTitle")}</h3>
        <p className="text-sm text-gray-400">
          {t("emptyBody")}
        </p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {reviews.slice(0, 6).map((r) => (
        <div key={r.id} className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={`text-sm ${s <= r.rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>
            ))}
          </div>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">&ldquo;{r.text}&rdquo;</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{r.student_full_name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">{r.student_full_name}</div>
              <div className="text-xs text-gray-400">
                {new Date(r.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
