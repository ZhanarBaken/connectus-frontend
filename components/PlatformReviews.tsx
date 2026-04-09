"use client"

import { useEffect, useState } from "react"
import { getPlatformReviews, type Review } from "@/lib/reviews"
import Icon from "./Icon"

export default function PlatformReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setReviews(getPlatformReviews())
  }, [])

  if (!mounted) return null

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center max-w-xl mx-auto">
        <div className="mb-3 flex justify-center">
          <Icon name="chat" size={40} className="text-gray-300" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">Отзывов пока нет</h3>
        <p className="text-sm text-gray-400">
          Будь первым — после консультации с ментором ты сможешь оставить отзыв
        </p>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {reviews.slice(0, 6).map((r) => (
        <div key={r.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={`text-sm ${s <= r.rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>
            ))}
          </div>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">&ldquo;{r.text}&rdquo;</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-sm">{r.authorName.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">{r.authorName}</div>
              <div className="text-xs text-gray-400">
                {new Date(r.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
