import { createNavigation } from "next-intl/navigation"
import { routing } from "./routing"

// Locale-aware equivalents of next/navigation's Link/useRouter/usePathname/
// redirect — every non-CRM file that navigates internally should import
// from here instead of "next/navigation" so links/pushes stay on the
// current locale. app/crm/* deliberately keeps using plain next/navigation
// (CRM is outside the locale system entirely) and
// components/TelegramAutoLogin.tsx deliberately keeps using plain
// next/navigation too (see the comment in that file).
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
