import { describe, it, expect } from "vitest"
import { redactSecrets, scrubEvent, scrubBreadcrumb } from "./sentry-scrub"
import type { Breadcrumb, ErrorEvent, EventHint } from "@sentry/nextjs"

describe("redactSecrets", () => {
  it("redacts a Telegram bot token embedded in a URL path", () => {
    const input = "https://api.telegram.org/bot123456789:AAExampleTokenValue-1234/sendMessage"
    expect(redactSecrets(input)).toBe("https://api.telegram.org/bot[REDACTED]/sendMessage")
  })

  it("redacts multiple occurrences in the same string", () => {
    const input = "/bot111:AAA then again /bot222:BBB"
    expect(redactSecrets(input)).toBe("/bot[REDACTED] then again /bot[REDACTED]")
  })

  it("leaves strings without a token untouched", () => {
    expect(redactSecrets("no secrets here")).toBe("no secrets here")
  })

  it("passes through undefined unchanged", () => {
    expect(redactSecrets(undefined)).toBeUndefined()
  })

  it("does not touch tokens that aren't prefixed with a leading slash", () => {
    // Anchor is `/bot<digits>:` — a bare "bot123:ABC" with no leading slash should survive.
    expect(redactSecrets("bot123:ABC")).toBe("bot123:ABC")
  })
})

describe("scrubEvent", () => {
  const hint = {} as EventHint

  it("deletes request data, query_string and cookies", () => {
    const event = {
      request: {
        data: { password: "secret" },
        query_string: "token=abc",
        cookies: "sessionid=xyz",
      },
    } as unknown as ErrorEvent
    const result = scrubEvent(event, hint)
    expect(result?.request?.data).toBeUndefined()
    expect(result?.request?.query_string).toBeUndefined()
    expect(result?.request?.cookies).toBeUndefined()
  })

  it("strips the query string from request.url but keeps the path", () => {
    const event = {
      request: { url: "https://connectus.kz/api/v1/orders/?token=secret123" },
    } as unknown as ErrorEvent
    const result = scrubEvent(event, hint)
    expect(result?.request?.url).toBe("https://connectus.kz/api/v1/orders/")
  })

  it("redacts a Telegram token inside request.url", () => {
    const event = {
      request: { url: "https://api.telegram.org/bot123:SECRET/sendMessage" },
    } as unknown as ErrorEvent
    const result = scrubEvent(event, hint)
    expect(result?.request?.url).toBe("https://api.telegram.org/bot[REDACTED]/sendMessage")
  })

  it("drops headers not on the allowlist", () => {
    const event = {
      request: {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer secret-token",
          Cookie: "sessionid=xyz",
          "X-Custom-Secret": "leak-me",
        },
      },
    } as unknown as ErrorEvent
    const result = scrubEvent(event, hint)
    const headers = result?.request?.headers as Record<string, string>
    expect(headers["Content-Type"]).toBe("application/json")
    expect(headers.Authorization).toBeUndefined()
    expect(headers.Cookie).toBeUndefined()
    expect(headers["X-Custom-Secret"]).toBeUndefined()
  })

  it("excludes Referer even though it looks header-like (not on allowlist)", () => {
    const event = {
      request: { headers: { Referer: "https://connectus.kz/orders/42?token=abc" } },
    } as unknown as ErrorEvent
    const result = scrubEvent(event, hint)
    const headers = result?.request?.headers as Record<string, string>
    expect(headers.Referer).toBeUndefined()
  })

  it("keeps every allowlisted header intact", () => {
    const event = {
      request: {
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "42",
          Accept: "application/json",
          "Accept-Language": "ru",
          "User-Agent": "Mozilla/5.0",
        },
      },
    } as unknown as ErrorEvent
    const result = scrubEvent(event, hint)
    expect(result?.request?.headers).toEqual({
      "Content-Type": "application/json",
      "Content-Length": "42",
      Accept: "application/json",
      "Accept-Language": "ru",
      "User-Agent": "Mozilla/5.0",
    })
  })

  it("is a no-op (still returns the event) when there is no request object", () => {
    const event = { message: "boom" } as unknown as ErrorEvent
    const result = scrubEvent(event, hint)
    expect(result).toBe(event)
  })
})

describe("scrubBreadcrumb", () => {
  it("strips the query string from crumb.data.url", () => {
    const crumb = {
      data: { url: "https://connectus.kz/api/v1/reviews/?mentor=42&secret=1" },
    } as unknown as Breadcrumb
    const result = scrubBreadcrumb(crumb)
    expect((result?.data as Record<string, unknown>).url).toBe(
      "https://connectus.kz/api/v1/reviews/"
    )
  })

  it("redacts a Telegram token in the breadcrumb message", () => {
    const crumb = {
      message: "Fetch failed: /bot999:TOKEN/getMe",
    } as unknown as Breadcrumb
    const result = scrubBreadcrumb(crumb)
    expect(result?.message).toBe("Fetch failed: /bot[REDACTED]/getMe")
  })

  it("leaves a breadcrumb with no data/message untouched", () => {
    const crumb = { category: "navigation" } as unknown as Breadcrumb
    const result = scrubBreadcrumb(crumb)
    expect(result).toEqual({ category: "navigation" })
  })

  it("leaves non-string data.url values untouched", () => {
    const crumb = { data: { url: 123 } } as unknown as Breadcrumb
    const result = scrubBreadcrumb(crumb)
    expect((result?.data as Record<string, unknown>).url).toBe(123)
  })
})
