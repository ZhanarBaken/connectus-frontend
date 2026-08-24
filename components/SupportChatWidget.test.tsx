import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useTelegramWebApp } from "@/lib/useTelegramWebApp"
import {
  clearStoredSupportChatSessionId,
  connectSupportChat,
  fetchMySupportChatSession,
  fetchSupportChatHistory,
  getStoredSupportChatSessionId,
  sendSupportChatMessage,
  SupportChatMessage,
} from "@/lib/supportChat"
import SupportChatWidget from "./SupportChatWidget"

vi.mock("@/lib/useTelegramWebApp")
vi.mock("@/lib/supportChat")

type Handlers = { onMessage: (msg: SupportChatMessage) => void; onOpen?: () => void }

function makeMessage(overrides: Partial<SupportChatMessage> = {}): SupportChatMessage {
  return { id: 1, sender: "staff", text: "Ответ", created_at: "2026-01-01T00:00:00Z", ...overrides }
}

async function fillNameAndStart(user: ReturnType<typeof userEvent.setup>, name = "Айгерим") {
  await user.type(screen.getByPlaceholderText("Твоё имя"), name)
  await user.click(screen.getByRole("button", { name: "Начать чат" }))
}

describe("SupportChatWidget", () => {
  let capturedHandlers: Handlers | null

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    capturedHandlers = null
    vi.mocked(useTelegramWebApp).mockReturnValue({ isInTelegram: false, webApp: null, initData: "" })
    vi.mocked(getStoredSupportChatSessionId).mockReturnValue(null)
    vi.mocked(fetchSupportChatHistory).mockResolvedValue([])
    vi.mocked(fetchMySupportChatSession).mockResolvedValue(null)
    vi.mocked(connectSupportChat).mockImplementation((_sessionId, handlers) => {
      capturedHandlers = handlers
      return { close: vi.fn() }
    })
  })

  it("renders nothing inside the Telegram Mini App", () => {
    vi.mocked(useTelegramWebApp).mockReturnValue({ isInTelegram: true, webApp: null, initData: "" })
    const { container } = render(<SupportChatWidget />)
    expect(container).toBeEmptyDOMElement()
  })

  it("does not fetch history or connect inside the Telegram Mini App, even with a stored session", async () => {
    // Regression test: the mount effect must gate on isInTelegram
    // itself, not rely on the component returning null from render —
    // hook bodies still run regardless of what gets rendered.
    vi.mocked(useTelegramWebApp).mockReturnValue({ isInTelegram: true, webApp: null, initData: "" })
    vi.mocked(getStoredSupportChatSessionId).mockReturnValue("existing-session")

    render(<SupportChatWidget />)
    await new Promise((r) => setTimeout(r, 0))

    expect(fetchSupportChatHistory).not.toHaveBeenCalled()
    expect(connectSupportChat).not.toHaveBeenCalled()
  })

  it("starts closed, with no visible panel", () => {
    render(<SupportChatWidget />)
    expect(screen.queryByPlaceholderText("Напиши сообщение...")).not.toBeInTheDocument()
  })

  it("opens the panel on a name gate for a brand new anonymous visitor", async () => {
    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))
    expect(screen.getByText("Как тебя зовут?")).toBeInTheDocument()
    expect(screen.queryByPlaceholderText("Напиши сообщение...")).not.toBeInTheDocument()
  })

  it("the 'start chat' button stays disabled until a name is typed", async () => {
    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))
    expect(screen.getByRole("button", { name: "Начать чат" })).toBeDisabled()

    await user.type(screen.getByPlaceholderText("Твоё имя"), "Айгерим")
    expect(screen.getByRole("button", { name: "Начать чат" })).toBeEnabled()
  })

  it("shows the empty state after the name gate is completed", async () => {
    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))
    await fillNameAndStart(user)
    expect(screen.getByText(/Напиши нам/)).toBeInTheDocument()
  })

  it("does not fetch history or connect when no session_id is stored", () => {
    render(<SupportChatWidget />)
    expect(fetchSupportChatHistory).not.toHaveBeenCalled()
    expect(connectSupportChat).not.toHaveBeenCalled()
  })

  it("resumes an existing session: fetches history and connects the socket", async () => {
    vi.mocked(getStoredSupportChatSessionId).mockReturnValue("existing-session")
    vi.mocked(fetchSupportChatHistory).mockResolvedValue([makeMessage({ id: 1, text: "Привет" })])

    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await waitFor(() => expect(connectSupportChat).toHaveBeenCalledWith("existing-session", expect.anything()))

    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))
    expect(screen.getByText("Привет")).toBeInTheDocument()
  })

  it("sends a message with the given name, appends it, and clears the draft", async () => {
    vi.mocked(sendSupportChatMessage).mockResolvedValue({
      session_id: "new-session",
      message: makeMessage({ id: 5, sender: "visitor", text: "Вопрос" }),
    })

    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))
    await fillNameAndStart(user)

    const input = screen.getByPlaceholderText("Напиши сообщение...")
    await user.type(input, "Вопрос")
    await user.click(screen.getByRole("button", { name: "Отправить" }))

    await waitFor(() => expect(screen.getByText("Вопрос")).toBeInTheDocument())
    expect(sendSupportChatMessage).toHaveBeenCalledWith("Вопрос", null, "Айгерим")
    expect(input).toHaveValue("")
  })

  it("connects the socket after the first message mints a session_id", async () => {
    vi.mocked(sendSupportChatMessage).mockResolvedValue({
      session_id: "brand-new",
      message: makeMessage({ sender: "visitor", text: "Привет" }),
    })

    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))
    await fillNameAndStart(user)
    await user.type(screen.getByPlaceholderText("Напиши сообщение..."), "Привет")
    await user.click(screen.getByRole("button", { name: "Отправить" }))

    await waitFor(() => expect(connectSupportChat).toHaveBeenCalledWith("brand-new", expect.anything()))
  })

  it("shows an error message when sending fails", async () => {
    vi.mocked(sendSupportChatMessage).mockRejectedValue(new Error("network error"))

    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))
    await fillNameAndStart(user)
    await user.type(screen.getByPlaceholderText("Напиши сообщение..."), "Вопрос")
    await user.click(screen.getByRole("button", { name: "Отправить" }))

    expect(await screen.findByText(/Не удалось отправить/)).toBeInTheDocument()
  })

  it("shows an unread dot when a message arrives while the panel is closed", async () => {
    vi.mocked(getStoredSupportChatSessionId).mockReturnValue("existing-session")

    render(<SupportChatWidget />)
    await waitFor(() => expect(connectSupportChat).toHaveBeenCalled())

    act(() => {
      capturedHandlers!.onMessage(makeMessage({ text: "Новый ответ" }))
    })

    const bubble = screen.getByRole("button", { name: "Открыть чат поддержки" })
    expect(bubble.querySelector(".bg-red-500")).not.toBeNull()
  })

  it("does not show an unread dot for a message that arrives while the panel is open", async () => {
    vi.mocked(getStoredSupportChatSessionId).mockReturnValue("existing-session")

    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await waitFor(() => expect(connectSupportChat).toHaveBeenCalled())
    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))

    act(() => {
      capturedHandlers!.onMessage(makeMessage({ text: "Новый ответ" }))
    })
    expect(await screen.findByText("Новый ответ")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Закрыть чат поддержки" }))
    const bubble = screen.getByRole("button", { name: "Открыть чат поддержки" })
    expect(bubble.querySelector(".bg-red-500")).toBeNull()
  })

  it("has no 'start new chat' control until a session exists", async () => {
    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))
    expect(screen.queryByText("Не ты? Новый чат")).not.toBeInTheDocument()
  })

  it("'start new chat' clears the session, closes the socket, and resets messages", async () => {
    vi.mocked(getStoredSupportChatSessionId).mockReturnValue("existing-session")
    vi.mocked(fetchSupportChatHistory).mockResolvedValue([makeMessage({ id: 1, text: "Привет" })])
    const close = vi.fn()
    vi.mocked(connectSupportChat).mockImplementation((_sessionId, handlers) => {
      capturedHandlers = handlers
      return { close }
    })

    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await waitFor(() => expect(connectSupportChat).toHaveBeenCalled())
    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))
    expect(screen.getByText("Привет")).toBeInTheDocument()

    await user.click(screen.getByText("Не ты? Новый чат"))

    expect(close).toHaveBeenCalledTimes(1)
    expect(clearStoredSupportChatSessionId).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("Привет")).not.toBeInTheDocument()
    // Back to the name gate — a fresh session needs a fresh name too.
    expect(screen.getByText("Как тебя зовут?")).toBeInTheDocument()
    expect(screen.queryByText("Не ты? Новый чат")).not.toBeInTheDocument()
  })

  it("when logged in, resumes via fetchMySupportChatSession instead of the localStorage flow", async () => {
    localStorage.setItem("access_token", "tok")
    vi.mocked(fetchMySupportChatSession).mockResolvedValue({
      session_id: "account-session",
      messages: [makeMessage({ id: 1, text: "Моё сообщение" })],
    })

    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await waitFor(() => expect(connectSupportChat).toHaveBeenCalledWith("account-session", expect.anything()))
    expect(getStoredSupportChatSessionId).not.toHaveBeenCalled()
    expect(fetchSupportChatHistory).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))
    expect(screen.getByText("Моё сообщение")).toBeInTheDocument()
  })

  it("when logged in with no session yet, waits for the first send instead of erroring", async () => {
    localStorage.setItem("access_token", "tok")
    vi.mocked(fetchMySupportChatSession).mockResolvedValue(null)

    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await waitFor(() => expect(fetchMySupportChatSession).toHaveBeenCalled())
    expect(connectSupportChat).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))
    expect(screen.getByText(/Напиши нам/)).toBeInTheDocument()
  })

  it("hides the 'start new chat' control for a logged-in visitor, even with an active session", async () => {
    localStorage.setItem("access_token", "tok")
    vi.mocked(fetchMySupportChatSession).mockResolvedValue({
      session_id: "account-session",
      messages: [makeMessage({ id: 1, text: "Привет" })],
    })

    const user = userEvent.setup()
    render(<SupportChatWidget />)
    await waitFor(() => expect(connectSupportChat).toHaveBeenCalled())
    await user.click(screen.getByRole("button", { name: "Открыть чат поддержки" }))

    expect(screen.getByText("Привет")).toBeInTheDocument()
    expect(screen.queryByText("Не ты? Новый чат")).not.toBeInTheDocument()
  })
})
