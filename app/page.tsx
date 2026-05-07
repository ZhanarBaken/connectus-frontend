import { fetchMentors } from "@/lib/api"
import Link from "next/link"
import FaqList from "@/components/FaqList"
import MentorRedirect from "@/components/MentorRedirect"
import PlatformReviews from "@/components/PlatformReviews"
import Icon from "@/components/Icon"
import LandingHero from "@/components/LandingHero"
import LandingMentors from "@/components/LandingMentors"
import LandingSections from "@/components/LandingSections"

// Render on each request — backend isn't reachable at Vercel build
// time, so static prerendering would fail with ECONNREFUSED.
export const dynamic = "force-dynamic"

async function safeFetchMentors() {
  // Degrade gracefully when the backend is unreachable (e.g. cold
  // deploy where backend isn't up yet, or temporary outage). The
  // landing renders with an empty mentor list instead of crashing.
  try {
    return await fetchMentors()
  } catch {
    return []
  }
}

const CATEGORIES = [
  { label: "США", code: "US", desc: "Ivy League и топ университеты" },
  { label: "Великобритания", code: "GB", desc: "Oxbridge, Russell Group" },
  { label: "Германия", code: "DE", desc: "TU Munich, LMU и другие" },
  { label: "Испания", code: "ES", desc: "IE, ESADE, UAB" },
  { label: "Италия", code: "IT", desc: "Bocconi, Politecnico" },
  { label: "Франция", code: "FR", desc: "Sciences Po, HEC Paris" },
  { label: "Нидерланды", code: "NL", desc: "TU Delft, Amsterdam" },
  { label: "Канада", code: "CA", desc: "Toronto, McGill, UBC" },
  { label: "Австралия", code: "AU", desc: "Melbourne, Sydney, ANU" },
  { label: "Швейцария", code: "CH", desc: "ETH Zurich, EPFL" },
]

const STEPS = [
  {
    number: "01",
    title: "Найди ментора",
    desc: "Просмотри профили выпускников топ университетов из разных стран",
    icon: "search",
  },
  {
    number: "02",
    title: "Консультация",
    desc: "Запроси знакомство — обсудите цели и составьте план",
    icon: "chat",
  },
  {
    number: "03",
    title: "Начни подготовку",
    desc: "Закажи нужную услугу и получи пошаговый план поступления",
    icon: "rocket_launch",
  },
]

const FAQS = [
  {
    q: "Кто такие менторы на Connectus?",
    a: "Менторы — это абитуриенты и выпускники топ университетов мира, которые прошли через процесс поступления сами и теперь помогают другим. Многие из них — стипендиаты Болашак, Chevening, DAAD и других программ. Каждый ментор проходит проверку и аутентификацию: на платформе работают только аккуратно подобранные кандидаты, которых мы проверили на компетентность.",
  },
  {
    q: "Сколько стоят услуги?",
    a: "Первая консультация — это знакомство, на котором вы обсудите цели и план. Цены на услуги менторы устанавливают сами, и вы видите полную стоимость заранее. Никаких скрытых платежей.",
  },
  {
    q: "Как проходит консультация?",
    a: "Абитуриент отправляет ментору запрос на консультацию. Ментор может принять или отклонить запрос — например, если у него уже много активных абитуриентов. После принятия открывается чат прямо на платформе, и всё общение ведётся только внутри Connectus.\n\nВажно про безопасность: все переговоры должны оставаться на платформе. Если вы обменялись личными контактами (телефон, мессенджеры, email) и работали вне Connectus — мы не несём ответственности за качество работы и не сможем помочь в случае спора.",
  },
  {
    q: "Что если ментор не подошёл?",
    a: "Первая консультация — это знакомство. Если вы поняли, что ментор не подходит, вы можете выбрать другого.",
  },
  {
    q: "Зачем Connectus родителям?",
    a: "Поступление за рубеж — это сотни деталей: выбор страны и университета, экзамены, эссе, дедлайны, гранты, виза. Разобраться во всём этом самим почти нереально, а ошибка может стоить года или мечты ребёнка.\n\nConnectus даёт вам прямой доступ к тем, кто уже прошёл этот путь — выпускникам MIT, Oxbridge, TU Munich, стипендиатам Болашак и Chevening. Они расскажут как это работает на самом деле, помогут составить план под вашего ребёнка и сэкономят вам месяцы поиска информации в интернете.",
  },
]

export default async function HomePage() {
  const mentors = await safeFetchMentors()

  return (
    <main className="bg-white">
      <MentorRedirect />
      <LandingHero />
      <LandingSections
        steps={STEPS}
        categories={CATEGORIES}
        faqs={FAQS}
        mentors={mentors}
      />
    </main>
  )
}
