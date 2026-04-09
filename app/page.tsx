import { fetchMentors } from "@/lib/api"
import Link from "next/link"
import FaqList from "@/components/FaqList"
import MentorRedirect from "@/components/MentorRedirect"
import PlatformReviews from "@/components/PlatformReviews"
import Icon from "@/components/Icon"

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
    title: "Найди ментора",
    desc: "Просмотри профили — выпускники топ университетов с разных стран",
  },
  {
    number: "02",
    title: "Бесплатная консультация",
    desc: "Запроси бесплатное знакомство — обсудите цели и план",
  },
  {
    number: "03",
    title: "Начни подготовку",
    desc: "После консультации закажи нужную услугу и получи план поступления",
  },
]

const FAQS = [
  {
    q: "Кто такие менторы на Connectus?",
    a: "Менторы — это студенты и выпускники топ университетов мира, которые прошли через процесс поступления сами и теперь помогают другим. Многие из них — стипендиаты Болашак, Chevening, DAAD и других программ. Каждый ментор проходит проверку и аутентификацию: на платформе работают только аккуратно подобранные кандидаты, которых мы проверили на компетентность.",
  },
  {
    q: "Сколько стоят услуги?",
    a: "Первая консультация у всех менторов всегда бесплатная — это знакомство, на котором вы обсудите цели и план. Цены на остальные услуги менторы устанавливают сами, и вы видите полную стоимость заранее. Никаких скрытых платежей.",
  },
  {
    q: "Как проходит консультация?",
    a: "Студент отправляет ментору запрос на бесплатную консультацию. Ментор может принять или отклонить запрос — например, если у него уже много активных студентов. После принятия открывается чат прямо на платформе, и всё общение ведётся только внутри Connectus.\n\nВажно про безопасность: все переговоры должны оставаться на платформе. Если вы обменялись личными контактами (телефон, мессенджеры, email) и работали вне Connectus — мы не несём ответственности за качество работы и не сможем помочь в случае спора.",
  },
  {
    q: "Что если ментор не подошёл?",
    a: "У каждого ментора первая консультация бесплатная — это и есть знакомство. Если вы поняли, что ментор не подходит, вы ничем не рискуете и можете выбрать другого.",
  },
  {
    q: "Зачем Connectus родителям?",
    a: "Поступление за рубеж — это сотни деталей: выбор страны и университета, экзамены, эссе, дедлайны, гранты, виза. Разобраться во всём этом самим почти нереально, а ошибка может стоить года или мечты ребёнка.\n\nConnectus даёт вам прямой доступ к тем, кто уже прошёл этот путь — выпускникам MIT, Oxbridge, TU Munich, стипендиатам Болашак и Chevening. Они расскажут как это работает на самом деле, помогут составить план под вашего ребёнка и сэкономят вам месяцы поиска информации в интернете.\n\nПервая консультация бесплатная — вы ничем не рискуете, чтобы понять подходит ли вам платформа.",
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
            <Icon name="redeem" size={16} className="text-indigo-600" />
            Первая консультация — бесплатно
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight mb-6">
            Поступи в университет<br />
            <span className="text-indigo-600">за рубежом</span> с ментором
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connectus соединяет студентов и родителей с менторами — выпускниками
            топ университетов мира. Начни с бесплатной консультации.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/mentors"
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-base font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Получить бесплатную консультацию
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
                <div className="text-3xl font-bold text-gray-900 tracking-tight">{stat.value}</div>
                <div className="text-sm text-gray-600 mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-24 px-4 bg-gradient-to-b from-white via-indigo-50/30 to-white overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute top-10 -left-20 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 -right-20 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white border border-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 shadow-sm">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              Простой процесс
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">Как это работает</h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto leading-relaxed">
              Три простых шага до начала подготовки к поступлению
            </p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-6">
            {/* Connecting dashed line on desktop */}
            <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-0.5 border-t-2 border-dashed border-indigo-200 pointer-events-none" />

            {STEPS.map((step, i) => (
              <div
                key={step.number}
                className="relative bg-white rounded-2xl border border-gray-100 p-8 transform-gpu transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-100/60 group [-webkit-tap-highlight-color:transparent]"
                style={{ WebkitBackfaceVisibility: "hidden" }}
              >
                {/* Big circular step number */}
                <div className="relative w-14 h-14 mb-5 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 transform-gpu transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-3" />
                  <div className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold">
                    {step.number}
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed text-center text-[15px]">{step.desc}</p>

                {/* Bottom accent line that grows on hover */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-gradient-to-r from-indigo-400 to-purple-400 group-hover:w-1/2 transition-[width] duration-300 ease-out" />

                {/* Step index badge — sits on top of the dashed connector line */}
                <div className="hidden md:block absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white border border-indigo-100 rounded-full text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  Шаг {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Categories ───────────────────────────────────────────────── */}
      <section id="categories" className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">Популярные направления</h2>
            <p className="text-gray-600 text-lg">Выбери страну поступления</p>
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
                <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform-gpu">
                  <Icon name="arrow_forward" size={16} className="text-white" />
                </div>

                <div className="relative">
                  <div className="text-4xl mb-3 leading-none transform-gpu transition-transform duration-300 ease-out group-hover:scale-110">
                    <span className="inline-block">{cat.icon}</span>
                  </div>
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors duration-300 text-[15px]">
                    {cat.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 leading-snug">{cat.desc}</div>
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
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">Наши менторы</h2>
              <p className="text-gray-600 text-lg">Выпускники топ университетов, готовые помочь</p>
            </div>
            <Link
              href="/mentors"
              className="hidden sm:inline-flex items-center gap-1 text-indigo-600 font-medium text-sm hover:underline"
            >
              Смотреть всех
              <Icon name="arrow_forward" size={16} />
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
                    <p className="text-sm text-gray-600 mt-0.5">
                      {COUNTRY_FLAGS[mentor.country] || "🌍"} {mentor.school_or_university}
                    </p>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-[15px] text-gray-600 mb-4 line-clamp-2 leading-relaxed">
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
                    <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                      <Icon name="military_tech" size={14} />
                      {mentor.grant_or_scholarship}
                    </span>
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
              Смотреть всех менторов
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Trust section ────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-indigo-600">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Почему нам доверяют
            </h2>
            <p className="text-indigo-100 text-lg">Безопасно для студентов и родителей</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "verified", title: "Верифицированные менторы", desc: "Каждый ментор проходит проверку документов и дипломов", stat: "100%", statLabel: "проверено" },
              { icon: "chat", title: "Бесплатный чат до оплаты", desc: "Задайте вопросы ментору перед покупкой — без риска", stat: "5", statLabel: "сообщений" },
              { icon: "credit_card", title: "Прозрачные цены", desc: "Вы видите полную стоимость заранее. Никаких скрытых комиссий", stat: "0₸", statLabel: "комиссий" },
              { icon: "school", title: "Реальный опыт", desc: "Менторы — студенты и выпускники тех же университетов", stat: "50+", statLabel: "менторов" },
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
                    <div className="absolute inset-0 flex items-center [backface-visibility:hidden]" style={{ WebkitBackfaceVisibility: "hidden" }}>
                      <Icon name={item.icon} size={36} className="text-white" />
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-center [backface-visibility:hidden]" style={{ WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                      <div className="text-2xl font-bold leading-none">{item.stat}</div>
                      <div className="text-[10px] text-indigo-200 uppercase tracking-wider mt-0.5">{item.statLabel}</div>
                    </div>
                  </div>
                </div>

                <h3 className="relative font-semibold text-lg mb-2">{item.title}</h3>
                <p className="relative text-indigo-100 text-[15px] leading-relaxed">{item.desc}</p>

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
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">Отзывы студентов</h2>
            <p className="text-gray-600 text-lg">Реальные отзывы от тех, кто уже работал с менторами</p>
          </div>
          <PlatformReviews />
        </div>
      </section>

      {/* ─── For mentors ───────────────────────────────────────────── */}
      <section className="relative py-24 px-4 bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute top-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-20 -right-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/10 text-indigo-100 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full" />
              Для менторов
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Учишься за рубежом? Помогай другим
            </h2>
            <p className="text-indigo-100 text-lg max-w-2xl mx-auto leading-relaxed">
              Стань ментором Connectus и поделись своим опытом с теми, кто только начинает путь
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {[
              {
                icon: "payments",
                title: "Зарабатывай на опыте",
                desc: "Сам устанавливаешь цены на свои услуги. Гибкий график — работаешь когда удобно.",
              },
              {
                icon: "edit_note",
                title: "Простая регистрация",
                desc: "Создай профиль за 5 минут: университет, специальность, опыт. Никаких лишних шагов.",
              },
              {
                icon: "verified",
                title: "Верификация 48 часов",
                desc: "Мы проверяем диплом и подтверждаем университет. Только проверенные кандидаты на платформе.",
              },
              {
                icon: "shield",
                title: "Безопасность платформы",
                desc: "Всё общение и оплата — только на Connectus. Мы защищаем и менторов, и студентов.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 transform-gpu transition-[transform,background-color,border-color] duration-300 ease-out hover:-translate-y-1 hover:bg-white/10 hover:border-white/20 group"
                style={{ WebkitBackfaceVisibility: "hidden" }}
              >
                {/* Soft glow on hover */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

                <div className="relative">
                  <div className="mb-4 transform-gpu transition-transform duration-300 group-hover:scale-110 inline-block">
                    <Icon name={card.icon} size={36} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-white text-lg mb-2">{card.title}</h3>
                  <p className="text-indigo-100 text-[15px] leading-relaxed">{card.desc}</p>
                </div>

                {/* Bottom accent */}
                <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-indigo-400 to-purple-400 group-hover:w-full transition-[width] duration-500 ease-out rounded-full" />
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/become-mentor"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-4 rounded-2xl text-base font-bold hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/50"
            >
              Узнать больше про менторство
              <Icon name="arrow_forward" size={20} />
            </Link>
            <p className="text-sm text-indigo-200 mt-4">
              Регистрация бесплатная · 48 часов на верификацию · Никаких подписок
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA banner ───────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Готов начать?
          </h2>
          <p className="text-gray-600 text-lg mb-10 leading-relaxed">
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
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">Частые вопросы</h2>
            <p className="text-gray-600 text-lg">Всё, что нужно знать перед началом</p>
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
