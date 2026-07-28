import { describe, it, expect } from "vitest"
import ru from "./ru.json"
import en from "./en.json"
import kk from "./kk.json"

// Catches exactly the class of bug where a new translation key gets added
// to one locale (usually ru, since it's written first) and the other two
// are forgotten — next-intl doesn't fail loudly on a missing key, it just
// renders the raw "Namespace.key" path as fallback text, so this would
// otherwise only surface as a live bug report from an en/kk user.
function flattenKeys(obj: Record<string, unknown>, prefix = ""): Set<string> {
  const keys = new Set<string>()
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const nested of flattenKeys(value as Record<string, unknown>, path)) {
        keys.add(nested)
      }
    } else {
      keys.add(path)
    }
  }
  return keys
}

describe("locale message parity", () => {
  const ruKeys = flattenKeys(ru)
  const enKeys = flattenKeys(en)
  const kkKeys = flattenKeys(kk)

  it("en.json has every key ru.json has, and no extras", () => {
    expect([...ruKeys].filter((k) => !enKeys.has(k))).toEqual([])
    expect([...enKeys].filter((k) => !ruKeys.has(k))).toEqual([])
  })

  it("kk.json has every key ru.json has, and no extras", () => {
    expect([...ruKeys].filter((k) => !kkKeys.has(k))).toEqual([])
    expect([...kkKeys].filter((k) => !ruKeys.has(k))).toEqual([])
  })
})
