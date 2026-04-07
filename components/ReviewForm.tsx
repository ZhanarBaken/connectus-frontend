"use client"

import { useState } from "react"
import { addReview, hasReviewForOrder } from "@/lib/reviews"

interface Props {
  orderId: number
  mentorId: number
  mentorName: string
  authorName: string
  onSubmitted?: () => void
}

type Target = "platform" | "mentor"

export default function ReviewForm({ orderId, mentorId, mentorName, authorName, onSubmitted }: Props) {
  const [target, setTarget] = useState<Target>("mentor")
  const [rating, setRating] = useState(5)
  const [text, setText] = useState("")
  const [submitted, setSubmitted] = useState(() =>
    hasReviewForOrder(orderId, "mentor") && hasReviewForOrder(orderId, "platform")
  )
  const [error, setError] = useState("")

  const mentorDone = hasReviewForOrder(orderId, "mentor")
  const platformDone = hasReviewForOrder(orderId, "platform")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (text.trim().length < 10) {
      setError("Минимум 10 символов")
      return
    }
    if (hasReviewForOrder(orderId, target)) {
      setError("Отзыв уже оставлен")
      return
    }
    addReview({
      orderId,
      mentorId,
      mentorName,
      target,
      rating,
      text: text.trim(),
      authorName: authorName || "Аноним",
    })
    setText("")
    setRating(5)
    if (hasReviewForOrder(orderId, "mentor") && hasReviewForOrder(orderId, "platform")) {
      setSubmitted(true)
    } else {
      // switch to the other target
      setTarget(target === "mentor" ? "platform" : "mentor")
    }
    onSubmitted?.()
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
        <div className="text-2xl mb-2">✓</div>
        <p className="text-sm font-semibold text-green-800">Спасибо за отзывы!</p>
        <p className="text-xs text-green-700 mt-1">Они помогают другим студентам сделать выбор</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Оставить отзыв</h3>

      {/* Target picker */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          type="button"
          disabled={mentorDone}
          onClick={() => setTarget("mentor")}
          className={`px-3 py-2.5 rounded-xl text-xs font-medium border-2 transition-all ${
            target === "mentor"
              ? "border-indigo-400 bg-indigo-50 text-indigo-700"
              : mentorDone
                ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                : "border-gray-100 text-gray-600 hover:border-gray-200"
          }`}
        >
          {mentorDone ? "✓ Ментору" : "Ментору"}
        </button>
        <button
          type="button"
          disabled={platformDone}
          onClick={() => setTarget("platform")}
          className={`px-3 py-2.5 rounded-xl text-xs font-medium border-2 transition-all ${
            target === "platform"
              ? "border-indigo-400 bg-indigo-50 text-indigo-700"
              : platformDone
                ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                : "border-gray-100 text-gray-600 hover:border-gray-200"
          }`}
        >
          {platformDone ? "✓ Платформе" : "Платформе"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Оценка</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                className={`text-3xl leading-none transition-transform duration-150 hover:scale-110 ${
                  s <= rating ? "text-yellow-400" : "text-gray-200"
                }`}
                aria-label={`${s} звёзд`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Text */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            {target === "mentor" ? "Что понравилось в работе ментора?" : "Расскажи о своём опыте на платформе"}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={target === "mentor"
              ? "Например: помог с эссе, объяснил все детали поступления..."
              : "Например: удобный сайт, быстро нашёл подходящего ментора..."
            }
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Опубликовать отзыв
        </button>
      </form>
    </div>
  )
}
