"use client"

import { useState, useMemo, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { MentorCard } from "@/types"
import { track } from "@/lib/analytics"
import { countryFlag, countryLabel, countriesFlagsCompact } from "@/lib/countries"
import { LANGUAGE_LABELS } from "@/lib/languages"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"
import { TG_AUTH_EVENT } from "@/components/TelegramAutoLogin"

interface Props {
  mentors: MentorCard[]
}

const EXPERTISE_VALUES = ["admission", "scholarships", "visa", "documents"] as const

export default function MentorsList({ mentors }: Props) {
  const t = useTranslations("Mentors.Catalog")
  const tExpertise = useTranslations("Landing.Expertise")
  const router = useRouter()
  const { isInTelegram } = useTelegramWebApp()
  const [authChecked, setAuthChecked] = useState(false)
  const [search, setSearch] = useState("")
  const [country, setCountry] = useState("")
  const [expertise, setExpertise] = useState("")
  const [onlyAccepting, setOnlyAccepting] = useState(false)
  const [onlyUniversal, setOnlyUniversal] = useState(false)
  const [language, setLanguage] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      // In a Telegram Mini App, jump straight to the auto-login overlay
      // (handled by <TelegramAutoLogin>) instead of bouncing through the
      // email/password form. Saves a redirect and keeps the user inside
      // the one-tap TG flow.
      if (isInTelegram) {
        router.replace("/")
        window.dispatchEvent(new Event(TG_AUTH_EVENT))
        return
      }
      router.replace("/auth/login?next=/mentors")
      return
    }
    setAuthChecked(true)
  }, [router, mentors, isInTelegram])

  const countries = useMemo(
    () => Array.from(new Set(mentors.flatMap((m) => (m.countries ?? []).map((c) => c.country)))),
    [mentors]
  )

  const filtered = useMemo(() => {
    return mentors.filter((m) => {
      if (search && !m.full_name.toLowerCase().includes(search.toLowerCase()) &&
          !m.school_or_university.toLowerCase().includes(search.toLowerCase()) &&
          !m.detailed_bio.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (country && !(m.countries ?? []).some((c) => c.country === country)) return false
      if (expertise && !m.expertise_areas.some((a) => a.area === expertise)) return false
      if (onlyAccepting && !m.is_accepting_bookings) return false
      if (onlyUniversal && !m.is_universal) return false
      if (language && !(m.languages ?? []).some((l) => l.language === language)) return false
      return true
    })
  }, [mentors, search, country, expertise, onlyAccepting, onlyUniversal, language])

  const hasFilters = search || country || expertise || onlyAccepting || onlyUniversal || language

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Page header */}
      <div className="bg-[#fafafa] border-b border-gray-200 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <BackButton className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 font-medium mb-4 transition-colors group [-webkit-tap-highlight-color:transparent]" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{t("title")}</h1>
          <p className="text-gray-500 text-lg">
            {t("mentorsFromTop", { count: mentors.length })}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search + filters */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Search bar */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition-all"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Country filter */}
            <div className="relative">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="appearance-none text-sm font-medium border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 bg-white text-gray-700 cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
              >
                <option value="">{t("allCountries")}</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {countryFlag(c)} {countryLabel(c)}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Expertise filter */}
            <div className="relative">
              <select
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                className="appearance-none text-sm font-medium border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 bg-white text-gray-700 cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
              >
                <option value="">{t("allServices")}</option>
                {EXPERTISE_VALUES.map((val) => (
                  <option key={val} value={val}>{tExpertise(val)}</option>
                ))}
              </select>
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Language filter */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="appearance-none text-sm font-medium border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 bg-white text-gray-700 cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
              >
                <option value="">{t("allLanguages")}</option>
                {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Accepting bookings toggle */}
            <button
              type="button"
              onClick={() => setOnlyAccepting(!onlyAccepting)}
              aria-pressed={onlyAccepting}
              className={`group relative inline-flex items-center gap-2.5 text-sm px-4 py-2.5 rounded-xl border font-medium transform-gpu transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] active:scale-95 ${
                onlyAccepting
                  ? "bg-gray-900 border-gray-900 text-white shadow-sm shadow-gray-200 hover:bg-gray-800 hover:border-gray-800"
                  : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
              }`}
              style={{ WebkitBackfaceVisibility: "hidden" }}
            >
              <span
                className={`relative inline-flex w-8 h-[18px] rounded-full transition-colors duration-200 ${
                  onlyAccepting ? "bg-white/30" : "bg-gray-200 group-hover:bg-gray-300"
                }`}
                aria-hidden
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-[14px] h-[14px] rounded-full transform-gpu transition-[transform,background-color] duration-200 ease-out ${
                    onlyAccepting ? "translate-x-[14px] bg-white" : "translate-x-0 bg-white shadow-sm"
                  }`}
                />
              </span>
              <span>{t("acceptingBookings")}</span>
            </button>

            {/* Universal mentor toggle */}
            <button
              type="button"
              onClick={() => setOnlyUniversal(!onlyUniversal)}
              aria-pressed={onlyUniversal}
              className={`group relative inline-flex items-center gap-2.5 text-sm px-4 py-2.5 rounded-xl border font-medium transform-gpu transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] active:scale-95 ${
                onlyUniversal
                  ? "bg-violet-600 border-violet-600 text-white shadow-sm shadow-violet-200 hover:bg-violet-700 hover:border-violet-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600"
              }`}
              style={{ WebkitBackfaceVisibility: "hidden" }}
            >
              <span
                className={`relative inline-flex w-8 h-[18px] rounded-full transition-colors duration-200 ${
                  onlyUniversal ? "bg-white/30" : "bg-gray-200 group-hover:bg-gray-300"
                }`}
                aria-hidden
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-[14px] h-[14px] rounded-full transform-gpu transition-[transform,background-color] duration-200 ease-out ${
                    onlyUniversal ? "translate-x-[14px] bg-white" : "translate-x-0 bg-white shadow-sm"
                  }`}
                />
              </span>
              <span>{t("universalMentor")}</span>
            </button>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setCountry(""); setExpertise(""); setLanguage(""); setOnlyAccepting(false); setOnlyUniversal(false) }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-2"
              >
                {t("resetFilters")}
              </button>
            )}

            <span className="ml-auto text-sm text-gray-400 hidden sm:block">
              {t("mentorsCount", { count: filtered.length })}
            </span>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="mb-4 flex justify-center">
              <Icon name="search_off" size={48} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t("notFoundTitle")}</h3>
            <p className="text-gray-400 mb-6">{t("notFoundBody")}</p>
            <button
              onClick={() => { setSearch(""); setCountry(""); setExpertise(""); setOnlyAccepting(false) }}
              className="text-indigo-600 font-medium text-sm hover:underline"
            >
              {t("resetAllFilters")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((mentor) => (
              <Link
                key={mentor.id}
                href={`/mentors/${mentor.id}`}
                onClick={() => track("mentor_card_clicked", { mentor_profile_id: mentor.id })}
                className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 hover:shadow-lg hover:border-gray-300 transition-all group flex flex-col min-w-0 overflow-hidden"
              >
                {/* Avatar + name */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                    {mentor.profile_photo ? (
                      <img
                        src={mentor.profile_photo}
                        alt={mentor.full_name}
                        className="w-14 h-14 rounded-2xl object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-xl">
                        {mentor.full_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                        {mentor.full_name}
                      </h3>
                      {/* Every visible mentor has been admin-approved
                          (documents + identity verified), so the badge
                          is shown unconditionally. */}
                      <span title={t("verifiedTitle")}>
                        <Icon name="verified" size={14} filled className="text-indigo-500 flex-shrink-0" />
                      </span>
                      {mentor.is_universal && (
                        <span
                          className="inline-flex items-center gap-1 bg-violet-50 text-violet-600 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                          title={t("universalBadgeTitle")}
                        >
                          <Icon name="auto_awesome" size={11} filled />
                          {t("universalBadge")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">
                      {mentor.school_or_university}
                      {mentor.major && <span className="text-gray-400"> · {mentor.major}</span>}
                    </p>
                    {(mentor.countries ?? []).length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5" title={mentor.countries.map((c) => countryLabel(c.country)).join(", ")}>
                        {countriesFlagsCompact(mentor.countries)} {t("helpsAdmission")}
                      </p>
                    )}
                    {/* Reviews */}
                    <div className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
                      {(mentor.rating_count ?? 0) > 0 ? (
                        <>
                          <span className="text-yellow-400">★</span>
                          <span className="font-semibold text-gray-700">{mentor.rating_avg?.toFixed(1)}</span>
                          <span>·</span>
                          <span>{t("reviewCount", { count: mentor.rating_count ?? 0 })}</span>
                        </>
                      ) : (
                        <span>{t("noReviews")}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed flex-1 break-words">
                  {mentor.detailed_bio}
                </p>

                {/* Expertise tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {mentor.expertise_areas.slice(0, 3).map((area) => (
                    <span
                      key={area.area}
                      className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium"
                    >
                      {tExpertise.has(area.area) ? tExpertise(area.area) : area.area}
                    </span>
                  ))}
                </div>

                {/* Languages */}
                {(mentor.languages ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {mentor.languages.slice(0, 4).map((l) => (
                      <span key={l.language} className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-medium">
                        {LANGUAGE_LABELS[l.language] ?? l.language}
                      </span>
                    ))}
                    {mentor.languages.length > 4 && (
                      <span className="text-xs text-gray-400">+{mentor.languages.length - 4}</span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-50">
                  {mentor.grant_or_scholarship ? (
                    <span className="text-xs text-gray-400 inline-flex items-center gap-1 min-w-0 flex-1">
                      <Icon name="military_tech" size={12} className="flex-shrink-0" />
                      <span className="truncate">{mentor.grant_or_scholarship}</span>
                    </span>
                  ) : (
                    <span className="flex-1" />
                  )}
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap ${
                      mentor.is_accepting_bookings
                        ? "bg-green-50 text-green-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {mentor.is_accepting_bookings ? t("acceptingBookings") : t("busy")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
