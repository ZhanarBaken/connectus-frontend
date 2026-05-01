"use client"

import Link from "next/link"
import TiltCard from "./TiltCard"
import Icon from "./Icon"
import AnimatedCounter from "./AnimatedCounter"
import FloatingOrb from "./FloatingOrb"
import MagneticButton from "./MagneticButton"
import ScrollReveal from "./ScrollReveal"

export default function LandingHero() {
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
              <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-bold text-gray-900 leading-[1.08] tracking-tight mb-6">
                Поступи в университет мечты{" "}
                <span className="font-[var(--font-display)] italic text-indigo-600">
                  с&nbsp;ментором
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={200} duration={800}>
              <p className="text-lg text-gray-500 max-w-lg mb-10 leading-relaxed">
                Выпускники MIT, Oxford, TU Munich — помогут составить план,
                написать эссе и пройти весь путь от заявки до зачисления.
              </p>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={300} duration={800}>
              <div className="flex flex-col sm:flex-row gap-3">
                <MagneticButton strength={0.15}>
                  <Link
                    href="/mentors"
                    className="group bg-gray-900 text-white px-7 py-4 rounded-xl text-[15px] font-semibold hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
                  >
                    Найти ментора
                    <Icon
                      name="arrow_forward"
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </MagneticButton>
                <Link
                  href="/become-mentor"
                  className="text-gray-600 px-7 py-4 rounded-xl text-[15px] font-semibold hover:text-gray-900 transition-colors border border-gray-200 hover:border-gray-300"
                >
                  Стать ментором
                </Link>
              </div>
            </ScrollReveal>
          </div>

          {/* Right — 3D tilt card */}
          <div className="hidden lg:block">
            <ScrollReveal variant="flip-left" delay={400} duration={1000}>
              <TiltCard className="rounded-2xl" tiltDeg={8}>
                <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)]">
                  {/* University tags */}
                  <div className="flex items-center gap-3 mb-8">
                    {["MIT", "Oxford", "ETH"].map((uni) => (
                      <div
                        key={uni}
                        className="h-10 px-4 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 tracking-wider"
                      >
                        {uni}
                      </div>
                    ))}
                    <div className="h-10 px-3 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-500">
                      +47
                    </div>
                  </div>

                  {/* Animated stats */}
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <div className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                        <AnimatedCounter value={50} suffix="+" />
                      </div>
                      <div className="text-sm text-gray-400 font-medium flex items-center gap-1.5">
                        <Icon name="people" size={14} className="text-gray-300" />
                        Менторов
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                        <AnimatedCounter value={15} />
                      </div>
                      <div className="text-sm text-gray-400 font-medium flex items-center gap-1.5">
                        <Icon name="public" size={14} className="text-gray-300" />
                        Стран
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                        <AnimatedCounter value={200} suffix="+" />
                      </div>
                      <div className="text-sm text-gray-400 font-medium flex items-center gap-1.5">
                        <Icon name="school" size={14} className="text-gray-300" />
                        Студентов
                      </div>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </ScrollReveal>
          </div>
        </div>

        {/* Mobile stats */}
        <div className="lg:hidden mt-12 grid grid-cols-3 gap-4">
          {[
            { value: 50, suffix: "+", label: "Менторов" },
            { value: 15, suffix: "", label: "Стран" },
            { value: 200, suffix: "+", label: "Студентов" },
          ].map((stat, i) => (
            <ScrollReveal key={stat.label} variant="fade-up" delay={i * 100}>
              <div className="text-center bg-white rounded-xl border border-gray-100 py-4 px-2">
                <div className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
