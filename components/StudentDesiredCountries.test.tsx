import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it, vi } from "vitest"
import StudentDesiredCountries from "./StudentDesiredCountries"

it("reuses the picker to add distinct codes and removes selected countries", async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<StudentDesiredCountries value={["US"]} onChange={onChange} />)
  await user.click(screen.getByRole("button", { name: /Другая страна/ }))
  await user.type(screen.getByRole("searchbox"), "CA")
  await user.click(screen.getByRole("button", { name: /Канада/ }))
  expect(onChange).toHaveBeenCalledWith(["US", "CA"])
  await user.click(screen.getByRole("button", { name: /США/ }))
  expect(onChange).toHaveBeenLastCalledWith([])
})
