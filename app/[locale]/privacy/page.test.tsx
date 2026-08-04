import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import PrivacyPage from "./page"

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api")
  return {
    ...actual,
    fetchPublicSettings: vi.fn(),
  }
})

import { fetchPublicSettings, type PublicSettings } from "@/lib/api"

function makeSettings(overrides: Partial<PublicSettings> = {}): PublicSettings {
  return {
    dispute_window_hours: 48,
    support_dispute_window_hours: 168,
    support_intro_call_response_deadline_hours: 24,
    support_url: "https://t.me/connectus_app_bot",
    terms_text: "",
    platform_rules_text: "",
    data_consent_text: "",
    privacy_policy_text: "",
    support_intro_call_duration_minutes: 15,
    ...overrides,
  }
}

describe("PrivacyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows a loading spinner while the text is being fetched", () => {
    vi.mocked(fetchPublicSettings).mockReturnValue(new Promise(() => {}))
    render(<PrivacyPage />)
    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("renders the fetched privacy policy text", async () => {
    vi.mocked(fetchPublicSettings).mockResolvedValue(
      makeSettings({ privacy_policy_text: "Мы собираем только необходимые данные." }),
    )
    render(<PrivacyPage />)

    expect(await screen.findByText("Мы собираем только необходимые данные.")).toBeInTheDocument()
  })

  it("shows a not-yet-published message when the text is empty", async () => {
    vi.mocked(fetchPublicSettings).mockResolvedValue(makeSettings({ privacy_policy_text: "" }))
    render(<PrivacyPage />)

    expect(await screen.findByText("Политика пока не опубликована.")).toBeInTheDocument()
  })

  it("shows an error fallback when the fetch fails", async () => {
    vi.mocked(fetchPublicSettings).mockRejectedValue(new Error("network"))
    render(<PrivacyPage />)

    expect(await screen.findByText(/Не удалось загрузить текст/)).toBeInTheDocument()
  })
})
