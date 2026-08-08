import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mockInit = vi.fn()
const mockTrack = vi.fn()
const mockSetUserId = vi.fn()
const mockIdentifyFn = vi.fn()
const mockReset = vi.fn()
const mockIdentifySet = vi.fn()

class MockIdentify {
  set = mockIdentifySet
}

vi.mock("@amplitude/analytics-browser", () => ({
  init: mockInit,
  track: mockTrack,
  setUserId: mockSetUserId,
  identify: mockIdentifyFn,
  reset: mockReset,
  Identify: MockIdentify,
}))

describe("analytics", () => {
  const originalEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED
  const originalKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = originalEnabled
    process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY = originalKey
  })

  describe("when disabled (missing flag or key)", () => {
    it("init() resolves without loading the SDK when the flag is missing", async () => {
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = undefined
      process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY = "some-key"
      const analytics = await import("./analytics")
      await analytics.init()
      expect(mockInit).not.toHaveBeenCalled()
    })

    it("init() resolves without loading the SDK when the key is missing", async () => {
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "true"
      delete process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY
      const analytics = await import("./analytics")
      await analytics.init()
      expect(mockInit).not.toHaveBeenCalled()
    })

    it("track/identify/clearIdentity are noops before init when disabled", async () => {
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "false"
      process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY = "some-key"
      const analytics = await import("./analytics")
      await analytics.init()
      analytics.track("test_event")
      analytics.identify("42")
      analytics.clearIdentity()
      expect(mockTrack).not.toHaveBeenCalled()
      expect(mockSetUserId).not.toHaveBeenCalled()
      expect(mockReset).not.toHaveBeenCalled()
    })
  })

  describe("when enabled", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "true"
      process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY = "test-api-key"
    })

    it("init() loads and initializes the SDK with EU zone and autocapture off", async () => {
      const analytics = await import("./analytics")
      await analytics.init()
      expect(mockInit).toHaveBeenCalledWith("test-api-key", {
        serverZone: "EU",
        autocapture: false,
      })
    })

    it("init() caches the in-flight promise across concurrent calls", async () => {
      const analytics = await import("./analytics")
      const p1 = analytics.init()
      const p2 = analytics.init()
      expect(p1).toBe(p2)
      await p1
      expect(mockInit).toHaveBeenCalledTimes(1)
    })

    it("track() forwards event type and properties after init", async () => {
      const analytics = await import("./analytics")
      await analytics.init()
      analytics.track("order_created", { orderId: 5 })
      expect(mockTrack).toHaveBeenCalledWith("order_created", { orderId: 5 })
    })

    it("track() before init() has resolved is a noop (no throw)", async () => {
      const analytics = await import("./analytics")
      // Do not await init — amplitude module reference isn't set yet.
      analytics.init()
      expect(() => analytics.track("too_early")).not.toThrow()
      expect(mockTrack).not.toHaveBeenCalled()
    })

    it("track() swallows errors thrown by the SDK", async () => {
      const analytics = await import("./analytics")
      await analytics.init()
      mockTrack.mockImplementationOnce(() => {
        throw new Error("network down")
      })
      expect(() => analytics.track("boom")).not.toThrow()
    })

    it("identify() zero-pads short numeric user ids to 5 chars", async () => {
      const analytics = await import("./analytics")
      await analytics.init()
      analytics.identify(42)
      expect(mockSetUserId).toHaveBeenCalledWith("00042")
    })

    it("identify() leaves ids of 5+ chars untouched", async () => {
      const analytics = await import("./analytics")
      await analytics.init()
      analytics.identify("123456")
      expect(mockSetUserId).toHaveBeenCalledWith("123456")
    })

    it("identify() sets traits via Identify().set() when traits are provided", async () => {
      const analytics = await import("./analytics")
      await analytics.init()
      analytics.identify("42", { role: "mentor", is_approved: true })
      expect(mockIdentifySet).toHaveBeenCalledWith("role", "mentor")
      expect(mockIdentifySet).toHaveBeenCalledWith("is_approved", true)
      expect(mockIdentifyFn).toHaveBeenCalled()
    })

    it("identify() does not build an Identify object when no traits are given", async () => {
      const analytics = await import("./analytics")
      await analytics.init()
      analytics.identify("42")
      expect(mockSetUserId).toHaveBeenCalled()
      expect(mockIdentifyFn).not.toHaveBeenCalled()
    })

    it("clearIdentity() calls amplitude.reset() after init", async () => {
      const analytics = await import("./analytics")
      await analytics.init()
      analytics.clearIdentity()
      expect(mockReset).toHaveBeenCalled()
    })

    it("clearIdentity() swallows SDK errors", async () => {
      const analytics = await import("./analytics")
      await analytics.init()
      mockReset.mockImplementationOnce(() => {
        throw new Error("boom")
      })
      expect(() => analytics.clearIdentity()).not.toThrow()
    })

    it("init() resets the cached promise and stays a noop if the SDK import throws", async () => {
      vi.doMock("@amplitude/analytics-browser", () => {
        throw new Error("chunk load failed")
      })
      vi.resetModules()
      const analytics = await import("./analytics")
      await analytics.init()
      expect(() => analytics.track("after_failed_init")).not.toThrow()
    })
  })
})
