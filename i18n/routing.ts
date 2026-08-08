import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["ru", "en", "kk"],
  defaultLocale: "ru",
  // ru stays unprefixed (/orders/42, /mentors/5 unchanged from today) —
  // only en/kk get a /en or /kk prefix. Keeps every existing RU URL
  // (bookmarks, the Telegram deep-link's hardcoded /orders/${id}, the
  // small crawlable public surface) working with zero migration risk.
  localePrefix: "as-needed",
})
