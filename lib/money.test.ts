import { describe, expect, it } from "vitest"
import { formatMoney, LEGACY_ORDER_CURRENCY } from "./money"

describe("formatMoney", () => {
  it("formats decimal strings without adding commission or converting currency", () => {
    expect(formatMoney("10000.00", "KZT", "ru-RU")).toBe("10\u00a0000 ₸")
    expect(formatMoney("12.50", "KZT", "ru-RU")).toBe("12,5 ₸")
    expect(formatMoney("0.00", "KZT", "ru-RU")).toBe("0 ₸")
  })

  it.each(["", " ", "NaN", "Infinity", "1e3", "12foo", "1,000", "1.234", "9007199254740992"])(
    "does not display an invalid amount %j as a price", (amount) => {
      expect(formatMoney(amount, "KZT")).toBe("—")
    },
  )

  it.each(["USD", "kzt", "", "KZ", "KZT "])("does not relabel unsupported currency %j as tenge", (currency) => {
    expect(formatMoney("1000", currency)).toBe("—")
  })

  it("keeps the legacy order currency assumption explicit", () => {
    expect(LEGACY_ORDER_CURRENCY).toBe("KZT")
  })
})
