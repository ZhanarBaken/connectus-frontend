import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

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
  useParams: vi.fn(() => ({})),
}))
