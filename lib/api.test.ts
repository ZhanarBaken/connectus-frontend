import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  AccountNotFoundError,
  authFetch,
  clearAuth,
  createSupportInvoice,
  fetchMentor,
  fetchMentorClients,
  fetchMentorEarnings,
  fetchOrder,
  fetchPublicSettings,
  firstErrorMessage,
  formatCooldown,
  formatCooldownShort,
  getFreshAccessToken,
  GoogleAuthNotConfiguredError,
  googleAuth,
  GoogleEmailTakenError,
  googleLink,
  googleUnlink,
  register,
  resendVerification,
  SESSION_EXPIRED_EVENT,
  telegramMiniAppLogin,
  telegramStart,
  telegramUnlink,
  updateUserLocale,
} from "./api"

describe("firstErrorMessage", () => {
  it("returns a flat top-level string list's first item", () => {
    expect(firstErrorMessage({ weekly: ["Overlapping windows on weekday 0."] }))
      .toBe("Overlapping windows on weekday 0.")
  })

  it("digs through a nested ListSerializer item shape", () => {
    // Regression: MentorScheduleSerializer's `weekly` field is itself a
    // ListSerializer of MentorAvailabilityWindowSerializer (many=True) —
    // a validate() error on ONE item comes back doubly-nested, not the
    // flat {"weekly": ["..."]} shape a parent-level field validator
    // produces. A shallow `Object.values(err)[0]` extraction only
    // unwraps one level and stringifies the remaining object to
    // "[object Object]" instead of finding the real message.
    const shape = { weekly: [{ non_field_errors: ["end_time must be strictly after start_time."] }] }
    expect(firstErrorMessage(shape)).toBe("end_time must be strictly after start_time.")
  })

  it("returns undefined for an empty object", () => {
    expect(firstErrorMessage({})).toBeUndefined()
  })

  it("returns undefined for an empty array", () => {
    expect(firstErrorMessage([])).toBeUndefined()
  })

  it("returns the bare string unchanged", () => {
    expect(firstErrorMessage("Cannot book a slot in the past.")).toBe("Cannot book a slot in the past.")
  })
})

describe("formatCooldown", () => {
  it("formats seconds under a minute", () => {
    expect(formatCooldown(47)).toBe("47 секунд")
  })

  it("formats a round number of minutes", () => {
    expect(formatCooldown(2574)).toBe("42 минуты")
  })

  it("formats minutes with leftover seconds only under 5 minutes", () => {
    expect(formatCooldown(90)).toBe("1 минуту 30 секунд")
  })

  it("drops leftover seconds once minutes reach 5", () => {
    expect(formatCooldown(305)).toBe("5 минут")
  })

  it("formats a round number of hours", () => {
    expect(formatCooldown(7200)).toBe("2 часа")
  })

  it("formats hours with leftover minutes", () => {
    expect(formatCooldown(7260)).toBe("2 часа 1 минуту")
  })

  it("clamps negative input to zero", () => {
    expect(formatCooldown(-5)).toBe("0 секунд")
  })

  it("rounds fractional seconds", () => {
    expect(formatCooldown(59.6)).toBe("1 минуту")
  })
})

describe("formatCooldownShort", () => {
  it("formats seconds under a minute", () => {
    expect(formatCooldownShort(47)).toBe("47с")
  })

  it("formats minutes with leftover seconds", () => {
    expect(formatCooldownShort(90)).toBe("1м 30с")
  })

  it("formats a round number of minutes", () => {
    expect(formatCooldownShort(2580)).toBe("43м")
  })

  it("formats hours with leftover minutes", () => {
    expect(formatCooldownShort(7260)).toBe("2ч 1м")
  })

  it("formats a round number of hours", () => {
    expect(formatCooldownShort(7200)).toBe("2ч")
  })
})

// ─── Test helpers ────────────────────────────────────────────────────────────

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  })
}

