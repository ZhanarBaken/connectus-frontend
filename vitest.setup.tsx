import "@testing-library/jest-dom/vitest"
import type { ComponentProps, ReactNode } from "react"
import { vi } from "vitest"
import { createTranslator } from "next-intl"
import ruMessages from "./messages/ru.json"

// jsdom doesn't implement matchMedia — ScrollReveal/FloatingOrb query it
// for prefers-reduced-motion.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

// jsdom doesn't implement IntersectionObserver — used by ScrollReveal/
// AnimatedCounter to trigger on-scroll animations.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ""
  readonly thresholds: ReadonlyArray<number> = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}
window.IntersectionObserver = MockIntersectionObserver
global.IntersectionObserver = MockIntersectionObserver

// next/navigation's App Router hooks throw outside a real Next.js render
// tree — every test that renders a page/component using useRouter/
// useSearchParams/usePathname needs this mocked. Individual tests can
// override return values with vi.mocked(useRouter).mockReturnValue(...).
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => "/"),
  useParams: vi.fn(() => ({ locale: "ru" })),
}))

// Backs useTranslations()/getTranslations() with real RU strings (via
// next-intl's own non-React translation engine) instead of raw keys, so
// every existing getByText("Войти")-style assertion written before this
// migration keeps passing unmodified — wrapping all ~80 test files in a
// NextIntlClientProvider just to stop them crashing would touch every
// file for no behavioral benefit.
function translatorFor(namespace?: string) {
  // next-intl infers a strict namespace union from the real message
  // shape, but the mocked useTranslations()/getTranslations() below
  // accept whatever string call sites pass at runtime (including no
  // namespace, or a full dotted path used as a "namespace" the way
  // LandingSections.tsx does) — this mock exists to be permissive, not
  // to re-enforce that type-checking in test setup.
  return createTranslator({
    locale: "ru",
    messages: ruMessages,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    namespace: namespace as any,
  })
}

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>()
  return {
    ...actual,
    useTranslations: (namespace?: string) => translatorFor(namespace),
    useLocale: () => "ru",
    NextIntlClientProvider: ({ children }: { children: ReactNode }) => children,
  }
})

vi.mock("next-intl/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl/server")>()
  return {
    ...actual,
    getTranslations: async (opts?: string | { namespace?: string }) =>
      translatorFor(typeof opts === "string" ? opts : opts?.namespace),
    getLocale: async () => "ru",
    setRequestLocale: () => {},
    getMessages: async () => ruMessages,
  }
})

// @/i18n/navigation isn't a re-export of next/navigation — it's
// next-intl's locale-aware wrapper, which needs routing config this test
// environment doesn't provide. Mirror the plain next/navigation mock
// shape above so components importing from either module get an
// equivalent, already-familiar mock surface.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: ComponentProps<"a">) => (
    <a href={typeof href === "string" ? href : String(href)} {...rest}>{children}</a>
  ),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  redirect: vi.fn(),
  getPathname: vi.fn((x: { href: string }) => x.href),
}))
