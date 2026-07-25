import { describe, it, expect, vi } from "vitest"
import {
  POPULAR_COUNTRY_CODES,
  COUNTRY_CODES,
  ALL_COUNTRY_CODES,
  countryFlag,
  countryLabel,
  countriesFlagsCompact,
  countriesFlagsInline,
  countriesLabelInline,
} from "./countries"

describe("POPULAR_COUNTRY_CODES / COUNTRY_CODES", () => {
  it("COUNTRY_CODES is a backwards-compat alias for POPULAR_COUNTRY_CODES", () => {
    expect(COUNTRY_CODES).toBe(POPULAR_COUNTRY_CODES)
  })

  it("ALL_COUNTRY_CODES contains every popular code", () => {
    for (const code of POPULAR_COUNTRY_CODES) {
      expect(ALL_COUNTRY_CODES).toContain(code)
    }
  })

  it("ALL_COUNTRY_CODES has no duplicates", () => {
    expect(new Set(ALL_COUNTRY_CODES).size).toBe(ALL_COUNTRY_CODES.length)
  })
})

describe("countryFlag", () => {
  it("converts a known ISO code to its flag emoji", () => {
    expect(countryFlag("US")).toBe("🇺🇸")
  })

  it("is case-insensitive (lowercase input)", () => {
    expect(countryFlag("us")).toBe("🇺🇸")
  })

  it("handles another known code", () => {
    expect(countryFlag("DE")).toBe("🇩🇪")
  })

  it("falls back to globe for empty string", () => {
    expect(countryFlag("")).toBe("🌍")
  })

  it("falls back to globe for wrong-length code", () => {
    expect(countryFlag("USA")).toBe("🌍")
    expect(countryFlag("U")).toBe("🌍")
  })

  it("falls back to globe for non-letter codes", () => {
    expect(countryFlag("12")).toBe("🌍")
    expect(countryFlag("!!")).toBe("🌍")
  })
})

describe("countryLabel", () => {
  it("returns the fixed Russian label for a popular country", () => {
    expect(countryLabel("US")).toBe("США")
    expect(countryLabel("DE")).toBe("Германия")
  })

  it("is case-insensitive", () => {
    expect(countryLabel("us")).toBe("США")
  })

  it("returns empty string for empty code", () => {
    expect(countryLabel("")).toBe("")
  })

  it("falls back to Intl.DisplayNames for a non-popular known code", () => {
    // KZ is not in POPULAR_LABELS — should resolve via Intl.DisplayNames.
    const label = countryLabel("KZ")
    expect(label).not.toBe("KZ")
    expect(label.length).toBeGreaterThan(0)
  })

  it("falls back to the upper-cased code when Intl.DisplayNames is unavailable", async () => {
    const original = Intl.DisplayNames
    // @ts-expect-error simulating an environment without Intl.DisplayNames
    delete Intl.DisplayNames
    try {
      // Re-import with a clean module registry so the internal
      // `_displayNames` cache (populated by earlier tests in this file)
      // doesn't mask the "unavailable" branch.
      vi.resetModules()
      const fresh = await import("./countries")
      expect(fresh.countryLabel("zz")).toBe("ZZ")
    } finally {
      ;(Intl as unknown as { DisplayNames: typeof Intl.DisplayNames }).DisplayNames = original
      vi.resetModules()
    }
  })
})

describe("countriesFlagsCompact", () => {
  it("returns globe for undefined input", () => {
    expect(countriesFlagsCompact(undefined)).toBe("🌍")
  })

  it("returns globe for empty array", () => {
    expect(countriesFlagsCompact([])).toBe("🌍")
  })

  it("joins flags without spaces up to max", () => {
    const countries = [{ country: "US" }, { country: "GB" }, { country: "DE" }]
    expect(countriesFlagsCompact(countries)).toBe("🇺🇸🇬🇧🇩🇪")
  })

  it("appends +N for entries beyond max", () => {
    const countries = [
      { country: "US" },
      { country: "GB" },
      { country: "DE" },
      { country: "FR" },
      { country: "ES" },
    ]
    expect(countriesFlagsCompact(countries, 3)).toBe("🇺🇸🇬🇧🇩🇪+2")
  })

  it("respects a custom max", () => {
    const countries = [{ country: "US" }, { country: "GB" }]
    expect(countriesFlagsCompact(countries, 1)).toBe("🇺🇸+1")
  })
})

describe("countriesFlagsInline", () => {
  it("returns globe for undefined input", () => {
    expect(countriesFlagsInline(undefined)).toBe("🌍")
  })

  it("returns globe for empty array", () => {
    expect(countriesFlagsInline([])).toBe("🌍")
  })

  it("joins all flags with spaces", () => {
    const countries = [{ country: "US" }, { country: "GB" }]
    expect(countriesFlagsInline(countries)).toBe("🇺🇸 🇬🇧")
  })
})

describe("countriesLabelInline", () => {
  it("returns em dash for undefined input", () => {
    expect(countriesLabelInline(undefined)).toBe("—")
  })

  it("returns em dash for empty array", () => {
    expect(countriesLabelInline([])).toBe("—")
  })

  it("joins flag + label pairs with comma", () => {
    const countries = [{ country: "US" }, { country: "GB" }]
    expect(countriesLabelInline(countries)).toBe("🇺🇸 США, 🇬🇧 Великобритания")
  })
})
