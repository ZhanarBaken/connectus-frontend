import { describe, it, expect, vi, beforeEach } from "vitest"
import { render } from "@testing-library/react"

vi.mock("@/lib/analytics", () => ({
  init: vi.fn().mockResolvedValue(undefined),
}))

import { init } from "@/lib/analytics"
import AnalyticsInit from "./AnalyticsInit"

describe("AnalyticsInit", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders nothing", () => {
    const { container } = render(<AnalyticsInit />)
    expect(container).toBeEmptyDOMElement()
  })

  it("calls analytics init exactly once on mount", () => {
    render(<AnalyticsInit />)
    expect(init).toHaveBeenCalledTimes(1)
  })

  it("does not call init again on re-render", () => {
    const { rerender } = render(<AnalyticsInit />)
    rerender(<AnalyticsInit />)
    expect(init).toHaveBeenCalledTimes(1)
  })
})
