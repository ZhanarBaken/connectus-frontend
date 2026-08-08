"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useMentorOnboardingGate } from "@/lib/useMentorOnboardingGate"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"
import MentorStatusBanner from "@/components/MentorStatusBanner"

// Памятка ментора. Опускаем сюда всё что мог бы упустить новый ментор:
// первичная редактируется, без расписания клиенты не запишутся, и
// формулы выплат. Дописываем разделы по мере появления новых нюансов.

interface Section {
  icon: string
  iconColor: string
  iconBg: string
  title: string
  body: React.ReactNode
  cta?: { label: string; href: string }
}

const richTags = {
  strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  em: (chunks: React.ReactNode) => <em>{chunks}</em>,
}

export default function MentorGuidePage() {
  const t = useTranslations("Dashboard.MentorGuide")
  useMentorOnboardingGate()

  const SECTIONS: Section[] = [
    {
      icon: "forum",
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-50",
      title: t("s1.title"),
      body: (
        <>
          <p>{t.rich("s1.p1", richTags)}</p>
          <p>{t.rich("s1.p2", richTags)}</p>
          <p className="text-gray-500 text-xs">{t.rich("s1.p3", richTags)}</p>
        </>
      ),
      cta: { label: t("s1.cta"), href: "/mentors/services" },
    },
    {
      icon: "calendar_month",
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      title: t("s2.title"),
      body: (
        <>
          <p>{t.rich("s2.p1", richTags)}</p>
          <p>{t.rich("s2.p2", richTags)}</p>
          <p className="text-gray-500 text-xs">{t.rich("s2.p3", richTags)}</p>
        </>
      ),
      cta: { label: t("s2.cta"), href: "/mentors/schedule" },
    },
    {
      icon: "payments",
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      title: t("s3.title"),
      body: (
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-semibold text-gray-900 text-sm">{t("s3.block1title")}</p>
            <p className="text-xs text-gray-600 mt-1">{t.rich("s3.block1desc", richTags)}</p>
          </div>
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
            <p className="font-semibold text-amber-900 text-sm inline-flex items-center gap-1.5">
              {t("s3.block4title")}
            </p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">{t.rich("s3.block4desc", richTags)}</p>
          </div>
        </div>
      ),
      cta: { label: t("s3.cta"), href: "/mentors/profile" },
    },
    {
      icon: "tune",
      iconColor: "text-violet-600",
      iconBg: "bg-violet-50",
      title: t("s4.title"),
      body: (
        <>
          <p>{t.rich("s4.p1", richTags)}</p>
          <p>{t.rich("s4.p2", richTags)}</p>
          <p className="text-gray-500 text-xs">{t.rich("s4.p3", richTags)}</p>
        </>
      ),
      cta: { label: t("s4.cta"), href: "/mentors/services" },
    },
  ]

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <MentorStatusBanner />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <BackButton fallbackHref="/mentor/dashboard" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-4">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((section, i) => (
            <div key={section.title} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-2xl ${section.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon name={section.icon} size={22} className={section.iconColor} filled />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-gray-400">{i + 1}.</span>
                    <h2 className="text-base font-bold text-gray-900">{section.title}</h2>
                  </div>
                  <div className="text-sm text-gray-700 mt-3 space-y-2 leading-relaxed">
                    {section.body}
                  </div>
                  {section.cta && (
                    <Link
                      href={section.cta.href}
                      className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      {section.cta.label}
                      <Icon name="arrow_forward" size={16} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          {t("footer")}
        </p>
      </div>
    </div>
  )
}
