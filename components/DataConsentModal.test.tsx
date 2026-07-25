import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DataConsentModal from "./DataConsentModal"
import { fetchPublicSettings } from "@/lib/api"
import type { PublicSettings } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  fetchPublicSettings: vi.fn(),
}))

function settings(overrides: Partial<PublicSettings> = {}): PublicSettings {
  return {
    dispute_window_hours: 48,
    support_url: "",
    terms_text: "",
    platform_rules_text: "",
    data_consent_text: "Согласен на обработку данных.",
    privacy_policy_text: "",
    support_intro_call_duration_minutes: 15,
    ...overrides,
  }
}

describe("DataConsentModal", () => {
  beforeEach(() => {
    document.body.style.overflow = ""
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.style.overflow = ""
  })

  it("renders nothing when closed", () => {
    const { container } = render(
      <DataConsentModal open={false} onConsent={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows a loading state before the text arrives", () => {
    vi.mocked(fetchPublicSettings).mockReturnValue(new Promise(() => {}))
    render(<DataConsentModal open onConsent={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText("Согласие на обработку персональных данных")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Я даю согласие" })).toBeDisabled()
  })

  it("renders the consent text once loaded and enables the consent button", async () => {
    vi.mocked(fetchPublicSettings).mockResolvedValue(settings())
    render(<DataConsentModal open onConsent={vi.fn()} onCancel={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText("Согласен на обработку данных.")).toBeInTheDocument(),
    )
    expect(screen.getByRole("button", { name: "Я даю согласие" })).not.toBeDisabled()
  })

  it("shows an error state and lets the user retry", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchPublicSettings)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(settings())
    render(<DataConsentModal open onConsent={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() =>
      expect(screen.getByText("Не удалось загрузить текст согласия.")).toBeInTheDocument(),
    )
    expect(screen.getByRole("button", { name: "Я даю согласие" })).toBeDisabled()

    await user.click(screen.getByText("Попробовать ещё раз"))
    await waitFor(() =>
      expect(screen.getByText("Согласен на обработку данных.")).toBeInTheDocument(),
    )
  })

  it("shows a not-yet-published message when the text is empty", async () => {
    vi.mocked(fetchPublicSettings).mockResolvedValue(settings({ data_consent_text: "" }))
    render(<DataConsentModal open onConsent={vi.fn()} onCancel={vi.fn()} />)
    await waitFor(() =>
      expect(
        screen.getByText("Текст согласия пока не опубликован. Обратись в поддержку."),
      ).toBeInTheDocument(),
    )
    expect(screen.getByRole("button", { name: "Я даю согласие" })).toBeDisabled()
  })

  it("calls onConsent when the consent button is clicked", async () => {
    const user = userEvent.setup()
    const onConsent = vi.fn()
    vi.mocked(fetchPublicSettings).mockResolvedValue(settings())
    render(<DataConsentModal open onConsent={onConsent} onCancel={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Я даю согласие" })).not.toBeDisabled(),
    )
    await user.click(screen.getByRole("button", { name: "Я даю согласие" }))
    expect(onConsent).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel from the Отмена button and the close icon", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    vi.mocked(fetchPublicSettings).mockResolvedValue(settings())
    render(<DataConsentModal open onConsent={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByText("Отмена"))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await user.click(screen.getByLabelText("Закрыть"))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it("locks body scroll while open and restores it once closed", async () => {
    vi.mocked(fetchPublicSettings).mockResolvedValue(settings())
    const { rerender } = render(<DataConsentModal open onConsent={vi.fn()} onCancel={vi.fn()} />)
    expect(document.body.style.overflow).toBe("hidden")
    rerender(<DataConsentModal open={false} onConsent={vi.fn()} onCancel={vi.fn()} />)
    expect(document.body.style.overflow).toBe("")
  })

  it("fetches fresh text again the next time it is reopened", async () => {
    vi.mocked(fetchPublicSettings).mockResolvedValue(settings())
    const { rerender } = render(<DataConsentModal open onConsent={vi.fn()} onCancel={vi.fn()} />)
    await waitFor(() => expect(fetchPublicSettings).toHaveBeenCalledTimes(1))

    rerender(<DataConsentModal open={false} onConsent={vi.fn()} onCancel={vi.fn()} />)
    rerender(<DataConsentModal open onConsent={vi.fn()} onCancel={vi.fn()} />)

    await waitFor(() => expect(fetchPublicSettings).toHaveBeenCalledTimes(2))
  })
})
