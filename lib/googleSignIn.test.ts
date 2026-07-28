import { describe, it, expect, vi, afterEach } from "vitest"
import { promptGoogleCredential, GoogleSignInUnavailableError } from "./googleSignIn"

describe("promptGoogleCredential", () => {
  afterEach(() => {
    delete (window as unknown as { google?: unknown }).google
    vi.useRealTimers()
  })

  it("rejects immediately when window.google is not present", async () => {
    // Asserting the error class, not a message — this used to reject with
    // a hardcoded Russian string that leaked straight into the UI on
    // every locale (every caller's `e instanceof Error ? e.message : t(...)`
    // picked the untranslated text). Callers now pick their own translated
    // copy off the class instead.
    await expect(promptGoogleCredential("client-id-123")).rejects.toBeInstanceOf(
      GoogleSignInUnavailableError,
    )
  })

  it("rejects immediately when window.google.accounts.id is missing", async () => {
    ;(window as unknown as { google: object }).google = { accounts: {} }
    await expect(promptGoogleCredential("client-id-123")).rejects.toBeInstanceOf(
      GoogleSignInUnavailableError,
    )
  })

  it("initializes with the given client_id and FedCM enabled, then calls prompt()", async () => {
    vi.useFakeTimers()
    const initialize = vi.fn()
    const prompt = vi.fn()
    ;(window as unknown as { google: unknown }).google = {
      accounts: { id: { initialize, prompt } },
    }

    const promise = promptGoogleCredential("client-id-123", 1000)
    const assertion = expect(promise).rejects.toThrow()

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "client-id-123",
        use_fedcm_for_prompt: true,
        callback: expect.any(Function),
      })
    )
    expect(prompt).toHaveBeenCalled()

    // Flush the backstop timeout so no real timer is left dangling.
    await vi.advanceTimersByTimeAsync(1000)
    await assertion
  })

  it("resolves with the credential when the SDK invokes the callback", async () => {
    let capturedCallback: ((response: { credential: string }) => void) | undefined
    const initialize = vi.fn((config: { callback: (r: { credential: string }) => void }) => {
      capturedCallback = config.callback
    })
    const prompt = vi.fn()
    ;(window as unknown as { google: unknown }).google = {
      accounts: { id: { initialize, prompt } },
    }

    const promise = promptGoogleCredential("client-id-123")
    capturedCallback?.({ credential: "the-jwt-credential" })

    await expect(promise).resolves.toBe("the-jwt-credential")
  })

  it("rejects with GoogleSignInUnavailableError if nothing happens before timeoutMs", async () => {
    vi.useFakeTimers()
    const initialize = vi.fn()
    const prompt = vi.fn()
    ;(window as unknown as { google: unknown }).google = {
      accounts: { id: { initialize, prompt } },
    }

    const promise = promptGoogleCredential("client-id-123", 5000)
    const assertion = expect(promise).rejects.toBeInstanceOf(GoogleSignInUnavailableError)
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })

  it("does not reject after timeout if the callback already resolved (settle is idempotent)", async () => {
    vi.useFakeTimers()
    let capturedCallback: ((response: { credential: string }) => void) | undefined
    const initialize = vi.fn((config: { callback: (r: { credential: string }) => void }) => {
      capturedCallback = config.callback
    })
    const prompt = vi.fn()
    ;(window as unknown as { google: unknown }).google = {
      accounts: { id: { initialize, prompt } },
    }

    const promise = promptGoogleCredential("client-id-123", 5000)
    capturedCallback?.({ credential: "cred-abc" })
    await vi.advanceTimersByTimeAsync(5000)

    await expect(promise).resolves.toBe("cred-abc")
  })
})
