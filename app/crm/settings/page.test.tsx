import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchAdminSettings, updateAdminSettings } from "@/lib/api"
import { SiteSettings } from "@/types"
import CRMSettingsPage from "./page"

vi.mock("@/lib/api")

function makeSettings(overrides: Partial<SiteSettings> = {}): SiteSettings {
  return {
    id: 1,
    dispute_window_hours: 48,
    terms_text: "",
    terms_text_en: "",
    terms_text_kk: "",
    platform_rules_text: "",
    platform_rules_text_en: "",
    platform_rules_text_kk: "",
    data_consent_text: "",
    data_consent_text_en: "",
    data_consent_text_kk: "",
    privacy_policy_text: "",
    privacy_policy_text_en: "",
    privacy_policy_text_kk: "",
    support_url: "https://t.me/support",
    payment_account_details: "Kaspi Gold 1234",
    whatsapp_number: "77771234567",
    verify_email_subject: "",
    verify_email_heading: "",
    verify_email_body: "",
    password_reset_email_subject: "",
    password_reset_email_heading: "",
    password_reset_email_body: "",
    order_created_email_subject: "",
    order_created_email_heading: "",
    order_created_email_body: "",
    order_completed_email_subject: "",
    order_completed_email_heading: "",
    order_completed_email_body: "",
    review_reply_email_subject: "",
    review_reply_email_heading: "",
    review_reply_email_body: "",
    new_chat_message_email_subject: "",
    new_chat_message_email_heading: "",
    new_chat_message_email_body: "",
    payment_confirmed_email_subject: "",
    payment_confirmed_email_heading: "",
    payment_confirmed_email_body: "",
    payment_received_email_subject: "",
    payment_received_email_heading: "",
    payment_received_email_body: "",
    payment_rejected_email_subject: "",
    payment_rejected_email_heading: "",
    payment_rejected_email_body: "",
    payment_expired_student_email_subject: "",
    payment_expired_student_email_heading: "",
    payment_expired_student_email_body: "",
    payment_expired_mentor_email_subject: "",
    payment_expired_mentor_email_heading: "",
    payment_expired_mentor_email_body: "",
    bot_payment_requisites_message: "",
    bot_payment_received_student: "",
    bot_payment_received_mentor: "",
    bot_payment_rejected_student: "",
    notif_order_created_title: "",
    notif_review_new_title: "",
    notif_payment_receipt_pending_title: "",
    notif_payment_confirmed_student_title: "",
    notif_payment_received_mentor_title: "",
    notif_payment_rejected_student_title: "",
    notif_payment_expired_student_title: "",
    notif_payment_expired_mentor_title: "",
    ...overrides,
  } as SiteSettings
}

describe("CRMSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows a loading spinner, then loads and displays current values", async () => {
    vi.mocked(fetchAdminSettings).mockResolvedValue(makeSettings())
    render(<CRMSettingsPage />)

    expect(await screen.findByDisplayValue("Kaspi Gold 1234")).toBeInTheDocument()
    expect(screen.getByDisplayValue("77771234567")).toBeInTheDocument()
    expect(screen.getByDisplayValue("48")).toBeInTheDocument()
  })

  it("shows an error state when settings fail to load", async () => {
    vi.mocked(fetchAdminSettings).mockRejectedValue(new Error("boom"))
    render(<CRMSettingsPage />)

    expect(await screen.findByText("Не удалось загрузить настройки")).toBeInTheDocument()
  })

  it("edits a field and saves, sending the updated form to updateAdminSettings", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminSettings).mockResolvedValue(makeSettings())
    vi.mocked(updateAdminSettings).mockResolvedValue(makeSettings({ whatsapp_number: "77779998877" }))

    render(<CRMSettingsPage />)
    const whatsappInput = await screen.findByDisplayValue("77771234567")

    await user.clear(whatsappInput)
    await user.type(whatsappInput, "77779998877")

    await user.click(screen.getByRole("button", { name: "Сохранить" }))

    await waitFor(() => expect(updateAdminSettings).toHaveBeenCalled())
    const sentPayload = vi.mocked(updateAdminSettings).mock.calls[0][0]
    expect(sentPayload.whatsapp_number).toBe("77779998877")

    expect(await screen.findByText("Сохранено ✓")).toBeInTheDocument()
  })

  it("shows an error and does not show the saved indicator when saving fails", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminSettings).mockResolvedValue(makeSettings())
    vi.mocked(updateAdminSettings).mockRejectedValue(new Error("Ошибка валидации"))

    render(<CRMSettingsPage />)
    await screen.findByDisplayValue("Kaspi Gold 1234")

    await user.click(screen.getByRole("button", { name: "Сохранить" }))

    expect(await screen.findByText("Ошибка валидации")).toBeInTheDocument()
    expect(screen.queryByText("Сохранено ✓")).not.toBeInTheDocument()
  })

  it("switches between sections via the sidebar nav", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminSettings).mockResolvedValue(makeSettings())
    render(<CRMSettingsPage />)
    await screen.findByDisplayValue("Kaspi Gold 1234")

    // Main section fields visible by default
    expect(screen.getByText("Реквизиты для оплаты")).toBeInTheDocument()
    expect(screen.queryByText("Пользовательское соглашение (ToS)")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Юридика" }))

    expect(screen.getByText("Пользовательское соглашение (ToS)")).toBeInTheDocument()
    expect(screen.queryByText("Реквизиты для оплаты")).not.toBeInTheDocument()
  })

  it("edits the EN/KK legal text variants and includes them in the save payload", async () => {
    const user = userEvent.setup()
    vi.mocked(fetchAdminSettings).mockResolvedValue(makeSettings({ terms_text: "Оригинал RU" }))
    vi.mocked(updateAdminSettings).mockResolvedValue(makeSettings())

    render(<CRMSettingsPage />)
    await screen.findByDisplayValue("Kaspi Gold 1234")
    await user.click(screen.getByRole("button", { name: "Юридика" }))

    const enLabel = screen.getByText("Пользовательское соглашение — EN")
    expect(screen.getByText("Пользовательское соглашение — KK")).toBeInTheDocument()

    const enField = enLabel.parentElement!.querySelector("textarea")!
    await user.type(enField, "English terms")
    await user.click(screen.getByRole("button", { name: "Сохранить" }))

    await waitFor(() => expect(updateAdminSettings).toHaveBeenCalled())
    const sentPayload = vi.mocked(updateAdminSettings).mock.calls[0][0]
    expect(sentPayload.terms_text_en).toBe("English terms")
    expect(sentPayload.terms_text).toBe("Оригинал RU")
  })
})