// Builds an unsigned JWT-shaped string with the given payload so
// `_jwtExp`/`getFreshAccessToken` can decode an `exp` claim from it.
function makeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  return `${b64url({ alg: "none" })}.${b64url(payload)}.sig`
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ─── readCooldown (exercised via resendVerification's 429 handling) ────────

describe("readCooldown (via resendVerification 429 handling)", () => {
  it("prefers the Retry-After header over body fields", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        { detail: "A verification email was sent recently. Try again later.", retry_after: 999 },
        { status: 429, headers: { "Retry-After": "90" } },
      ),
    )
    await expect(resendVerification("a@b.com")).rejects.toMatchObject({
      name: "CooldownError",
      retryAfter: 90,
      message: "Письмо отправлено недавно. Попробуйте снова через 1 минуту 30 секунд.",
    })
  })

  it("falls back to the retry_after body field when there is no header", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(
        { detail: "Request was throttled. Expected available in 999 seconds.", retry_after: 45 },
        { status: 429 },
      ),
    )
    await expect(resendVerification("a@b.com")).rejects.toMatchObject({
      retryAfter: 45,
      message: "Слишком много попыток. Попробуйте снова через 45 секунд.",
    })
  })

  it("falls back to scraping the DRF throttle message when no header or field is present", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ detail: "Request was throttled. Expected available in 30 seconds." }, { status: 429 }),
    )
    await expect(resendVerification("a@b.com")).rejects.toMatchObject({
      retryAfter: 30,
      message: "Слишком много попыток. Попробуйте снова через 30 секунд.",
    })
  })

  it("matches the singular DRF wording (1 second)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ detail: "Request was throttled. Expected available in 1 second." }, { status: 429 }),
    )
    await expect(resendVerification("a@b.com")).rejects.toMatchObject({ retryAfter: 1 })
  })

  it("defaults to 60s and the fallback message when nothing is parseable", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 429 }))
    await expect(resendVerification("a@b.com")).rejects.toMatchObject({
      retryAfter: 60,
      message: "Не удалось отправить письмо",
    })
  })

  it("uses the raw detail as the message when it doesn't match a known pattern", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ detail: "Something unexpected happened" }, { status: 429 }),
    )
    await expect(resendVerification("a@b.com")).rejects.toMatchObject({
      message: "Something unexpected happened",
    })
  })
})

// ─── authFetch: 401 → refresh → retry-once ──────────────────────────────────

describe("authFetch", () => {
  it("retries transparently once with a fresh token after a 401", async () => {
    localStorage.setItem("access_token", "old_access")
    localStorage.setItem("refresh_token", "valid_refresh")

    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 })) // initial request
      .mockResolvedValueOnce(jsonResponse({ access: "new_access", refresh: "new_refresh" })) // refresh call
      .mockResolvedValueOnce(jsonResponse({ ok: true })) // retried request

    const res = await authFetch("http://example.com/protected/")

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const firstHeaders = fetchMock.mock.calls[0][1]?.headers as Headers
    expect(firstHeaders.get("Authorization")).toBe("Bearer old_access")

    const retryHeaders = fetchMock.mock.calls[2][1]?.headers as Headers
    expect(retryHeaders.get("Authorization")).toBe("Bearer new_access")

    expect(localStorage.getItem("access_token")).toBe("new_access")
    expect(localStorage.getItem("refresh_token")).toBe("new_refresh")
  })

  it("returns the response unchanged when it isn't a 401", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ hello: "world" }, { status: 200 }))
    const res = await authFetch("http://example.com/ok/")
    expect(res.status).toBe(200)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })
})

// ─── clearAuth ───────────────────────────────────────────────────────────────

