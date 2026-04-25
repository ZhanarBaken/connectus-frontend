"use client"

import { useState, useEffect } from "react"
import { createReview, hasReviewForOrder } from "@/lib/reviews"

interface Props {
  orderId: number
  mentorId: number
  mentorName: string
  authorName: string
  onSubmitted?: () => void
}

export default function ReviewForm({ orderId, mentorId, mentorName, authorName, onSubmitted }: Props) {
  const [rating, setRating] = useState(5)
  const [text, setText] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    hasReviewForOrder(orderId).then((done) => {
      setSubmitted(done)
      setLoading(false)
    })
  }, [orderId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (text.trim().length < 10) {
      setError("Минимум 10 символов")
      return
    }
    setSubmitting(true)
    try {
      await createReview(orderId, rating, text.trim())
      setSubmitted(true)
      setText("")
      setRating(5)
      onSubmitted?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось оставить отзыв")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
        <div className="text-2xl mb-2">✓</div>
        <p className="text-sm font-semibold text-green-800">Спасибо за отзыв!</p>
        <p className="text-xs text-green-700 mt-1">Он помогает другим студентам сделать выбор</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Оставить отзыв ментору</h3>

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
            Что понравилось в работе ментора?
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Например: помог с эссе, объяснил все детали поступления..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {submitting ? "Отправляем..." : "Опубликовать отзыв"}
        </button>
      </form>
    </div>
  )
}
