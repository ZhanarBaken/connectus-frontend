"use client"

import Link from "next/link"
import { MentorCard } from "@/types"
import { track } from "@/lib/analytics"
import { countriesFlagsCompact, countryLabel } from "@/lib/countries"
import TiltCard from "./TiltCard"
import Icon from "./Icon"
import ScrollReveal from "./ScrollReveal"

const EXPERTISE_LABELS: Record<string, string> = {
  admission: "Поступление",
  scholarships: "Стипендии",
  visa: "Виза",
  documents: "Документы",
}

export default function LandingMentors({ mentors }: { mentors: MentorCard[] }) {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <ScrollReveal variant="fade-right">
            <div>
              <p className="text-sm font-semibold text-indigo-600 mb-2 tracking-wide uppercase">
                Проверенные эксперты
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                Наши{" "}
                <span className="font-[var(--font-display)] italic">менторы</span>
              </h2>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="fade-left">
            <Link
              href="/mentors"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              Все менторы
              <Icon name="arrow_forward" size={16} />
            </Link>
          </ScrollReveal>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {mentors.slice(0, 3).map((mentor, i) => (
            <ScrollReveal key={mentor.id} variant="fade-up" delay={i * 150} duration={800}>
              <Link
                href={`/mentors/${mentor.id}`}
                onClick={() => track("mentor_card_clicked", { mentor_profile_id: mentor.id })}
                className="block h-full"
              >
                <TiltCard className="rounded-2xl h-full" tiltDeg={5} scale={1.01}>
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 h-full flex flex-col hover:border-gray-300 transition-colors">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {mentor.full_name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {mentor.full_name}
                          </h3>
                          {mentor.is_verified && (
                            <span title="Платформа подтвердила документы ментора">
                              <Icon name="verified" size={16} filled className="text-indigo-500 flex-shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {mentor.school_or_university}
                        </p>
                        {(mentor.countries ?? []).length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5" title={(mentor.countries ?? []).map((c) => countryLabel(c.country)).join(", ")}>
                            {countriesFlagsCompact(mentor.countries)} помогает поступить
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed flex-1">
                      {mentor.detailed_bio}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {mentor.expertise_areas.slice(0, 3).map((area) => (
                        <span key={area.area} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-medium">
                          {EXPERTISE_LABELS[area.area] || area.area}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      {mentor.grant_or_scholarship && (
                        <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                          <Icon name="military_tech" size={14} />
                          {mentor.grant_or_scholarship}
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-md ml-auto ${
                        mentor.is_accepting_bookings
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-100 text-gray-400"
                      }`}>
                        {mentor.is_accepting_bookings ? "Принимает записи" : "Занят"}
                      </span>
                    </div>
                  </div>
                </TiltCard>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal variant="fade-up" delay={500}>
          <div className="text-center mt-10">
            <Link
              href="/mentors"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Смотреть всех менторов
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