describe("clearAuth", () => {
  it("removes access_token, refresh_token and role from localStorage", () => {
    localStorage.setItem("access_token", "a")
    localStorage.setItem("refresh_token", "r")
    localStorage.setItem("role", "student")

    clearAuth()

    expect(localStorage.getItem("access_token")).toBeNull()
    expect(localStorage.getItem("refresh_token")).toBeNull()
    expect(localStorage.getItem("role")).toBeNull()
  })

  it("also removes the account-bound support_chat_session_id", () => {
    // Left behind, this would let the next person on a shared/public
    // computer silently resume this account's support-chat thread as
    // an "anonymous" visitor — see lib/supportChat.ts.
    localStorage.setItem("access_token", "a")
    localStorage.setItem("support_chat_session_id", "acct-session")

    clearAuth()

    expect(localStorage.getItem("support_chat_session_id")).toBeNull()
  })
})

// ─── getFreshAccessToken ─────────────────────────────────────────────────────

describe("getFreshAccessToken", () => {
  it("returns null when there is no stored token", async () => {
    const token = await getFreshAccessToken()
    expect(token).toBeNull()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it("returns the current token as-is when it isn't near expiry", async () => {
    const farFuture = Math.floor(Date.now() / 1000) + 3600
    localStorage.setItem("access_token", makeJwt({ exp: farFuture }))

    const token = await getFreshAccessToken()

    expect(token).toBe(localStorage.getItem("access_token"))
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it("returns the current token as-is when the exp claim can't be parsed", async () => {
    localStorage.setItem("access_token", "not-a-real-jwt")

    const token = await getFreshAccessToken()

    expect(token).toBe("not-a-real-jwt")
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it("refreshes when the token is within the expiry skew window", async () => {
    const soon = Math.floor(Date.now() / 1000) + 10 // well under the 60s skew
    localStorage.setItem("access_token", makeJwt({ exp: soon }))
    localStorage.setItem("refresh_token", "valid_refresh")

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ access: "refreshed_access", refresh: "refreshed_refresh" }),
    )

    const token = await getFreshAccessToken()

    expect(token).toBe("refreshed_access")
    expect(localStorage.getItem("access_token")).toBe("refreshed_access")
  })

  it("dispatches SESSION_EXPIRED_EVENT and clears auth when refresh fails", async () => {
    const soon = Math.floor(Date.now() / 1000) + 10
    localStorage.setItem("access_token", makeJwt({ exp: soon }))
    localStorage.setItem("refresh_token", "stale_refresh")
    localStorage.setItem("role", "student")

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 401 }))

    const originalLocation = window.location
    Object.defineProperty(window, "location", {
      value: { pathname: "/dashboard", search: "", href: "" },
      writable: true,
      configurable: true,
    })

    const onSessionExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)

    try {
      await expect(getFreshAccessToken()).rejects.toThrow("Refresh failed")
      expect(onSessionExpired).toHaveBeenCalledTimes(1)
      expect(localStorage.getItem("access_token")).toBeNull()
      expect(localStorage.getItem("refresh_token")).toBeNull()
      expect(localStorage.getItem("role")).toBeNull()
    } finally {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
      Object.defineProperty(window, "location", { value: originalLocation, configurable: true })
    }
  })
})

// ─── createSupportInvoice: error message extraction priority ───────────────

describe("createSupportInvoice", () => {
  const call = () => createSupportInvoice(1, 2, "50000", 1)

  it("prefers err.detail over any field error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ detail: "Explicit detail message", mentor_service: ["ignored"] }, { status: 400 }),
    )
    await expect(call()).rejects.toThrow("Explicit detail message")
  })

  it("falls back to the first array field error when there is no detail", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ total_price: ["Must be positive"] }, { status: 400 }),
    )
    await expect(call()).rejects.toThrow("Must be positive")
  })

  it("falls back to the first plain field error when there is no detail", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ student: "Student not found" }, { status: 400 }),
    )
    await expect(call()).rejects.toThrow("Student not found")
  })

  it("falls back to the default message when the error body is empty", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 400 }))
    await expect(call()).rejects.toThrow("Не удалось отправить заявку")
  })

  it("returns the parsed order on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 7 }, { status: 201 }))
    await expect(call()).resolves.toEqual({ id: 7 })
  })
})

// ─── updateUserLocale ────────────────────────────────────────────────────────

