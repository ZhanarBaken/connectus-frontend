// Matches ISO codes returned by backend (django-countries).
// `POPULAR_COUNTRY_CODES` powers the row of one-tap buttons; the rest
// of the world is reachable through CountryPickerModal which falls
// back to the dynamic Intl.DisplayNames lookup below.

export const POPULAR_COUNTRY_CODES = [
  "US", "GB", "DE", "ES", "IT", "FR", "NL", "CA", "AU",
] as const

// Backwards-compat alias — older imports still expect COUNTRY_CODES.
export const COUNTRY_CODES = POPULAR_COUNTRY_CODES

export type CountryCode = (typeof POPULAR_COUNTRY_CODES)[number]

// Full ISO 3166-1 alpha-2 list. Used by the country picker to expose
// every country in the world via search; emoji flags are derived from
// the code itself, names come from Intl.DisplayNames.
export const ALL_COUNTRY_CODES: string[] = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
  "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
  "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
  "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
]

// Fixed Russian labels for the popular countries — matches what the
// rest of the UI used before the picker was added. Anything outside
// this map falls through to Intl.DisplayNames.
const POPULAR_LABELS: Record<string, string> = {
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

// Cache the formatter — constructing it on every label lookup tanks
// big lists in the picker.
let _displayNames: Intl.DisplayNames | null = null
function _getDisplayNames(): Intl.DisplayNames | null {
  if (_displayNames) return _displayNames
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames === "undefined") return null
  try {
    _displayNames = new Intl.DisplayNames(["ru"], { type: "region" })
    return _displayNames
  } catch {
    return null
  }
}

// Convert ISO 3166-1 alpha-2 code to flag emoji using Unicode regional
// indicator symbols. Works for every code that has an assigned flag,
// which is virtually all of them — fallback to globe for special cases
// (e.g. XK Kosovo).
export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍"
  const upper = code.toUpperCase()
  const a = upper.charCodeAt(0)
  const b = upper.charCodeAt(1)
  // 'A' = 0x41, regional indicator 'A' = 0x1F1E6 → offset 0x1F1A5.
  if (a < 0x41 || a > 0x5A || b < 0x41 || b > 0x5A) return "🌍"
  return String.fromCodePoint(0x1F1A5 + a, 0x1F1A5 + b)
}

export function countryLabel(code: string): string {
  if (!code) return ""
  const upper = code.toUpperCase()
  if (POPULAR_LABELS[upper]) return POPULAR_LABELS[upper]
  const dn = _getDisplayNames()
  if (dn) {
    try {
      const name = dn.of(upper)
      if (name) return name
    } catch {
      // Bad code (e.g. XK historic Kosovo) — fall through.
    }
  }
  return upper
}

// Backend returns `{ country: string }[]` — these helpers take that shape.

/** Compact flags: "🇺🇸🇬🇧🇩🇪" — no spaces, for tight layouts */
export function countriesFlagsCompact(countries?: { country: string }[], max = 3): string {
  if (!countries?.length) return "🌍"
  const flags = countries.slice(0, max).map((c) => countryFlag(c.country)).join("")
  const extra = countries.length - max
  return extra > 0 ? `${flags}+${extra}` : flags
}

/** Spaced flags: "🇺🇸 🇬🇧 🇩🇪" */
export function countriesFlagsInline(countries?: { country: string }[]): string {
  if (!countries?.length) return "🌍"
  return countries.map((c) => countryFlag(c.country)).join(" ")
}

/** Full labels: "🇺🇸 США, 🇬🇧 Великобритания" */
export function countriesLabelInline(countries?: { country: string }[]): string {
  if (!countries?.length) return "—"
  return countries
    .map((c) => `${countryFlag(c.country)} ${countryLabel(c.country)}`)
    .join(", ")
}
