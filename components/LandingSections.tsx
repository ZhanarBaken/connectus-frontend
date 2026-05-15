"use client"

import Link from "next/link"
import { MentorCard } from "@/types"
import Icon from "./Icon"
import Logo from "./Logo"
import ScrollReveal from "./ScrollReveal"
import AnimatedCounter from "./AnimatedCounter"
import FloatingOrb from "./FloatingOrb"
import MagneticButton from "./MagneticButton"
import TiltCard from "./TiltCard"
import FaqList from "./FaqList"
import PlatformReviews from "./PlatformReviews"
import LandingMentors from "./LandingMentors"
import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_TELEGRAM_URL,
  SUPPORT_TELEGRAM_USERNAME,
  SUPPORT_WHATSAPP_DISPLAY,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/contacts"
import { useT } from "@/lib/i18n/LocaleProvider"

interface Category {
  label: string
  code: string
  desc: string
}

interface Props {
  categories: Category[]
  mentors: MentorCard[]
}

export default function LandingSections({ categories, mentors }: Props) {
  const t = useT()

  const steps = [
    { number: "01", titleKey: "how.step1.title", descKey: "how.step1.desc", icon: "search" },
    { number: "02", titleKey: "how.step2.title", descKey: "how.step2.desc", icon: "chat" },
    { number: "03", titleKey: "how.step3.title", descKey: "how.step3.desc", icon: "rocket_launch" },
  ]

  const faqs = [
    { q: t("faq.q1.q"), a: t("faq.q1.a") },
    { q: t("faq.q2.q"), a: t("faq.q2.a") },
    { q: t("faq.q3.q"), a: t("faq.q3.a") },
    { q: t("faq.q4.q"), a: t("faq.q4.a") },
    { q: t("faq.q5.q"), a: t("faq.q5.a") },
  ]

  const localizedCategory = (cat: Category) => {
    const code = cat.code.toLowerCase()
    const labelKey = `cat.${code}.label`
    const descKey = `cat.${code}.desc`
    const label = t(labelKey)
    const desc = t(descKey)
    return {
      label: label === labelKey ? cat.label : label,
      desc: desc === descKey ? cat.desc : desc,
    }
  }

  return (
    <>
      {/* ─── How it works ──────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 px-4 bg-white relative overflow-hidden">
        <FloatingOrb
          color="rgba(99, 102, 241, 0.04)"
          size={600}
          offsetX={-300}
          offsetY={200}
          speed={0.03}
        />

        <div className="relative max-w-5xl mx-auto">
          <ScrollReveal variant="fade-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight text-center">
              {t("how.title_1")}{" "}
              <span className="font-[var(--font-display)] italic">{t("how.title_2")}</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={200}>
            <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed text-center mb-20">
              {t("how.subtitle")}
            </p>
          </ScrollReveal>

          {/* Timeline */}
          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-gray-200 via-indigo-200 to-gray-200" />

            <div className="grid md:grid-cols-3 gap-12 md:gap-8">
              {steps.map((step, i) => (
                <ScrollReveal
                  key={step.number}
                  variant="flip-up"
                  delay={i * 200}
                  duration={900}
                >
                  <div className="relative text-center">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-900 text-white mb-6 mx-auto z-10 shadow-lg shadow-gray-900/20">
                      <Icon name={step.icon} size={24} />
                    </div>
                    <div className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3">
                      {t("how.step_label")} {i + 1}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {t(step.titleKey)}
                    </h3>
                    <p className="text-gray-500 leading-relaxed text-[15px] max-w-xs mx-auto">
                      {t(step.descKey)}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Categories ────────────────────────────────────────────── */}
      <section id="categories" className="py-28 px-4 bg-[#fafafa] relative overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_1.5fr] gap-16 items-start">
            {/* Left — sticky text */}
            <div className="lg:sticky lg:top-32">
              <ScrollReveal variant="fade-right" duration={800}>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                  {t("cat.title_1")}{" "}
                  <span className="font-[var(--font-display)] italic text-gray-400">
                    {t("cat.title_2")}
                  </span>
                </h2>
                <p className="text-gray-500 leading-relaxed mb-6">
                  {t("cat.subtitle")}
                </p>
                <Link
                  href="/mentors"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  {t("cat.cta")}
                  <Icon name="arrow_forward" size={16} />
                </Link>
              </ScrollReveal>
            </div>

            {/* Right — country grid */}
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat, i) => {
                const loc = localizedCategory(cat)
                return (
                  <ScrollReveal
                    key={cat.code}
                    variant={i % 2 === 0 ? "fade-right" : "fade-left"}
                    delay={Math.floor(i / 2) * 80}
                    duration={600}
                  >
                    <Link
                      href="/mentors"
                      className="group flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                        <img
                          src={`https://flagcdn.com/w40/${cat.code.toLowerCase()}.png`}
                          alt={loc.label}
                          width={24}
                          height={18}
                          className="rounded-sm w-6 h-[18px] object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
                          {loc.label}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 leading-snug">
                          {loc.desc}
                        </div>
                      </div>
                    </Link>
                  </ScrollReveal>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Featured mentors ──────────────────────────────────────── */}
      <LandingMentors mentors={mentors} />

      {/* ─── Trust section ─────────────────────────────────────────── */}
      <section className="py-28 px-4 bg-gray-900 relative overflow-hidden">
        <FloatingOrb
          color="rgba(99, 102, 241, 0.08)"
          size={500}
          offsetX={700}
          offsetY={-50}
          speed={0.05}
          className="hidden lg:block"
        />

        <div className="relative max-w-5xl mx-auto">
          <ScrollReveal variant="fade-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight text-center">
              {t("trust.title_1")}{" "}
              <span className="font-[var(--font-display)] italic text-gray-400">
                {t("trust.title_2")}
              </span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={200}>
            <p className="text-gray-400 text-lg text-center mb-16 max-w-xl mx-auto">
              {t("trust.subtitle")}
            </p>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 gap-px bg-gray-800 rounded-2xl overflow-hidden">
            {[
              {
                icon: "verified",
                title: t("trust.verified.title"),
                desc: t("trust.verified.desc"),
                stat: 100,
                statSuffix: "%",
                statLabel: t("trust.verified.stat_label"),
              },
              {
                icon: "forum",
                title: t("trust.consult.title"),
                desc: t("trust.consult.desc"),
                stat: 0,
                statSuffix: "",
                statLabel: "",
              },
              {
                icon: "credit_card",
                title: t("trust.price.title"),
                desc: t("trust.price.desc"),
                stat: 0,
                statSuffix: "",
                statLabel: t("trust.price.stat_label"),
              },
              {
                icon: "school",
                title: t("trust.real.title"),
                desc: t("trust.real.desc"),
                stat: 50,
                statSuffix: "+",
                statLabel: t("trust.real.stat_label"),
              },
            ].map((item, i) => (
              <ScrollReveal
                key={item.title}
                variant="zoom-in"
                delay={i * 120}
                duration={700}
              >
                <div className="bg-gray-900 p-8 sm:p-10 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <Icon name={item.icon} size={28} className="text-indigo-400" />
                    {item.stat > 0 && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">
                          <AnimatedCounter value={item.stat} suffix={item.statSuffix} duration={1500} />
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                          {item.statLabel}
                        </div>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-white text-lg mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-400 text-[15px] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ──────────────────────────────────────────── */}
      <section className="py-28 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal variant="fade-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight text-center">
              {t("testi.title_1")}{" "}
              <span className="font-[var(--font-display)] italic">{t("testi.title_2")}</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={200}>
            <p className="text-gray-500 text-lg text-center mb-16">
              {t("testi.subtitle")}
            </p>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={300}>
            <PlatformReviews />
          </ScrollReveal>
        </div>
      </section>

      {/* ─── For mentors — asymmetric ──────────────────────────────── */}
      <section className="py-28 px-4 bg-[#fafafa] relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-16 items-center">
            {/* Left */}
            <div>
              <ScrollReveal variant="fade-right" duration={800}>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                  {t("bm.title_1")}{" "}
                  <span className="font-[var(--font-display)] italic text-gray-400">
                    {t("bm.title_2")}
                  </span>
                </h2>
                <p className="text-gray-500 text-lg leading-relaxed mb-10 max-w-lg">
                  {t("bm.subtitle")}
                </p>
              </ScrollReveal>

              <div className="space-y-4 mb-10">
                {[
                  { icon: "payments", text: t("bm.feat1") },
                  { icon: "edit_note", text: t("bm.feat2") },
                  { icon: "verified", text: t("bm.feat3") },
                  { icon: "shield", text: t("bm.feat4") },
                ].map((item, i) => (
                  <ScrollReveal key={item.text} variant="fade-right" delay={i * 100}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Icon name={item.icon} size={20} className="text-indigo-600" />
                      </div>
                      <span className="text-[15px] text-gray-700 font-medium">
                        {item.text}
                      </span>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              <ScrollReveal variant="fade-up" delay={400}>
                <div className="flex flex-col sm:flex-row gap-3">
                  <MagneticButton strength={0.15}>
                    <Link
                      href="/become-mentor"
                      className="bg-gray-900 text-white px-7 py-3.5 rounded-xl text-[15px] font-semibold hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
                    >
                      {t("bm.cta")}
                      <Icon name="arrow_forward" size={18} />
                    </Link>
                  </MagneticButton>
                  <p className="text-sm text-gray-400 self-center">
                    {t("bm.note")}
                  </p>
                </div>
              </ScrollReveal>
            </div>

            {/* Right — mentor preview card */}
            <div className="hidden lg:block">
              <ScrollReveal variant="flip-left" delay={300} duration={1000}>
                <TiltCard className="rounded-2xl" tiltDeg={6}>
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-3 mb-6">
                      <img
                        src="/landing/mentor-sample.png"
                        alt="Назгуль А."
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                        loading="lazy"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">Назгуль А.</div>
                        <div className="text-sm text-gray-400">{t("bm.card.subtitle")}</div>
                      </div>
                      <Icon name="verified" size={18} filled className="text-indigo-500 ml-auto" />
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t("bm.card.students")}</span>
                        <span className="font-semibold text-gray-900">
                          <AnimatedCounter value={12} duration={1200} />
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t("bm.card.rating")}</span>
                        <span className="font-semibold text-gray-900 inline-flex items-center gap-1">
                          <span className="text-yellow-400">★</span>
                          4.9 / 5.0
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t("bm.card.response")}</span>
                        <span className="font-semibold text-gray-900">{t("bm.card.response_value")}</span>
                      </div>
                    </div>

                    {/* Mini expertise tags */}
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {[t("expertise.admission"), t("expertise.scholarships"), t("expertise.essay")].map((tag) => (
                        <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="h-px bg-gray-100 mb-4" />
                    <p className="text-xs text-gray-400 text-center">
                      {t("bm.card.note")}
                    </p>
                  </div>
                </TiltCard>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="py-28 px-4 bg-white relative overflow-hidden">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal variant="zoom-in" duration={900}>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              {t("cta.title_1")}{" "}
              <span className="font-[var(--font-display)] italic">{t("cta.title_2")}</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={150}>
            <p className="text-gray-500 text-lg mb-10 leading-relaxed">
              {t("cta.subtitle")}
            </p>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={300}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <MagneticButton strength={0.2}>
                <Link
                  href="/auth/register"
                  className="bg-gray-900 text-white px-8 py-4 rounded-xl text-[15px] font-semibold hover:bg-gray-800 transition-colors inline-block"
                >
                  {t("cta.primary")}
                </Link>
              </MagneticButton>
              <Link
                href="/mentors"
                className="border border-gray-200 text-gray-600 px-8 py-4 rounded-xl text-[15px] font-semibold hover:border-gray-300 hover:text-gray-900 transition-colors"
              >
                {t("cta.secondary")}
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── FAQ ───────────────────────────────────────────────────── */}
      <section className="py-28 px-4 bg-[#fafafa]">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal variant="fade-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight text-center">
              {t("faq.title_1")}{" "}
              <span className="font-[var(--font-display)] italic">{t("faq.title_2")}</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={200}>
            <p className="text-gray-500 text-lg text-center mb-12">
              {t("faq.subtitle")}
            </p>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={300}>
            <FaqList items={faqs} />
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-400 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-10 mb-12">
            <div className="sm:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Logo size={28} className="text-white" />
                <span className="text-white font-bold text-lg">Connectus</span>
              </div>
              <p className="text-sm leading-relaxed">
                {t("footer.tagline")}
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">{t("footer.students")}</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/mentors" className="hover:text-white transition-colors">{t("nav.find_mentor")}</Link></li>
                <li><Link href="/#how-it-works" className="hover:text-white transition-colors">{t("nav.how_it_works")}</Link></li>
                <li><Link href="/#categories" className="hover:text-white transition-colors">{t("nav.categories")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">{t("footer.mentors")}</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/become-mentor" className="hover:text-white transition-colors">{t("nav.become_mentor")}</Link></li>
                <li><Link href="/mentor/dashboard" className="hover:text-white transition-colors">{t("footer.mentor_dashboard")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">{t("footer.support")}</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href={SUPPORT_EMAIL_HREF}
                    className="inline-flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <Icon name="mail" size={16} className="text-gray-500" />
                    {SUPPORT_EMAIL}
                  </a>
                </li>
                <li>
                  <a
                    href={SUPPORT_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <Icon name="chat" size={16} className="text-gray-500" />
                    WhatsApp {SUPPORT_WHATSAPP_DISPLAY}
                  </a>
                </li>
                <li>
                  <a
                    href={SUPPORT_TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <Icon name="send" size={16} className="text-gray-500" />
                    Telegram {SUPPORT_TELEGRAM_USERNAME}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">{t("footer.copy")}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <Link href="/terms" className="hover:text-white transition-colors">{t("footer.terms")}</Link>
              <Link href="/platform-rules" className="hover:text-white transition-colors">{t("footer.rules")}</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">{t("footer.privacy")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
