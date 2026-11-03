import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import ScheduleTimezoneNotice from "./ScheduleTimezoneNotice"

describe("schedule timezone preference notice", () => {
  it("names the browser fallback and offers recovery", () => {
    const retry = vi.fn()
    render(<ScheduleTimezoneNotice error timeZone="Asia/Almaty" retry={retry} />)
    expect(screen.getByRole("status")).toHaveTextContent("Не удалось загрузить сохранённый часовой пояс")
    expect(screen.getByRole("status")).toHaveTextContent("Asia/Almaty")
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }))
    expect(retry).toHaveBeenCalledOnce()
  })
  it("does not show an error for a normal browser fallback", () => {
    render(<ScheduleTimezoneNotice error={false} timeZone="Asia/Almaty" retry={vi.fn()} />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
