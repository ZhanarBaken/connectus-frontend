import { getLocale, getTranslations } from "next-intl/server"
import { fetchMentors } from "@/lib/api"
import { countryLabel } from "@/lib/countries"
import { MentorCard } from "@/types"
import LandingHero from "@/components/LandingHero"
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
  KZ: { label: "Казахстан", desc: "Назарбаев Университет, КИМЭП" },
}
const KNOWN_CATEGORY_ORDER = Object.keys(KNOWN_CATEGORIES)

// `known` (the curated 11) always gets its real label/desc from
// LandingSections' localizedCategory() lookup — these RU defaults are
// only a fallback if a translation key is ever missing. `unknown` (any
// other country a mentor has set) has no curated copy, so its label
// and generic description need to be localized here directly.
function buildCategoriesFromMentors(mentors: MentorCard[], locale: string, genericDesc: string) {
  const codes = new Set<string>()
  for (const m of mentors) {
    for (const c of m.countries) {
      const code = c.country.toUpperCase()
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
      unknown.push({ code, label: countryLabel(code, locale), desc: genericDesc })
    }
  }
  known.sort(
    (a, b) =>
      KNOWN_CATEGORY_ORDER.indexOf(a.code) - KNOWN_CATEGORY_ORDER.indexOf(b.code),
  )
  unknown.sort((a, b) => a.label.localeCompare(b.label, locale))
  return [...known, ...unknown]
}

export default async function HomePage() {
  const allMentors = await safeFetchMentors()
  // Landing-only filter: only surface mentors who are currently
  // taking new students. The catalog page (/mentors) still shows
  // everyone — that's where a student lands when they want to
  // browse and possibly favourite someone who's on a break.
  // Backend's .public() queryset already excludes banned profiles,
  // so is_accepting_bookings is the one flag we layer on top here.
  const mentors = allMentors.filter((m) => m.is_accepting_bookings)
  const locale = await getLocale()
  const t = await getTranslations("Landing.Categories")
  // Country grid reflects platform-wide reach — built from every
  // public profile, not just the ones currently taking bookings.
  const categories = buildCategoriesFromMentors(allMentors, locale, t("genericDesc"))

  return (
    <main className="bg-white">
      <LandingHero mentors={mentors} />
      <LandingSections categories={categories} mentors={mentors} />
    </main>
  )
}