describe("updateUserLocale", () => {
  it("PATCHes the locale to /auth/me/locale/", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ locale: "en" }))
    await updateUserLocale("en")
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain("/auth/me/locale/")
    expect(init?.method).toBe("PATCH")
    expect(init?.body).toBe(JSON.stringify({ locale: "en" }))
  })

  it("throws the backend's error detail on failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ detail: "Invalid locale." }, { status: 400 }),
    )
    await expect(updateUserLocale("en")).rejects.toThrow("Invalid locale.")
  })

  it("falls back to a generic message when the error body isn't JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("<html>502</html>", { status: 502 }))
    await expect(updateUserLocale("en")).rejects.toThrow("Не удалось сохранить язык")
  })
})

// ─── telegramStart ──────────────────────────────────────────────────────────

describe("telegramStart", () => {
  it("sends role and locale in the request body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ token: "tok", bot_url: "https://t.me/bot?start=signup_tok" }),
    )
    await telegramStart("mentor", "kk")
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain("/auth/telegram/start/")
    expect(init?.body).toBe(JSON.stringify({ role: "mentor", locale: "kk" }))
  })
})

// ─── register: error parsing ────────────────────────────────────────────────

describe("register", () => {
  it("uses the first value from the error body when it's an array", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ email: ["This email is already taken"] }, { status: 400 }),
    )
    await expect(register("a@b.com", "pw", "student", true)).rejects.toThrow(
      "This email is already taken",
    )
  })

  it("stringifies the first value from the error body when it's a plain value", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ password: "Password too short" }, { status: 400 }),
    )
    await expect(register("a@b.com", "pw", "student", true)).rejects.toThrow(
      "Password too short",
    )
  })

  it("returns the parsed user on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ id: 1, email: "a@b.com", role: "student" }, { status: 201 }),
    )
    await expect(register("a@b.com", "pw", "student", true)).resolves.toEqual({
      id: 1,
      email: "a@b.com",
      role: "student",
    })
  })
})

// ─── Representative GET wrappers ────────────────────────────────────────────

describe("fetchOrder", () => {
  it("returns the parsed order on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 42, order_status: "paid" }))
    await expect(fetchOrder(42)).resolves.toEqual({ id: 42, order_status: "paid" })
  })

  it("throws a generic error when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 500 }))
    await expect(fetchOrder(42)).rejects.toThrow("Failed to fetch order")
  })
})

describe("fetchMentor", () => {
  it("returns the parsed mentor on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: 1, name: "Aigerim" }))
    await expect(fetchMentor(1)).resolves.toEqual({ id: 1, name: "Aigerim" })
  })

  it("throws a generic error when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 404 }))
    await expect(fetchMentor(1)).rejects.toThrow("Failed to fetch mentor")
  })
})

describe("fetchPublicSettings", () => {
  it("hits /settings/public/ with no query string when no locale is given", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ terms_text: "..." }))
    await fetchPublicSettings()
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toMatch(/\/settings\/public\/$/)
  })

  it("appends ?locale=<locale> when a locale is given", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ terms_text: "..." }))
    await fetchPublicSettings("kk")
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toMatch(/\/settings\/public\/\?locale=kk$/)
  })

  it("throws a generic error when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 500 }))
    await expect(fetchPublicSettings("en")).rejects.toThrow("Failed to fetch public settings")
  })
})

describe("fetchMentorEarnings", () => {
  it("returns the parsed earnings on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ pipeline_amount: "1000" }))
    await expect(fetchMentorEarnings()).resolves.toEqual({ pipeline_amount: "1000" })
  })

  it("throws with an empty message on failure — no body worth forwarding, callers must supply their own translated copy", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 500 }))
    await expect(fetchMentorEarnings()).rejects.toThrow("")
  })
})

describe("fetchMentorClients", () => {
  it("returns the parsed client lists on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ active: [], inactive: [] }))
    await expect(fetchMentorClients()).resolves.toEqual({ active: [], inactive: [] })
  })

  it("throws with an empty message on failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 500 }))
    await expect(fetchMentorClients()).rejects.toThrow("")
  })
})

