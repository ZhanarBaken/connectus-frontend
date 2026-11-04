import { afterEach, describe, expect, it, vi } from "vitest"
import { clearRegistrationLocaleDraft, readRegistrationLocaleDraft, saveRegistrationLocaleDraft } from "./registrationLocaleDraft"

const draft = { step: 2 as const, role: "mentor" as const, country: "UZ", email: "mentor@example.com", password: "private-password", registered: false }

afterEach(() => {
  clearRegistrationLocaleDraft()
  vi.useRealTimers()
})

describe("registration locale handoff cleanup", () => {
  it("expires a handoff if navigation never reaches its destination", () => {
    vi.useFakeTimers()
    saveRegistrationLocaleDraft("en", draft)
    expect(readRegistrationLocaleDraft("en")).toEqual(draft)
    vi.advanceTimersByTime(30_000)
    expect(readRegistrationLocaleDraft("en")).toBeNull()
  })

  it("clears sensitive memory when the document exits", () => {
    saveRegistrationLocaleDraft("en", draft)
    window.dispatchEvent(new Event("pagehide"))
    expect(readRegistrationLocaleDraft("en")).toBeNull()
  })

  it("does not offer a draft to another locale or query", () => {
    saveRegistrationLocaleDraft("en", draft)
    expect(readRegistrationLocaleDraft("kk")).toBeNull()
    window.history.replaceState(null, "", "/?role=student")
    expect(readRegistrationLocaleDraft("en")).toBeNull()
    window.history.replaceState(null, "", "/")
  })
})
