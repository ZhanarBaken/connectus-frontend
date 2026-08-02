"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import MentorRedirect from "@/components/MentorRedirect"
import FaqList from "@/components/FaqList"
import Icon from "@/components/Icon"
import ScrollReveal from "@/components/ScrollReveal"
import AnimatedCounter from "@/components/AnimatedCounter"
import FloatingOrb from "@/components/FloatingOrb"
import MagneticButton from "@/components/MagneticButton"

export default function BecomeMentorPage() {
  const t = useTranslations("BecomeMentor")

  const BENEFITS = [
    { icon: "payments", title: t("benefits.b1title"), desc: t("benefits.b1desc") },
    { icon: "schedule", title: t("benefits.b2title"), desc: t("benefits.b2desc") },
    { icon: "public", title: t("benefits.b3title"), desc: t("benefits.b3desc") },
    { icon: "shield", title: t("benefits.b4title"), desc: t("benefits.b4desc") },
  ]

  const STEPS = [
    { title: t("steps.s1title"), desc: t("steps.s1desc"), icon: "person_add" },
    { title: t("steps.s2title"), desc: t("steps.s2desc"), icon: "add_circle" },
    { title: t("steps.s3title"), desc: t("steps.s3desc"), icon: "verified" },
    { title: t("steps.s4title"), desc: t("steps.s4desc"), icon: "handshake" },
  ]

  const SERVICES = [
    { icon: "flag", label: t("services.consultation") },
    { icon: "edit", label: t("services.essay") },
    { icon: "article", label: t("services.documents") },
    { icon: "military_tech", label: t("services.scholarships") },
    { icon: "record_voice_over", label: t("services.interview") },
    { icon: "explore", label: t("services.university") },
    { icon: "edit_note", label: t("services.examPrep") },
    { icon: "flight_takeoff", label: t("services.visa") },
  ]

  const FAQS = [
    { q: t("faq.q1.q"), a: t("faq.q1.a") },
    { q: t("faq.q2.q"), a: t("faq.q2.a") },
    { q: t("faq.q3.q"), a: t("faq.q3.a") },
    { q: t("faq.q4.q"), a: t("faq.q4.a") },
    { q: t("faq.q5.q"), a: t("faq.q5.a") },
  ]

  return (
    <main className="bg-white">
      <MentorRedirect />

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="bg-gray-900 text-white pt-24 pb-28 px-4 relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <FloatingOrb color="rgba(99, 102, 241, 0.1)" size={500} offsetX={-200} offsetY={-50} speed={0.04} />
        <FloatingOrb color="rgba(139, 92, 246, 0.06)" size={400} offsetX={700} offsetY={100} speed={0.06} className="hidden lg:block" />

        <div className="relative max-w-4xl mx-auto text-center">
          <ScrollReveal variant="fade-up" duration={600}>
            <div className="inline-flex items-center gap-2 bg-white/10 text-gray-300 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <AnimatedCounter value={50} suffix="+" duration={1200} /> {t("hero.mentorsOnPlatform")}
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={100} duration={800}>
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.08] tracking-tight mb-6">
              {t("hero.title1")}{" "}
              <span className="font-[var(--font-display)] italic text-indigo-400">
                {t("hero.title2")}
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal variant="blur-in" delay={200} duration={800}>
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              {t("hero.subtitle")}
            </p>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={300}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <MagneticButton strength={0.15}>
                <Link
                  href="/auth/register"
                  className="group bg-white text-gray-900 px-8 py-4 rounded-xl text-[15px] font-bold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
                >
                  {t("hero.cta")}
                  <Icon
                    name="arrow_forward"
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </MagneticButton>
              <a
                href="#how-it-works"
                className="text-gray-400 px-8 py-4 rounded-xl text-[15px] font-semibold hover:text-white transition-colors border border-gray-700 hover:border-gray-600"
              >
                {t("hero.learnMore")}
              </a>
            </div>
          </ScrollReveal>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto">
            {[
              { value: 48, suffix: t("hero.statHoursSuffix"), label: t("hero.statVerification") },
              { value: 15, suffix: "", label: t("hero.statCountries") },
              { value: 0, suffix: "₸", label: t("hero.statRegistration") },
            ].map((stat, i) => (
              <ScrollReveal key={stat.label} variant="fade-up" delay={400 + i * 100}>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {stat.value > 0 ? (
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={1500} />
                    ) : (
                      `${stat.value}${stat.suffix}`
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">
                    {stat.label}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ───────────────────────────────────────── */}
      <section className="py-28 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-16 items-start">
            <div className="lg:sticky lg:top-32">
              <ScrollReveal variant="fade-right" duration={800}>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                  {t("benefitsSection.title1")}{" "}
                  <span className="font-[var(--font-display)] italic">Connectus</span>
                </h2>
                <p className="text-gray-500 leading-relaxed">
                  {t("benefitsSection.subtitle")}
                </p>
              </ScrollReveal>
            </div>

            <div className="space-y-4">
              {BENEFITS.map((b, i) => (
                <ScrollReveal key={b.title} variant="fade-left" delay={i * 120}>
                  <div className="flex items-start gap-5 p-6 rounded-xl bg-[#fafafa] border border-gray-100">
                    <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Icon name={b.icon} size={22} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{b.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section id="how-it-works" className="py-28 px-4 bg-[#fafafa] relative overflow-hidden">
        <FloatingOrb color="rgba(99, 102, 241, 0.04)" size={500} offsetX={600} offsetY={0} speed={0.04} className="hidden lg:block" />

        <div className="relative max-w-5xl mx-auto">
          <ScrollReveal variant="fade-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight text-center">
              {t("howItWorks.title1")}{" "}
              <span className="font-[var(--font-display)] italic">{t("howItWorks.title2")}</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={200}>
            <p className="text-gray-500 text-lg text-center mb-16">
              {t("howItWorks.subtitle")}
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <ScrollReveal key={step.title} variant="flip-up" delay={i * 150} duration={800}>
                <div className="relative bg-white rounded-xl p-6 border border-gray-100 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-gray-900/20">
                      <Icon name={step.icon} size={18} />
                    </div>
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────── */}
      <section className="py-28 px-4 bg-gray-900 relative overflow-hidden">
        <FloatingOrb color="rgba(99, 102, 241, 0.08)" size={400} offsetX={-100} offsetY={50} speed={0.05} />

        <div className="relative max-w-5xl mx-auto">
          <ScrollReveal variant="fade-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight text-center">
              {t("servicesSection.title1")}{" "}
              <span className="font-[var(--font-display)] italic text-gray-400">{t("servicesSection.title2")}</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={200}>
            <p className="text-gray-400 text-lg text-center mb-16">
              {t("servicesSection.subtitle")}
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SERVICES.map((item, i) => (
              <ScrollReveal
                key={item.label}
                variant={i % 2 === 0 ? "fade-right" : "fade-left"}
                delay={Math.floor(i / 2) * 80}
                duration={600}
              >
                <div className="flex items-center gap-4 bg-gray-800/50 rounded-xl px-5 py-4 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/70 transition-colors">
                  <Icon name={item.icon} size={22} className="text-indigo-400 flex-shrink-0" />
                  <span className="text-[15px] font-medium text-gray-200">{item.label}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="py-28 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal variant="fade-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight text-center">
              {t("faqSection.title1")}{" "}
              <span className="font-[var(--font-display)] italic">{t("faqSection.title2")}</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={200}>
            <p className="text-gray-500 text-lg text-center mb-12">
              {t("faqSection.subtitle")}
            </p>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={300}>
            <FaqList items={FAQS} />
          </ScrollReveal>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="py-28 px-4 bg-[#fafafa]">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal variant="zoom-in" duration={900}>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              {t("finalCta.title1")}{" "}
              <span className="font-[var(--font-display)] italic">{t("finalCta.title2")}</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={150}>
            <p className="text-gray-500 text-lg mb-10 leading-relaxed">
              {t("finalCta.subtitle")}
            </p>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={300}>
            <MagneticButton strength={0.2} className="inline-block">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-10 py-4 rounded-xl text-[15px] font-bold hover:bg-gray-800 transition-colors"
              >
                {t("finalCta.cta")}
                <Icon name="arrow_forward" size={20} />
              </Link>
            </MagneticButton>
            <p className="text-sm text-gray-400 mt-4">
              {t("finalCta.haveAccount")}{" "}
              <Link href="/auth/login" className="text-indigo-600 font-medium hover:underline">
                {t("finalCta.loginLink")}
              </Link>
            </p>
          </ScrollReveal>
        </div>
      </section>
    </main>
  )
}
