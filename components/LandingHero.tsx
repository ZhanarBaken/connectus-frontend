"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { MentorCard } from "@/types"
import { countriesFlagsCompact } from "@/lib/countries"
import Icon from "./Icon"
import FloatingOrb from "./FloatingOrb"
import MagneticButton from "./MagneticButton"
import ScrollReveal from "./ScrollReveal"
import TiltCard from "./TiltCard"

const EXPERTISE_KEYS: Record<string, string> = {
  admission: "admission",
  scholarships: "scholarships",
  visa: "visa",
  documents: "documents",
  essay: "essay",
}

export default function LandingHero({ mentors }: { mentors: MentorCard[] }) {
  const t = useTranslations("Landing.Hero")
  const tExpertise = useTranslations("Landing.Expertise")
  const previewMentors = mentors.slice(0, 3)

  return (
    <section className="relative bg-[#fafafa] pt-24 pb-32 px-4 overflow-hidden">
      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating orbs that move with scroll */}
      <FloatingOrb color="rgba(99, 102, 241, 0.06)" size={500} offsetX={-200} offsetY={-100} speed={0.04} />
      <FloatingOrb color="rgba(139, 92, 246, 0.05)" size={350} offsetX={800} offsetY={50} speed={0.06} className="hidden lg:block" />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — text */}
          <div>
            <ScrollReveal variant="fade-up" duration={800}>
              <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-bold text-gray-900 leading-[1.08] tracking-tight mb-10">
                {t("title1")}{" "}
                <span className="font-[var(--font-display)] italic text-indigo-600">
                  {t("title2")}
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={300} duration={800}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <MagneticButton strength={0.15}>
                  <Link
                    href="/mentors"
                    className="group bg-gray-900 text-white px-7 py-4 rounded-xl text-[15px] font-semibold hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
                  >
                    {t("ctaFind")}
                    <Icon
                      name="arrow_forward"
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </MagneticButton>
                <Link
                  href="/become-mentor"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors underline-offset-4 hover:underline self-start sm:self-auto"
                >
                  {t("ctaBecome")}
                </Link>
              </div>
            </ScrollReveal>
          </div>

          {/* Right — featured mentor cards */}
          {previewMentors.length > 0 && (
            <div className="hidden lg:flex flex-col gap-4">
              {previewMentors.map((mentor, i) => (
                <ScrollReveal
                  key={mentor.id}
                  variant="flip-left"
                  delay={300 + i * 150}
                  duration={900}
                >
                  <Link href={`/mentors/${mentor.id}`} className="block">
                    <TiltCard className="rounded-2xl" tiltDeg={6} scale={1.01}>
                      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] hover:border-gray-300 transition-colors">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {mentor.profile_photo ? (
                              <img
                                src={mentor.profile_photo}
                                alt={mentor.full_name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-bold text-lg">
                                {mentor.full_name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {mentor.full_name}
                              </h3>
                              <Icon name="verified" size={16} filled className="text-indigo-500 flex-shrink-0" />
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5 truncate">
                              {mentor.school_or_university}
                            </p>
                            {(mentor.countries ?? []).length > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">
                                {countriesFlagsCompact(mentor.countries)} {t("helps")}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {mentor.expertise_areas.slice(0, 3).map((area) => {
                            const key = EXPERTISE_KEYS[area.area]
                            return (
                              <span
                                key={area.area}
                                className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-medium"
                              >
                                {key ? tExpertise(key) : area.area}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </TiltCard>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
