// Matches apps.mentors.models.Language on the backend — keep in sync
// if a language is ever added/removed there. Unlike countries there's
// no "rest of the world" fallback: this is the complete, fixed set.

export const LANGUAGE_LABELS: Record<string, string> = {
  ru: "Русский", kz: "Қазақша", en: "English", de: "Deutsch",
  fr: "Français", tr: "Türkçe", zh: "中文", ar: "العربية",
  es: "Español", it: "Italiano", ja: "日本語", ko: "한국어",
  pl: "Polski", pt: "Português", uk: "Українська",
}

export const LANGUAGE_CODES = Object.keys(LANGUAGE_LABELS)

export function languageLabel(code: string): string {
  return LANGUAGE_LABELS[code] ?? code
}
