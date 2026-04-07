import { fetchMentors } from "@/lib/api"
import Link from "next/link"
import FaqList from "@/components/FaqList"
import MentorRedirect from "@/components/MentorRedirect"
import PlatformReviews from "@/components/PlatformReviews"

const CATEGORIES = [
  { label: "США", icon: "🇺🇸", desc: "Ivy League и топ университеты" },
  { label: "Великобритания", icon: "🇬🇧", desc: "Oxbridge, Russell Group" },
  { label: "Германия", icon: "🇩🇪", desc: "TU Munich, LMU и другие" },
  { label: "Испания", icon: "🇪🇸", desc: "IE, ESADE, UAB" },
  { label: "Италия", icon: "🇮🇹", desc: "Bocconi, Politecnico" },
  { label: "Франция", icon: "🇫🇷", desc: "Sciences Po, HEC Paris" },
  { label: "Нидерланды", icon: "🇳🇱", desc: "TU Delft, Amsterdam" },
  { label: "Канада", icon: "🇨🇦", desc: "Toronto, McGill, UBC" },
  { label: "Австралия", icon: "🇦🇺", desc: "Melbourne, Sydney, ANU" },
  { label: "Швейцария", icon: "🇨🇭", desc: "ETH Zurich, EPFL" },
]

const STEPS = [
  {
    number: "01",
    title: "Создай профиль",
    desc: "Расскажи о себе, своих целях и в какие страны хочешь поступить",
  },
  {
    number: "02",
    title: "Найди ментора",
    desc: "Просматривай профили менторов, сравнивай услуги и цены",
  },
  {
    number: "03",
    title: "Начни подготовку",
    desc: "Забронируй консультацию и получи персональный план поступления",
  },
]

const FAQS = [
  {
    q: "Кто такие менторы на Connectus?",
    a: "Менторы — это студенты и выпускники топ университетов мира, которые прошли через процесс поступления сами и теперь помогают другим. Многие из них — стипендиаты Болашак, Chevening, DAAD и других программ.",
  },
  {
    q: "Сколько стоят услуги?",
    a: "Цены устанавливают сами менторы. Консультации начинаются от $20. Вы видите стоимость заранее — никаких скрытых платежей.",
  },
  {
    q: "Как проходит консультация?",
    a: "После оплаты вы договариваетесь с ментором о времени и проводите встречу в Zoom или Google Meet. Ментор сам свяжется с вами.",
  },
  {
    q: "Что если ментор не подошёл?",
    a: "Вы можете задать вопросы ментору бесплатно до оплаты — у каждого есть мини-чат для знакомства. Так вы убедитесь что ментор подходит перед покупкой.",
  },
  {
    q: "Подходит ли Connectus для родителей?",
    a: "Да. Многие родители используют Connectus чтобы разобраться в процессе поступления и помочь своим детям. Интерфейс понятен всем.",
  },
]

const EXPERTISE_LABELS: Record<string, string> = {
  admission: "Поступление",
  scholarships: "Стипендии",
  visa: "Виза",
  documents: "Документы",
  essay: "Эссе",
  sat: "SAT/IELTS",
}

const COUNTRY_FLAGS: Record<string, string> = {
  USA: "🇺🇸",
  UK: "🇬🇧",
  Germany: "🇩🇪",
  Spain: "🇪🇸",
  Italy: "🇮🇹",
}

