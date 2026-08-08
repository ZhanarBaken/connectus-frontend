import { describe, it, expect } from "vitest"
import { LANGUAGE_LABELS, LANGUAGE_CODES, languageLabel } from "./languages"

describe("LANGUAGE_CODES", () => {
  it("matches the keys of LANGUAGE_LABELS", () => {
    expect(LANGUAGE_CODES).toEqual(Object.keys(LANGUAGE_LABELS))
  })

  it("has no duplicates", () => {
    expect(new Set(LANGUAGE_CODES).size).toBe(LANGUAGE_CODES.length)
  })
})

describe("languageLabel", () => {
  it("returns the Russian label for a known code", () => {
    expect(languageLabel("en")).toBe("English")
    expect(languageLabel("ru")).toBe("Русский")
  })

  it("falls back to the raw code for an unknown language", () => {
    expect(languageLabel("xx")).toBe("xx")
  })
})
