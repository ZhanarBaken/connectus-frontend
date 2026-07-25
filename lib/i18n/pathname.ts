// No React/hooks here on purpose — lib/api.ts is not a component and
// runs outside any provider tree, so it can't use next-intl's
// useLocale()/usePathname(). These are the plain string-manipulation
// equivalents, safe to call from anywhere.
import { routing } from "@/i18n/routing"

export function localeFromPathname(pathname: string): string {
  const first = pathname.split("/")[1]
  return (routing.locales as readonly string[]).includes(first)
    ? first
    : routing.defaultLocale
}

export function withLocalePrefix(locale: string, path: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`
}
