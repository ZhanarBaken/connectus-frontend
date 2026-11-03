import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import AccountPreferences from "./AccountPreferences"
import LocaleSwitcher from "./LocaleSwitcher"
import { updateUserLocale } from "@/lib/api"

vi.mock("@/lib/api", () => ({ updateUserLocale: vi.fn().mockResolvedValue(undefined) }))
import type { User } from "@/types"

const me = { id: 1, country: "KZ", country_declared_at: null, time_zone: "", locale: "ru" } as User

describe("AccountPreferences", () => {
  it("does not confirm a legacy country when saving a timezone", async () => {
    const update = vi.fn().mockResolvedValue(me)
    const user = userEvent.setup()
    render(<AccountPreferences me={me} onUpdate={update} />)
    expect(update).not.toHaveBeenCalled()
    expect(screen.getByText(/Выберите страну/)).toBeInTheDocument()
    await user.type(screen.getByLabelText("Часовой пояс"), "Asia/Almaty")
    await user.click(screen.getByRole("button", { name: "Сохранить часовой пояс" }))
    expect(update).toHaveBeenCalledWith({ time_zone: "Asia/Almaty" })
    expect(await screen.findByRole("status")).toHaveTextContent("Предпочтения сохранены")
  })

  it("saves country only after selection and shows failures for retry", async () => {
    const update = vi.fn().mockRejectedValue(new Error("failed"))
    const user = userEvent.setup()
    render(<AccountPreferences me={me} onUpdate={update} />)
    await user.click(screen.getByRole("button", { name: /Казахстан/ }))
    expect(update).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Сохранить страну" }))
    expect(update).toHaveBeenCalledWith({ country: "KZ" })
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось сохранить предпочтения")
    expect(screen.getByRole("button", { name: "Сохранить страну" })).toBeEnabled()
  })

  it("supports old fixtures without preferences and rejects invalid timezones", async () => {
    const update = vi.fn()
    const user = userEvent.setup()
    render(<AccountPreferences me={{ id: 1 } as User} onUpdate={update} />)
    await user.type(screen.getByLabelText("Часовой пояс"), "invalid/zone")
    await user.click(screen.getByRole("button", { name: "Сохранить часовой пояс" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Укажите действительный часовой пояс IANA")
    expect(update).not.toHaveBeenCalled()
  })
  it("keeps edits while saving, prevents duplicate submits, and confirms the returned country", async () => {
    let finish!: (user: User) => void
    const update = vi.fn(() => new Promise<User>((resolve) => { finish = resolve }))
    const user = userEvent.setup()
    render(<AccountPreferences me={me} onUpdate={update} />)
    await user.click(screen.getByRole("button", { name: /Казахстан/ }))
    await user.click(screen.getByRole("button", { name: "Сохранить страну" }))
    expect(update).toHaveBeenCalledWith({ country: "KZ" })
    expect(screen.getByRole("button", { name: "Сохранить страну" })).toBeDisabled()
    expect(screen.getByLabelText("Часовой пояс")).toBeDisabled()
    finish({ ...me, locale: "kk", country_declared_at: "2026-11-03T00:00:00Z" })
    expect(await screen.findByRole("status")).toHaveTextContent("Предпочтения сохранены")
    expect(screen.queryByText(/Выберите страну/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Сохранить страну" })).toBeDisabled()
  })

  it("switching country preserves account locale and timezone", async () => {
    const account = { ...me, country_declared_at: "2026-01-01T00:00:00Z", locale: "en" as const, time_zone: "Europe/London" }
    const update = vi.fn().mockResolvedValue({ ...account, country: "UZ" })
    const user = userEvent.setup()
    render(<AccountPreferences me={account} onUpdate={update} />)
    await user.click(screen.getByRole("button", { name: /Узбекистан/ }))
    await user.click(screen.getByRole("button", { name: "Сохранить страну" }))
    expect(update).toHaveBeenCalledWith({ country: "UZ" })
    expect(await screen.findByRole("status")).toBeInTheDocument()
    expect(screen.getByLabelText("Часовой пояс")).toHaveValue("Europe/London")
    expect(screen.queryByLabelText("Язык аккаунта")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Сохранить часовой пояс" })).toBeDisabled()
  })

  it("keeps language switching independent of country and timezone edits", async () => {
    localStorage.setItem("access_token", "token")
    const update = vi.fn().mockResolvedValue({ ...me, time_zone: "Europe/London" })
    const user = userEvent.setup()
    render(<><LocaleSwitcher /><AccountPreferences me={me} onUpdate={update} /></>)
    await user.click(screen.getByRole("button", { name: /Узбекистан/ }))
    await user.type(screen.getByLabelText("Часовой пояс"), "Europe/London")
    await user.click(screen.getByRole("button", { name: "EN" }))
    expect(updateUserLocale).toHaveBeenCalledWith("en")
    expect(update).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Часовой пояс")).toHaveValue("Europe/London")
    await user.click(screen.getByRole("button", { name: "Сохранить часовой пояс" }))
    expect(update).toHaveBeenCalledWith({ time_zone: "Europe/London" })
    expect(await screen.findByRole("status")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Сохранить страну" })).toBeEnabled()
    localStorage.clear()
  })

})
