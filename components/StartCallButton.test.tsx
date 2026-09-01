import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useCall } from "@/components/CallProvider"
import StartCallButton from "@/components/StartCallButton"

// vitest.setup.tsx globally mocks @/components/CallProvider (its real
// implementation opens a WebSocket, which most page tests never need)
// — override useCall's return per test instead of that shared stub.
vi.mock("@/components/CallProvider")

describe("StartCallButton", () => {
  const startCall = vi.fn()

  beforeEach(() => {
    startCall.mockReset().mockResolvedValue(undefined)
    vi.mocked(useCall).mockReturnValue({ startCall })
  })

  it("calls startCall with the conversation id and other party's name when clicked", async () => {
    const user = userEvent.setup()
    render(
      <StartCallButton conversationId={42} otherPartyName="Ирина" otherPartyOnline />,
    )
    await user.click(screen.getByText("Позвонить"))
    expect(startCall).toHaveBeenCalledWith(42, "Ирина")
  })

  it("is disabled when the other party is offline", () => {
    render(
      <StartCallButton conversationId={42} otherPartyName="Ирина" otherPartyOnline={false} />,
    )
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("shows an inline error when starting the call fails", async () => {
    startCall.mockRejectedValueOnce(new Error("network"))
    const user = userEvent.setup()
    render(
      <StartCallButton conversationId={42} otherPartyName="Ирина" otherPartyOnline />,
    )
    await user.click(screen.getByText("Позвонить"))
    await waitFor(() => {
      expect(screen.getByText("Не удалось подключиться к звонку")).toBeInTheDocument()
    })
  })

  it("does not call startCall a second time while the first call is still starting", async () => {
    let resolveStart: () => void = () => {}
    startCall.mockReturnValue(new Promise<void>((resolve) => { resolveStart = resolve }))
    const user = userEvent.setup()
    render(
      <StartCallButton conversationId={42} otherPartyName="Ирина" otherPartyOnline />,
    )
    await user.click(screen.getByRole("button"))
    expect(screen.getByRole("button")).toBeDisabled()
    resolveStart()
    await waitFor(() => expect(startCall).toHaveBeenCalledTimes(1))
  })
})