export default async function HomePage() {
  const mentors = await fetchMentors()

  return (
    <main className="bg-white">
      <MentorRedirect />
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-indigo-50 to-white pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-indigo-500 rounded-full" />
            Более 50 менторов из 15 стран
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Поступи в университет<br />
            <span className="text-indigo-600">за рубежом</span> с ментором
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            Connectus соединяет студентов и родителей с менторами — выпускниками
            топ университетов мира. Получи персональный план поступления.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/mentors"
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-base font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Найти ментора
            </Link>
            <Link
              href="/become-mentor"
              className="border border-gray-200 bg-white text-gray-700 px-8 py-4 rounded-2xl text-base font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              Стать ментором
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "50+", label: "Менторов" },
              { value: "15", label: "Стран" },
              { value: "200+", label: "Студентов" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Как это работает</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Три простых шага до начала подготовки к поступлению
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="relative p-8 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="text-5xl font-bold text-indigo-100 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Categories ───────────────────────────────────────────────── */}
      <section id="categories" className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Популярные направления</h2>
            <p className="text-gray-500 text-lg">Выбери страну поступления</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                href="/mentors"
                className="relative bg-white rounded-2xl p-5 border border-gray-100 overflow-hidden group cursor-pointer transform-gpu transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-indigo-200 [-webkit-tap-highlight-color:transparent] [backface-visibility:hidden]"
                style={{ WebkitBackfaceVisibility: "hidden" }}
              >
                {/* Soft gradient glow on hover (opacity-only, GPU-friendly) */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Animated arrow */}
                <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform-gpu">
                  <span aria-hidden>→</span>
                </div>

                <div className="relative">
                  <div className="text-4xl mb-3 leading-none transform-gpu transition-transform duration-300 ease-out group-hover:scale-110">
                    <span className="inline-block">{cat.icon}</span>
                  </div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors duration-300 text-sm">
                    {cat.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{cat.desc}</div>
                </div>

                {/* Bottom accent line — width animation instead of scale-x for crisper Safari rendering */}
                <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-indigo-500 group-hover:w-full transition-[width] duration-300 ease-out" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured mentors ─────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Наши менторы</h2>
              <p className="text-gray-500 text-lg">Выпускники топ университетов, готовые помочь</p>
            </div>
            <Link
              href="/mentors"
              className="hidden sm:inline-flex text-indigo-600 font-medium text-sm hover:underline"
            >
              Смотреть всех →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map((mentor) => (
              <Link
                key={mentor.id}
                href={`/mentors/${mentor.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-100 transition-all group"
              >
                {/* Avatar + name */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 font-bold text-xl">
                      {mentor.full_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                        {mentor.full_name}
                      </h3>
                      {mentor.is_verified && (
                        <span className="text-indigo-500 flex-shrink-0" title="Верифицирован">✓</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {COUNTRY_FLAGS[mentor.country] || "🌍"} {mentor.school_or_university}
                    </p>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                  {mentor.detailed_bio}
                </p>

                {/* Tags */}
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
                  {mentor.grant_or_scholarship && (
                    <span className="text-xs text-gray-400">🏅 {mentor.grant_or_scholarship}</span>
                  )}
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ml-auto ${
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

          <div className="text-center mt-10">
            <Link
              href="/mentors"
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors text-sm"
            >
              Смотреть всех менторов →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Trust section ────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-indigo-600">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Почему нам доверяют
            </h2>
            <p className="text-indigo-200 text-lg">Безопасно для студентов и родителей</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "✅", title: "Верифицированные менторы", desc: "Каждый ментор проходит проверку документов и дипломов", stat: "100%", statLabel: "проверено" },
              { icon: "💬", title: "Бесплатный чат до оплаты", desc: "Задайте вопросы ментору перед покупкой — без риска", stat: "5", statLabel: "сообщений" },
              { icon: "💳", title: "Прозрачные цены", desc: "Вы видите полную стоимость заранее. Никаких скрытых комиссий", stat: "0₸", statLabel: "комиссий" },
              { icon: "🎓", title: "Реальный опыт", desc: "Менторы — студенты и выпускники тех же университетов", stat: "50+", statLabel: "менторов" },
            ].map((item) => (
              <div
                key={item.title}
                className="relative rounded-2xl p-6 text-white overflow-hidden group cursor-default transform-gpu transition-[transform,background-color] duration-300 ease-out hover:-translate-y-1 bg-white/10 hover:bg-white/15 [backface-visibility:hidden]"
                style={{ WebkitBackfaceVisibility: "hidden" }}
              >
                {/* Glow blob behind icon */}
                <div className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Icon — flips to show stat on hover */}
                <div className="relative h-12 mb-4" style={{ perspective: "600px" }}>
                  <div className="absolute inset-0 transform-gpu transition-transform duration-500 ease-out group-hover:[transform:rotateY(180deg)]" style={{ transformStyle: "preserve-3d" }}>
                    <div className="absolute inset-0 flex items-center text-3xl leading-none [backface-visibility:hidden]" style={{ WebkitBackfaceVisibility: "hidden" }}>
                      <span>{item.icon}</span>
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-center [backface-visibility:hidden]" style={{ WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                      <div className="text-2xl font-bold leading-none">{item.stat}</div>
                      <div className="text-[10px] text-indigo-200 uppercase tracking-wider mt-0.5">{item.statLabel}</div>
                    </div>
                  </div>
                </div>

                <h3 className="relative font-semibold text-lg mb-2">{item.title}</h3>
                <p className="relative text-indigo-200 text-sm leading-relaxed">{item.desc}</p>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-white group-hover:w-full transition-[width] duration-500 ease-out" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Отзывы студентов</h2>
            <p className="text-gray-500 text-lg">Реальные отзывы от тех, кто уже работал с менторами</p>
          </div>
          <PlatformReviews />
        </div>
      </section>

      {/* ─── CTA banner ───────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Готов начать?
          </h2>
          <p className="text-gray-500 text-lg mb-10">
            Создай профиль бесплатно и найди ментора уже сегодня
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-base font-semibold hover:bg-indigo-700 transition-colors"
            >
              Начать бесплатно
            </Link>
            <Link
              href="/mentors"
              className="border border-gray-200 text-gray-700 px-8 py-4 rounded-2xl text-base font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              Смотреть менторов
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Частые вопросы</h2>
          </div>
          <FaqList items={FAQS} />
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4">
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
            <p className="text-sm">© 2026 Connectus. Все права защищены.</p>
            <p className="text-sm">Сделано для студентов Казахстана 🇰🇿</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
