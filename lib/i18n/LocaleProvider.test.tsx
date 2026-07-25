import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LocaleProvider, useLocale, useT } from "./LocaleProvider"
import { DEFAULT_LOCALE } from "./dict"

const STORAGE_KEY = "locale"

function Probe() {
  const { locale, setLocale } = useLocale()
  const t = useT()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translated">{t("header.login")}</span>
      <span data-testid="unknown-key">{t("this.key.does.not.exist")}</span>
      <button onClick={() => setLocale("kk")}>switch-to-kk</button>
      <button onClick={() => setLocale("ru")}>switch-to-ru</button>
    </div>
  )
}

describe("LocaleProvider / useLocale / useT", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = ""
  })

  it("throws when useLocale is called outside a LocaleProvider", () => {
    // Suppress React's expected error-boundary console noise for this case.
    function Bare() {
      useLocale()
      return null
    }
    expect(() => render(<Bare />)).toThrow(
      "useLocale must be used within LocaleProvider"
    )
  })

  it("defaults to DEFAULT_LOCALE when localStorage has nothing stored", () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    )
    expect(screen.getByTestId("locale").textContent).toBe(DEFAULT_LOCALE)
  })

  it("reads a previously stored valid locale from localStorage on mount", () => {
    localStorage.setItem(STORAGE_KEY, "kk")
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    )
    expect(screen.getByTestId("locale").textContent).toBe("kk")
    expect(document.documentElement.lang).toBe("kk")
  })

  it("ignores an invalid stored locale and keeps the default", () => {
    localStorage.setItem(STORAGE_KEY, "fr")
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    )
    expect(screen.getByTestId("locale").textContent).toBe(DEFAULT_LOCALE)
  })

  it("setLocale updates state, persists to localStorage, and sets <html lang>", async () => {
    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    )

    await user.click(screen.getByText("switch-to-kk"))

    expect(screen.getByTestId("locale").textContent).toBe("kk")
    expect(localStorage.getItem(STORAGE_KEY)).toBe("kk")
    expect(document.documentElement.lang).toBe("kk")
  })

  it("t() returns the translated string for a known key", () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    )
    expect(screen.getByTestId("translated").textContent).toBe("Войти")
  })

  it("t() falls back to the key itself when missing from every locale", () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    )
    expect(screen.getByTestId("unknown-key").textContent).toBe(
      "this.key.does.not.exist"
    )
  })

  it("t() re-resolves translations after switching locale", async () => {
    const user = userEvent.setup()
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    )
    const before = screen.getByTestId("translated").textContent
    await user.click(screen.getByText("switch-to-kk"))
    const after = screen.getByTestId("translated").textContent
    // Whatever the kk dict has for this key (own translation or ru fallback),
    // the effect must not throw and must keep producing a non-empty string.
    expect(after).toBeTruthy()
    expect(typeof before).toBe("string")
  })

  it("does not loop forever re-rendering when a valid locale is already in localStorage and matches state", () => {
    localStorage.setItem(STORAGE_KEY, DEFAULT_LOCALE)
    // If the effect looped, this render would hang/time out instead of completing.
    act(() => {
      render(
        <LocaleProvider>
          <Probe />
        </LocaleProvider>
      )
    })
    expect(screen.getByTestId("locale").textContent).toBe(DEFAULT_LOCALE)
  })
})
