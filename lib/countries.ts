// Matches ISO codes returned by backend (django-countries).
// Keep in sync with the countries actually used on the platform.

export const COUNTRY_CODES = [
  "US", "GB", "DE", "ES", "IT", "FR", "NL", "CA", "AU",
] as const

export type CountryCode = (typeof COUNTRY_CODES)[number]

export const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸",
  GB: "🇬🇧",
  DE: "🇩🇪",
  ES: "🇪🇸",
  IT: "🇮🇹",
  FR: "🇫🇷",
  NL: "🇳🇱",
  CA: "🇨🇦",
  AU: "🇦🇺",
}

export const COUNTRY_LABELS: Record<string, string> = {
  US: "США",
  GB: "Великобритания",
  DE: "Германия",
  ES: "Испания",
  IT: "Италия",
  FR: "Франция",
  NL: "Нидерланды",
  CA: "Канада",
  AU: "Австралия",
}

export function countryFlag(code: string): string {
  return COUNTRY_FLAGS[code] || "🌍"
}

export function countryLabel(code: string): string {
  return COUNTRY_LABELS[code] || code
}

// Backend returns `{ country: string }[]` — these helpers take that shape.
export function countriesFlagsInline(countries: { country: string }[]): string {
  return countries.map((c) => countryFlag(c.country)).join(" ")
}

export function countriesLabelInline(countries: { country: string }[]): string {
  return countries
    .map((c) => `${countryFlag(c.country)} ${countryLabel(c.country)}`)
    .join(", ")
}
