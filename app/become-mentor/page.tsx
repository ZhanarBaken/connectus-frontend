import Link from "next/link"

const BENEFITS = [
  {
    icon: "💰",
    title: "Зарабатывай на своём опыте",
    desc: "Устанавливай свои цены. Менторы на Connectus зарабатывают от $30 до $150 за одну консультацию.",
  },
  {
    icon: "🕐",
    title: "Гибкий график",
    desc: "Сам выбираешь когда и сколько работать. Совмещай с учёбой или работой без ограничений.",
  },
  {
    icon: "🌍",
    title: "Студенты из любой точки",
    desc: "Помогай студентам из Казахстана, Узбекистана, Кыргызстана и других стран — онлайн.",
  },
  {
    icon: "🔒",
    title: "Безопасные выплаты",
    desc: "Платформа гарантирует оплату. Деньги поступают на твой счёт после завершения услуги.",
  },
]

const STEPS = [
  {
    number: "01",
    title: "Создай профиль",
    desc: "Расскажи о своём университете, специальности, грантах и опыте поступления",
  },
  {
    number: "02",
    title: "Добавь услуги",
    desc: "Выбери что предлагаешь — консультации, проверку эссе, помощь с документами",
  },
  {
    number: "03",
    title: "Пройди проверку",
    desc: "Мы верифицируем твой профиль в течение 48 часов и публикуем на платформе",
  },
  {
    number: "04",
    title: "Принимай заявки",
    desc: "Студенты находят тебя, оплачивают услугу, и ты начинаешь помогать",
  },
]

const TESTIMONIALS = [
  {
    name: "Назгуль А.",
    uni: "MIT, Computer Science",
    grant: "Болашак",
    text: "За первый месяц я провела 8 консультаций. Это отличный способ помочь другим и при этом заработать.",
    earnings: "$320",
    avatar: "Н",
  },
  {
    name: "Айдана С.",
    uni: "University of Edinburgh",
    grant: "Chevening",
    text: "Я сама прошла через сложный путь поступления. Теперь помогаю другим не совершать мои ошибки.",
    earnings: "$480",
    avatar: "А",
  },
  {
    name: "Ерлан Ж.",
    uni: "TU Munich, Engineering",
    grant: "DAAD",
    text: "Connectus дал мне платформу где я могу делиться опытом и получать за это достойную оплату.",
    earnings: "$260",
    avatar: "Е",
  },
]

const FAQS = [
  {
    q: "Кто может стать ментором?",
    a: "Студент или выпускник любого зарубежного университета. Главное — реальный опыт поступления и желание помогать другим. Стипендиаты и грантополучатели приветствуются.",
  },
  {
    q: "Сколько времени занимает работа ментором?",
    a: "Столько, сколько ты сам хочешь. Можно проводить 1-2 консультации в неделю. Ты полностью контролируешь своё расписание.",
  },
  {
    q: "Как происходит оплата?",
    a: "Студент оплачивает услугу через платформу. После завершения мы переводим деньги тебе за вычетом комиссии платформы.",
  },
  {
    q: "Какая комиссия платформы?",
    a: "15% с каждой сделки. Ты устанавливаешь свою цену и видишь сколько получишь до публикации услуги.",
  },
  {
    q: "Нужно ли иметь диплом или сертификат?",
    a: "Нет. Достаточно реального опыта поступления за рубеж. Мы проверяем профиль и подтверждаем твой университет.",
  },
]

export default function BecomeMentorPage() {
  return (
    <main className="bg-white">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-indigo-950 to-indigo-800 text-white pt-20 pb-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-indigo-200 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-indigo-400 rounded-full" />
            Более 50 менторов уже зарабатывают на платформе
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
            Помогай студентам.<br />
            <span className="text-indigo-300">Зарабатывай на опыте.</span>
          </h1>
          <p className="text-xl text-indigo-200 max-w-2xl mx-auto mb-10">
            Ты поступил в зарубежный университет? Твой опыт стоит денег.
            Стань ментором на Connectus и помогай студентам из Казахстана поступить туда, где ты учишься.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="bg-white text-indigo-700 px-8 py-4 rounded-2xl text-base font-bold hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Стать ментором — бесплатно
            </Link>
            <a
              href="#how-it-works"
              className="border border-white/30 text-white px-8 py-4 rounded-2xl text-base font-semibold hover:bg-white/10 transition-colors"
            >
              Узнать подробнее
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "$150", label: "Макс. за консультацию" },
              { value: "48ч", label: "Верификация профиля" },
              { value: "0₸", label: "Регистрация" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-indigo-300 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Почему менторы выбирают Connectus</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Платформа создана чтобы ты мог сосредоточиться на помощи студентам — а не на административных задачах</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((b) => (
              <div key={b.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="text-3xl mb-4">{b.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Как стать ментором</h2>
            <p className="text-gray-500 text-lg">Четыре шага от регистрации до первого заказа</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.number} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="text-5xl font-bold text-indigo-100 mb-4">{step.number}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Менторы о платформе</h2>
            <p className="text-gray-500 text-lg">Реальные истории от тех кто уже зарабатывает</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 font-bold text-sm">{t.avatar}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                      <div className="text-xs text-gray-400">{t.grant}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">{t.earnings}</div>
                    <div className="text-xs text-gray-400">за месяц</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">"{t.text}"</p>
                <p className="text-xs text-gray-400">🎓 {t.uni}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you can offer ──────────────────────────────────── */}
      <section className="py-24 px-4 bg-indigo-600">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Какие услуги ты можешь предложить</h2>
            <p className="text-indigo-200 text-lg">Выбирай то в чём ты силён</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "🎯", label: "Консультация по поступлению" },
              { icon: "✍️", label: "Проверка эссе и мотивационного письма" },
              { icon: "📄", label: "Помощь с документами" },
              { icon: "🏅", label: "Подбор стипендий" },
              { icon: "🗣️", label: "Подготовка к интервью" },
              { icon: "🗺️", label: "Выбор университета и программы" },
              { icon: "📝", label: "SAT / IELTS / TOEFL подготовка" },
              { icon: "🛂", label: "Визовые консультации" },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 rounded-2xl px-4 py-4 flex items-center gap-3 text-white">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <span className="text-sm font-medium leading-snug">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Частые вопросы</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">{faq.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Готов помогать студентам?
          </h2>
          <p className="text-gray-500 text-lg mb-10">
            Регистрация займёт 2 минуты. Верификация — 48 часов. Первый заказ — скоро.
          </p>
          <Link
            href="/auth/register"
            className="inline-block bg-indigo-600 text-white px-10 py-4 rounded-2xl text-base font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Стать ментором — бесплатно →
          </Link>
          <p className="text-sm text-gray-400 mt-4">Уже есть аккаунт? <Link href="/auth/login" className="text-indigo-600 hover:underline">Войти</Link></p>
        </div>
      </section>
    </main>
  )
}
