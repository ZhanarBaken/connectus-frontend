import { fetchMentors } from "@/lib/api"
import { countryLabel } from "@/lib/countries"
import { MentorCard } from "@/types"
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

// Description copy for the most-covered destinations. Used when the
// country actually appears on a mentor profile — KNOWN_CATEGORY_ORDER
// preserves the curated visual order; everything else falls through to
// the dynamic builder below with a generic subtitle.
const KNOWN_CATEGORIES: Record<string, { label: string; desc: string }> = {
  US: { label: "США", desc: "Ivy League и топ университеты" },
  GB: { label: "Великобритания", desc: "Oxbridge, Russell Group" },
  DE: { label: "Германия", desc: "TU Munich, LMU и другие" },
  ES: { label: "Испания", desc: "IE, ESADE, UAB" },
  IT: { label: "Италия", desc: "Bocconi, Politecnico" },
  FR: { label: "Франция", desc: "Sciences Po, HEC Paris" },
  NL: { label: "Нидерланды", desc: "TU Delft, Amsterdam" },
  CA: { label: "Канада", desc: "Toronto, McGill, UBC" },
  AU: { label: "Австралия", desc: "Melbourne, Sydney, ANU" },
  CH: { label: "Швейцария", desc: "ETH Zurich, EPFL" },
}
const KNOWN_CATEGORY_ORDER = Object.keys(KNOWN_CATEGORIES)

function buildCategoriesFromMentors(mentors: MentorCard[]) {
  const codes = new Set<string>()
  for (const m of mentors) {
    for (const c of m.countries) {
      const code = c.country.toUpperCase()
      // KZ excluded — the platform serves Kazakhstan, so showing the
      // home country alongside foreign destinations is misleading.
      if (code === "KZ") continue
      codes.add(code)
    }
  }

  const known: { label: string; code: string; desc: string }[] = []
  const unknown: { label: string; code: string; desc: string }[] = []
  for (const code of codes) {
    const meta = KNOWN_CATEGORIES[code]
    if (meta) {
      known.push({ code, label: meta.label, desc: meta.desc })
    } else {
      unknown.push({ code, label: countryLabel(code), desc: "Менторы платформы" })
    }
  }
  known.sort(
    (a, b) =>
      KNOWN_CATEGORY_ORDER.indexOf(a.code) - KNOWN_CATEGORY_ORDER.indexOf(b.code),
  )
  unknown.sort((a, b) => a.label.localeCompare(b.label, "ru"))
  return [...known, ...unknown]
}

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
  const allMentors = await safeFetchMentors()
  // Landing-only filter: only surface mentors who are currently
  // taking new students. The catalog page (/mentors) still shows
  // everyone — that's where a student lands when they want to
  // browse and possibly favourite someone who's on a break.
  // Backend's .public() queryset already excludes banned profiles,
  // so is_accepting_bookings is the one flag we layer on top here.
  const mentors = allMentors.filter((m) => m.is_accepting_bookings)
  // Country grid reflects platform-wide reach — built from every
  // public profile, not just the ones currently taking bookings.
  const categories = buildCategoriesFromMentors(allMentors)

  return (
    <main className="bg-white">
      <MentorRedirect />
      <LandingHero mentors={mentors} />
      <LandingSections
        steps={STEPS}
        categories={categories}
        faqs={FAQS}
        mentors={mentors}
      />
    </main>
  )
}
