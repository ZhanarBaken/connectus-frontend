"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { fetchMentorProfile } from "@/lib/api"
import Icon from "@/components/Icon"

const richTags = {
  strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
}

// Sticky-баннер для менторов с тремя состояниями:
//   красный — профиль не подан на проверку, студенты пока не видят
//   жёлтый  — подан и ждёт админа
//   ничего  — профиль одобрен либо ещё грузится / не ментор
//
// Принимает либо пару флагов от родителя (тогда нулевой fetch), либо
// без пропсов — тогда сам один раз дёрнет /mentors/profile/me/. В
// последнем случае при role != mentor запрос упадёт с 403 — глотаем и
// просто не рендерим, чтобы баннер не мерцал у студентов / админов,
// случайно открывших mentor-страницу.

interface Props {
  isSubmitted?: boolean | null
  isApproved?: boolean | null
}

export default function MentorStatusBanner({
  isSubmitted: isSubmittedProp,
  isApproved: isApprovedProp,
}: Props) {
  const t = useTranslations("MentorStatusBanner")
  const [fetched, setFetched] = useState<{
    isSubmitted: boolean
    isApproved: boolean
  } | null>(null)

  const propsProvided = isSubmittedProp != null && isApprovedProp != null

  useEffect(() => {
    if (propsProvided) return
    if (typeof window === "undefined") return
    if (!localStorage.getItem("access_token")) return
    let cancelled = false
    fetchMentorProfile()
      .then((p) => {
        if (cancelled) return
        setFetched({ isSubmitted: p.is_submitted, isApproved: p.is_approved })
      })
      .catch(() => {
        // 403 (не ментор) / 404 (нет профиля) / 5xx — молча скрываемся.
      })
    return () => { cancelled = true }
  }, [propsProvided])

  const state = propsProvided
    ? { isSubmitted: isSubmittedProp as boolean, isApproved: isApprovedProp as boolean }
    : fetched

  if (state === null) return null
  if (state.isApproved) return null

  if (state.isSubmitted) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-amber-900">
          <Icon name="hourglass_empty" size={18} className="text-amber-600 flex-shrink-0" />
          <p>
            {t.rich("underReviewBody", richTags)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-sm text-red-900 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon name="warning" size={18} className="text-red-600 flex-shrink-0" filled />
          <p>
            {t.rich("notSubmittedBody", richTags)}
          </p>
        </div>
        <Link
          href="/mentor/dashboard"
          className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
        >
          {t("goToSubmit")}
          <Icon name="arrow_forward" size={14} />
        </Link>
      </div>
    </div>
  )
}
