"use client"

import Link from "next/link"
import BackButton from "@/components/BackButton"
import Icon from "@/components/Icon"

// Памятка ментора. Опускаем сюда всё что мог бы упустить новый ментор:
// первичная редактируется, без расписания клиенты не запишутся, и
// формулы выплат. Дописываем разделы по мере появления новых нюансов.

interface Section {
  icon: string
  iconColor: string
  iconBg: string
  title: string
  body: React.ReactNode
  cta?: { label: string; href: string }
}

const SECTIONS: Section[] = [
  {
    icon: "forum",
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    title: "Первичная консультация — настрой под себя",
    body: (
      <>
        <p>
          Каждому ментору платформа автоматически создаёт услугу «Первичная консультация». Это <strong>встреча-знакомство</strong>,
          её главная цель — чтобы абитуриент решил заказать у тебя дальнейшие услуги.
        </p>
        <p>
          <strong>Цену и длительность ты ставишь сам</strong> — от 0 до 200 000 ₸, от 5 до 240 минут.
          Чем дешевле и короче (например 5 000 ₸ × 15 минут), тем больше абитуриентов попробуют — это работа на воронку.
        </p>
        <p className="text-gray-500 text-xs">
          Редактируется в разделе <strong>«Мои услуги»</strong> → кнопка <em>«Изменить»</em> на карточке первичной консультации.
        </p>
      </>
    ),
    cta: { label: "Открыть «Мои услуги»", href: "/mentors/services" },
  },
  {
    icon: "calendar_month",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    title: "Заполни расписание — без него студент не запишется",
    body: (
      <>
        <p>
          Студент бронирует встречу в конкретный слот по твоему календарю. <strong>Если расписание пустое — кнопка «Заказать» не сработает.</strong>
        </p>
        <p>
          Укажи дни и часы, когда тебе удобно проводить консультации. Длительность слотов автоматически
          подстроится под цифру длительности услуги, которую студент бронирует.
        </p>
        <p className="text-gray-500 text-xs">
          Указывай реальное окно, а не «всегда» — отменённая встреча хуже, чем не пришедший студент.
        </p>
      </>
    ),
    cta: { label: "Настроить расписание", href: "/mentors/schedule" },
  },
  {
    icon: "payments",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    title: "Сколько ты получаешь",
    body: (
      <>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-semibold text-gray-900 text-sm">Первичная консультация → 50 %</p>
            <p className="text-xs text-gray-600 mt-1">
              Платформа берёт 50 % комиссии. Поставил <strong>5 000 ₸</strong> — получишь <strong>2 500 ₸</strong>.
              Если поставил 0 ₸ — комиссия тоже 0, ты ничего не получаешь, но и платформа тоже.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-semibold text-gray-900 text-sm">Прочие услуги → 75 %</p>
            <p className="text-xs text-gray-600 mt-1">
              Платформа берёт 25 % комиссии. Поставил <strong>20 000 ₸</strong> за свою услугу — получишь <strong>15 000 ₸</strong>.
            </p>
          </div>
          <div className="border border-emerald-100 bg-emerald-50/40 rounded-xl p-4">
            <p className="font-semibold text-emerald-900 text-sm">Важно: твоя доля считается от ЛИСТИНГА</p>
            <p className="text-xs text-emerald-800 mt-1">
              Если студент попадает под промо «−50 % новичку», скидку <strong>оплачивает платформа из своей комиссии</strong>,
              а не из твоих денег. Ты всё равно получишь свои 50 % от цены, которую сам указал.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    icon: "tune",
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    title: "Прочие услуги — твой следующий шаг продаж",
    body: (
      <>
        <p>
          После первичной консультации абитуриент видит твои дополнительные услуги — проверка эссе,
          сопровождение поступления, помощь с визой и т. д. <strong>Что предложить и за сколько — решаешь ты.</strong>
        </p>
        <p>
          Цена от 0 до 1 000 000 ₸, длительность от 5 до 480 минут. Платформа берёт <strong>25 % комиссии</strong>.
        </p>
        <p className="text-gray-500 text-xs">
          Добавляются там же — раздел <strong>«Мои услуги»</strong>, кнопка <em>«+ Добавить»</em>.
        </p>
      </>
    ),
    cta: { label: "Добавить услугу", href: "/mentors/services" },
  },
]

export default function MentorGuidePage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <BackButton fallbackHref="/mentor/dashboard" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-4">Памятка ментора</h1>
          <p className="text-sm text-gray-500 mt-1">
            4 вещи, которые стоит знать, прежде чем абитуриенты начнут к тебе писать.
          </p>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((section, i) => (
            <div key={section.title} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-2xl ${section.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon name={section.icon} size={22} className={section.iconColor} filled />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-gray-400">{i + 1}.</span>
                    <h2 className="text-base font-bold text-gray-900">{section.title}</h2>
                  </div>
                  <div className="text-sm text-gray-700 mt-3 space-y-2 leading-relaxed">
                    {section.body}
                  </div>
                  {section.cta && (
                    <Link
                      href={section.cta.href}
                      className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      {section.cta.label}
                      <Icon name="arrow_forward" size={16} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Вопросы? Напиши в поддержку — мы помогаем разобраться с первой настройкой.
        </p>
      </div>
    </div>
  )
}