describe("googleAuth", () => {
  it("returns tokens on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ access: "a", refresh: "r" }))
    await expect(googleAuth("id-token")).resolves.toEqual({ access: "a", refresh: "r" })
  })

  it("throws GoogleEmailTakenError on 409, not a hardcoded-language Error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 409 }))
    await expect(googleAuth("id-token")).rejects.toBeInstanceOf(GoogleEmailTakenError)
  })

  it("throws GoogleAuthNotConfiguredError on 503", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 503 }))
    await expect(googleAuth("id-token")).rejects.toBeInstanceOf(GoogleAuthNotConfiguredError)
  })

  it("throws AccountNotFoundError with the backend detail when code is account_not_found", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ code: "account_not_found", detail: "No account for this email" }, { status: 400 }),
    )
    const err = await googleAuth("id-token").catch((e) => e)
    expect(err).toBeInstanceOf(AccountNotFoundError)
    expect(err.message).toBe("No account for this email")
  })

  it("throws AccountNotFoundError with an empty message when the backend gives no detail", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ code: "account_not_found" }, { status: 400 }),
    )
    await expect(googleAuth("id-token")).rejects.toThrow("")
  })

  it("forwards the backend detail for any other failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ detail: "Something broke" }, { status: 400 }))
    await expect(googleAuth("id-token")).rejects.toThrow("Something broke")
  })

  it("throws with an empty message for any other failure with no detail", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 400 }))
    await expect(googleAuth("id-token")).rejects.toThrow("")
  })
})

describe("googleLink", () => {
  it("forwards the backend detail when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ detail: "Already linked" }, { status: 400 }))
    await expect(googleLink("id-token")).rejects.toThrow("Already linked")
  })

  it("throws with an empty message when there is no detail", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 400 }))
    await expect(googleLink("id-token")).rejects.toThrow("")
  })
})

describe("googleUnlink", () => {
  it("forwards the backend detail when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ detail: "Not linked" }, { status: 400 }))
    await expect(googleUnlink()).rejects.toThrow("Not linked")
  })

  it("throws with an empty message when there is no detail or non_field_errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 400 }))
    await expect(googleUnlink()).rejects.toThrow("")
  })
})

describe("telegramUnlink", () => {
  it("forwards the backend detail when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ detail: "Not linked" }, { status: 400 }))
    await expect(telegramUnlink()).rejects.toThrow("Not linked")
  })

  it("throws with an empty message when there is no detail or non_field_errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 400 }))
    await expect(telegramUnlink()).rejects.toThrow("")
  })
})

describe("telegramMiniAppLogin", () => {
  it("returns the parsed tokens on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ ok: true, access: "AT", refresh: "RT", user_id: 1, created: false }),
    )
    await expect(telegramMiniAppLogin("init-data")).resolves.toEqual({
      ok: true, access: "AT", refresh: "RT", user_id: 1, created: false,
    })
  })

  it("returns role_required without throwing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ detail: "role_required" }, { status: 400 }),
    )
    await expect(telegramMiniAppLogin("init-data")).resolves.toEqual({
      ok: false, reason: "role_required",
    })
  })

  it("forwards the backend detail on a 400 that isn't role_required", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ detail: "Invalid init data" }, { status: 400 }))
    await expect(telegramMiniAppLogin("init-data")).rejects.toThrow("Invalid init data")
  })

  it("throws with an empty message on a 400 with no detail — callers must supply their own translated fallback", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 400 }))
    await expect(telegramMiniAppLogin("init-data")).rejects.toThrow("")
  })

  it("forwards the backend detail on any other failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ detail: "Server error" }, { status: 500 }))
    await expect(telegramMiniAppLogin("init-data")).rejects.toThrow("Server error")
  })

  it("throws with an empty message on any other failure with no detail", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { status: 500 }))
    await expect(telegramMiniAppLogin("init-data")).rejects.toThrow("")
  })
})
