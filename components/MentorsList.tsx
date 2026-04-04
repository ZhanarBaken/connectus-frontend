"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { MentorCard } from "@/types"

const EXPERTISE_LABELS: Record<string, string> = {
  admission: "Поступление",
  scholarships: "Стипендии",
  visa: "Виза",
  documents: "Документы",
}

const COUNTRY_FLAGS: Record<string, string> = {
  USA: "🇺🇸",
  UK: "🇬🇧",
  Germany: "🇩🇪",
  Spain: "🇪🇸",
  Italy: "🇮🇹",
}

const COUNTRY_LABELS: Record<string, string> = {
  USA: "США",
  UK: "Великобритания",
  Germany: "Германия",
  Spain: "Испания",
  Italy: "Италия",
}

interface Props {
  mentors: MentorCard[]
}

export default function MentorsList({ mentors }: Props) {
  const [search, setSearch] = useState("")
  const [country, setCountry] = useState("")
  const [expertise, setExpertise] = useState("")
  const [onlyAccepting, setOnlyAccepting] = useState(false)

  const countries = useMemo(
    () => Array.from(new Set(mentors.map((m) => m.country))),
    [mentors]
  )

  const filtered = useMemo(() => {
    return mentors.filter((m) => {
      if (search && !m.full_name.toLowerCase().includes(search.toLowerCase()) &&
          !m.school_or_university.toLowerCase().includes(search.toLowerCase()) &&
          !m.detailed_bio.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (country && m.country !== country) return false
      if (expertise && !m.expertise_areas.some((a) => a.area === expertise)) return false
      if (onlyAccepting && !m.is_accepting_bookings) return false
      return true
    })
  }, [mentors, search, country, expertise, onlyAccepting])

  const hasFilters = search || country || expertise || onlyAccepting

  return (
    <div className="bg-white min-h-screen">
      {/* Page header */}
      <div className="bg-gray-50 border-b border-gray-100 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Найти ментора</h1>
          <p className="text-gray-500 text-lg">
            {mentors.length} менторов из топ университетов мира
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
              placeholder="Поиск по имени, университету..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition-all"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Country filter */}
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-gray-700 transition-all"
            >
              <option value="">Все страны</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {COUNTRY_FLAGS[c] || "🌍"} {COUNTRY_LABELS[c] || c}
                </option>
              ))}
            </select>

            {/* Expertise filter */}
            <select
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-gray-700 transition-all"
            >
              <option value="">Все услуги</option>
              {Object.entries(EXPERTISE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            {/* Accepting bookings toggle */}
            <button
              onClick={() => setOnlyAccepting(!onlyAccepting)}
              className={`text-sm px-4 py-2.5 rounded-xl border font-medium transition-all ${
                onlyAccepting
                  ? "bg-green-50 border-green-300 text-green-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              ✓ Принимает записи
            </button>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setCountry(""); setExpertise(""); setOnlyAccepting(false) }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-2"
              >
                Сбросить фильтры
              </button>
            )}

            <span className="ml-auto text-sm text-gray-400 hidden sm:block">
              {filtered.length} {filtered.length === 1 ? "ментор" : "менторов"}
            </span>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Менторов не найдено</h3>
            <p className="text-gray-400 mb-6">Попробуй изменить фильтры или поисковый запрос</p>
            <button
              onClick={() => { setSearch(""); setCountry(""); setExpertise(""); setOnlyAccepting(false) }}
              className="text-indigo-600 font-medium text-sm hover:underline"
            >
              Сбросить все фильтры
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((mentor) => (
              <Link
                key={mentor.id}
                href={`/mentors/${mentor.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-100 transition-all group flex flex-col"
              >
                {/* Avatar + name */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    {mentor.profile_photo ? (
                      <img
                        src={mentor.profile_photo}
                        alt={mentor.full_name}
                        className="w-14 h-14 rounded-2xl object-cover"
                      />
                    ) : (
                      <span className="text-indigo-600 font-bold text-xl">
                        {mentor.full_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                        {mentor.full_name}
                      </h3>
                      {mentor.is_verified && (
                        <span className="text-indigo-500 flex-shrink-0 text-sm" title="Верифицирован">✓</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">
                      {COUNTRY_FLAGS[mentor.country] || "🌍"} {mentor.school_or_university}
                    </p>
                    {mentor.major && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{mentor.major}</p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed flex-1">
                  {mentor.detailed_bio}
                </p>

                {/* Expertise tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {mentor.expertise_areas.slice(0, 3).map((area) => (
                    <span
                      key={area.area}
                      className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium"
                    >
                      {EXPERTISE_LABELS[area.area] || area.area}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  {mentor.grant_or_scholarship ? (
                    <span className="text-xs text-gray-400 truncate mr-2">🏅 {mentor.grant_or_scholarship}</span>
                  ) : (
                    <span />
                  )}
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                      mentor.is_accepting_bookings
                        ? "bg-green-50 text-green-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {mentor.is_accepting_bookings ? "Принимает записи" : "Занят"}
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
