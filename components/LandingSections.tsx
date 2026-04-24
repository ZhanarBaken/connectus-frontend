"use client"

import Link from "next/link"
import { MentorCard } from "@/types"
import Icon from "./Icon"
import ScrollReveal from "./ScrollReveal"
import AnimatedCounter from "./AnimatedCounter"
import FloatingOrb from "./FloatingOrb"
import MagneticButton from "./MagneticButton"
import TiltCard from "./TiltCard"
import FaqList from "./FaqList"
import PlatformReviews from "./PlatformReviews"
import LandingMentors from "./LandingMentors"

interface Step {
  number: string
  title: string
  desc: string
  icon: string
}

interface Category {
  label: string
  code: string
  desc: string
}

interface FAQ {
  q: string
  a: string
}

interface Props {
  steps: Step[]
  categories: Category[]
  faqs: FAQ[]
  mentors: MentorCard[]
}

export default function LandingSections({ steps, categories, faqs, mentors }: Props) {
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
            <p className="text-sm font-semibold text-indigo-600 mb-2 tracking-wide uppercase text-center">
              Простой процесс
            </p>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={100}>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight text-center">
              Как это{" "}
              <span className="font-[var(--font-display)] italic">работает</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={200}>
            <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed text-center mb-20">
              Три шага от выбора ментора до начала подготовки
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
                      Шаг {i + 1}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-500 leading-relaxed text-[15px] max-w-xs mx-auto">
                      {step.desc}
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
                <p className="text-sm font-semibold text-indigo-600 mb-2 tracking-wide uppercase">
                  География
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                  10 стран.{" "}
                  <span className="font-[var(--font-display)] italic text-gray-400">
                    Одна платформа.
                  </span>
                </h2>
                <p className="text-gray-500 leading-relaxed mb-6">
                  Менторы из ведущих университетов помогут с поступлением
                  в выбранную страну — от документов до визы.
                </p>
                <Link
                  href="/mentors"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  Смотреть всех менторов
                  <Icon name="arrow_forward" size={16} />
                </Link>
              </ScrollReveal>
            </div>

            {/* Right — country grid */}
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat, i) => (
                <ScrollReveal
                  key={cat.label}
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
                        src={`https://flagcdn.com/24x18/${cat.code.toLowerCase()}.png`}
                        alt={cat.label}
                        width={24}
                        height={18}
                        className="rounded-sm"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
                        {cat.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 leading-snug">
                        {cat.desc}
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
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
            <p className="text-sm font-semibold text-indigo-400 mb-2 tracking-wide uppercase text-center">
              Безопасность
            </p>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={100}>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight text-center">
              Почему нам{" "}
              <span className="font-[var(--font-display)] italic text-gray-400">
                доверяют
              </span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={200}>
            <p className="text-gray-400 text-lg text-center mb-16 max-w-xl mx-auto">
              Безопасно для студентов и родителей
            </p>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 gap-px bg-gray-800 rounded-2xl overflow-hidden">
            {[
              {
                icon: "verified",
                title: "Верифицированные менторы",
                desc: "Каждый ментор проходит проверку документов и дипломов",
                stat: 100,
                statSuffix: "%",
                statLabel: "проверено",
              },
              {
                icon: "forum",
                title: "Бесплатная консультация",
                desc: "Познакомьтесь с ментором до любой оплаты — без риска",
                stat: 0,
                statSuffix: "₸",
                statLabel: "за знакомство",
              },
              {
                icon: "credit_card",
                title: "Прозрачные цены",
                desc: "Полная стоимость видна заранее. Никаких скрытых комиссий",
                stat: 0,
                statSuffix: "",
                statLabel: "скрытых платежей",
              },
              {
                icon: "school",
                title: "Реальный опыт",
                desc: "Менторы — студенты и выпускники тех же университетов",
                stat: 50,
                statSuffix: "+",
                statLabel: "менторов",
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
            <p className="text-sm font-semibold text-indigo-600 mb-2 tracking-wide uppercase text-center">
              Отзывы
            </p>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={100}>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight text-center">
              Что говорят{" "}
              <span className="font-[var(--font-display)] italic">студенты</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={200}>
            <p className="text-gray-500 text-lg text-center mb-16">
              Реальные отзывы от тех, кто уже работал с менторами
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
                <p className="text-sm font-semibold text-indigo-600 mb-2 tracking-wide uppercase">
                  Для менторов
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                  Учишься за рубежом?{" "}
                  <span className="font-[var(--font-display)] italic text-gray-400">
                    Помогай другим.
                  </span>
                </h2>
                <p className="text-gray-500 text-lg leading-relaxed mb-10 max-w-lg">
                  Стань ментором Connectus. Делись опытом, помогай
                  следующему поколению студентов пройти тот же путь.
                </p>
              </ScrollReveal>

              <div className="space-y-4 mb-10">
                {[
                  { icon: "payments", text: "Сам устанавливаешь цены и график" },
                  { icon: "edit_note", text: "Регистрация за 5 минут" },
                  { icon: "verified", text: "Верификация за 48 часов" },
                  { icon: "shield", text: "Безопасные выплаты через платформу" },
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
                      Узнать больше
                      <Icon name="arrow_forward" size={18} />
                    </Link>
                  </MagneticButton>
                  <p className="text-sm text-gray-400 self-center">
                    Бесплатно · Без подписок
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
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">Н</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Назгуль А.</div>
                        <div className="text-sm text-gray-400">MIT · Computer Science</div>
                      </div>
                      <Icon name="verified" size={18} filled className="text-indigo-500 ml-auto" />
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Студентов</span>
                        <span className="font-semibold text-gray-900">
                          <AnimatedCounter value={12} duration={1200} />
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Рейтинг</span>
                        <span className="font-semibold text-gray-900">4.9 / 5.0</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Ответ в среднем</span>
                        <span className="font-semibold text-gray-900">&lt; 2 часа</span>
                      </div>
                    </div>

                    {/* Mini expertise tags */}
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {["Поступление", "Стипендии", "Эссе"].map((tag) => (
                        <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="h-px bg-gray-100 mb-4" />
                    <p className="text-xs text-gray-400 text-center">
                      Пример профиля ментора на платформе
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
              Готов{" "}
              <span className="font-[var(--font-display)] italic">начать?</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={150}>
            <p className="text-gray-500 text-lg mb-10 leading-relaxed">
              Создай аккаунт бесплатно и найди ментора уже сегодня
            </p>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={300}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <MagneticButton strength={0.2}>
                <Link
                  href="/auth/register"
                  className="bg-gray-900 text-white px-8 py-4 rounded-xl text-[15px] font-semibold hover:bg-gray-800 transition-colors inline-block"
                >
                  Начать бесплатно
                </Link>
              </MagneticButton>
              <Link
                href="/mentors"
                className="border border-gray-200 text-gray-600 px-8 py-4 rounded-xl text-[15px] font-semibold hover:border-gray-300 hover:text-gray-900 transition-colors"
              >
                Смотреть менторов
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── FAQ ───────────────────────────────────────────────────── */}
      <section className="py-28 px-4 bg-[#fafafa]">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal variant="fade-up">
            <p className="text-sm font-semibold text-indigo-600 mb-2 tracking-wide uppercase text-center">
              FAQ
            </p>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={100}>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight text-center">
              Частые{" "}
              <span className="font-[var(--font-display)] italic">вопросы</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="blur-in" delay={200}>
            <p className="text-gray-500 text-lg text-center mb-12">
              Всё, что нужно знать перед началом
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
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="text-white font-bold text-lg">Connectus</span>
              </div>
              <p className="text-sm leading-relaxed">
                Маркетплейс менторов для поступления за рубеж
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Студентам</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/mentors" className="hover:text-white transition-colors">Найти ментора</Link></li>
                <li><Link href="/#how-it-works" className="hover:text-white transition-colors">Как это работает</Link></li>
                <li><Link href="/#categories" className="hover:text-white transition-colors">Направления</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Менторам</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/become-mentor" className="hover:text-white transition-colors">Стать ментором</Link></li>
                <li><Link href="/mentor/dashboard" className="hover:text-white transition-colors">Личный кабинет</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Поддержка</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="mailto:hello@connectus.kz" className="hover:text-white transition-colors">hello@connectus.kz</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">&copy; 2026 Connectus. Все права защищены.</p>
            <p className="text-sm">Сделано для студентов Казахстана</p>
          </div>
        </div>
      </footer>
    </>
  )
}
