"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { fetchMentorProfile } from "@/lib/api"
import Icon from "@/components/Icon"

const richTags = {
  strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
}

// Sticky-баннер для менторов с двумя состояниями:
//   индиго   — профиль подан и ждёт админа
//   ничего   — профиль одобрен либо ещё грузится / не ментор
//
// Все страницы, где рендерится этот баннер, уже защищены
// useMentorOnboardingGate() — не-submitted ментор до них не доходит,
// так что третье состояние ("не подан") здесь больше не нужно.
//
// Принимает либо isApproved от родителя (тогда нулевой fetch), либо
// без пропсов — тогда сам один раз дёрнет /mentors/profile/me/. В
// последнем случае при role != mentor запрос упадёт с 403 — глотаем и
// просто не рендерим, чтобы баннер не мерцал у студентов / админов,
// случайно открывших mentor-страницу.

interface Props {
  isApproved?: boolean | null
}

export default function MentorStatusBanner({ isApproved: isApprovedProp }: Props) {
  const t = useTranslations("MentorStatusBanner")
  const [fetchedIsApproved, setFetchedIsApproved] = useState<boolean | null>(null)

  const propsProvided = isApprovedProp != null

  useEffect(() => {
    if (propsProvided) return
    if (typeof window === "undefined") return
    if (!localStorage.getItem("access_token")) return
    let cancelled = false
    fetchMentorProfile()
      .then((p) => {
        if (cancelled) return
        setFetchedIsApproved(p.is_approved)
      })
      .catch(() => {
        // 403 (не ментор) / 404 (нет профиля) / 5xx — молча скрываемся.
      })
    return () => { cancelled = true }
  }, [propsProvided])

  const isApproved = propsProvided ? isApprovedProp : fetchedIsApproved

  if (isApproved === null) return null
  if (isApproved) return null

  return (
    <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-indigo-900">
        <Icon name="hourglass_empty" size={18} className="text-indigo-600 flex-shrink-0" />
        <p>
          {t.rich("underReviewBody", richTags)}
        </p>
      </div>
    </div>
  )
}
