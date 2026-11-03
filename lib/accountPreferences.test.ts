import { afterEach, describe, expect, it, vi } from "vitest"
import { updateAccountPreferences } from "./api"

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe("updateAccountPreferences", () => {
  it("patches the authenticated account and returns the server user", async () => {
    localStorage.setItem("access_token", "token")
    const me = { id: 1, country: "KZ", time_zone: "Asia/Almaty", locale: "kk" }
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(me), { status: 200 }))
    vi.stubGlobal("fetch", fetch)
    await expect(updateAccountPreferences({ country: "KZ", time_zone: "Asia/Almaty", locale: "kk" })).resolves.toEqual(me)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/auth/me/"), expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ country: "KZ", time_zone: "Asia/Almaty", locale: "kk" }),
    }))
    const headers = new Headers(fetch.mock.calls[0][1].headers)
    expect(headers.get("Authorization")).toBe("Bearer token")
    expect(headers.get("Content-Type")).toBe("application/json")
  })

  it.each([400, 403, 429, 500])("rejects HTTP %i even with a non-JSON body", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status })))
    await expect(updateAccountPreferences({ country: "KZ" })).rejects.toThrow()
  })

  it("does not hide invalid JSON in a successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid", { status: 200 })))
    await expect(updateAccountPreferences({ country: "KZ" })).rejects.toThrow()
  })
})
