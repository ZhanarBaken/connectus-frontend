import { countriesLabelInline } from "./countries"

// Older API responses contain only the legacy label; keep them readable.
type EducationProfile = { school_grade: string; school_grade_code?: string }
const legacyCodes: Record<string, string> = {
  "11 класс": "grade_11",
  "12 класс": "grade_12",
  "10 класс": "grade_10",
  "9 класс": "grade_9",
  "8 класс": "grade_8",
  "7 класс": "grade_7",
  "6 класс": "grade_6",
  "5 класс": "grade_5",
  "Колледж / училище": "college",
  "Студент вуза": "university",
  "Уже окончил(а) школу": "graduated"
}

export function studentGradeCode(profile: EducationProfile): string {
  return profile.school_grade_code || legacyCodes[profile.school_grade] || ""
}

// Keep legacy prose independent: never parse it into inferred country codes.
export function studentDesiredCountriesSummary(profile: {
  desired_country_codes?: string[]
  desired_countries?: string
}, locale: string): string {
  const selected = profile.desired_country_codes?.length
    ? countriesLabelInline(profile.desired_country_codes.map((country) => ({ country })), locale)
    : ""
  return [selected, profile.desired_countries].filter(Boolean).join(" · ")
}
