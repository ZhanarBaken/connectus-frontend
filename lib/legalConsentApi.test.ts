import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { googleAuth, register, telegramFinalize, telegramLoginStart, telegramMiniAppLogin, telegramStart } from "./api"
import { LegalConsentError } from "./legalConsent"
import { legalConsents } from "@/test/fixtures/legalConsent"

beforeEach(() => { vi.stubGlobal("fetch", vi.fn()) })
afterEach(() => { vi.unstubAllGlobals() })

const signupCalls = [
  () => register("signup@example.com", "password", "student", true, "UZ", "kk", legalConsents),
  () => googleAuth("google-token", "student", "UZ", "kk", legalConsents),
  () => telegramStart("student", "kk", "UZ", legalConsents),
  () => telegramMiniAppLogin("init-data", "student", { country: "UZ", locale: "kk" }, legalConsents),
  () => telegramFinalize("signup-token", legalConsents),
]

describe("explicit legal consent transport", () => {
  it.each(signupCalls)("sends the exact payload as the optional final argument", async call => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ access: "access", created: true })))
    await call()
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body.legal_consents).toEqual(legalConsents)
    // Document language remains Russian despite independent residence/locale.
    expect(body.legal_consents.terms.language).toBe("ru")
  })

  it.each(signupCalls)("raises a typed actionable error for rejected versions", async call => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ legal_consents: ["Changed"] }), { status: 400 }))
    await expect(call()).rejects.toBeInstanceOf(LegalConsentError)
  })

  it("browser returning login explicitly cannot create an account", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ token: "token", bot_url: "url" })))
    await telegramLoginStart("kk")
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ role: "student", locale: "kk", login_only: true })
  })

  it("legacy email client omits version evidence entirely", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}"))
    await register("signup@example.com", "password", "student", true)
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).not.toHaveProperty("legal_consents")
  })
})
