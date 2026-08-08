import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "@/i18n/navigation"
import {
  fetchUnreadNotificationCount,
  fetchNotifications,
  markNotificationsRead,
  type NotificationItem,
} from "@/lib/api"
import NotificationBell from "@/components/NotificationBell"

// process.env.NEXT_PUBLIC_API_URL is unset in the test environment, so
// buildWebSocketBase() always returns null and the component falls
// straight into the polling-fallback branch — no real WebSocket is
// ever constructed, keeping these tests free of WS mocking.
vi.mock("@/lib/api")

function makeNotification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 1,
    kind: "order.created",
    title: "Новый заказ",
    url: "",
    payload: {},
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe("NotificationBell", () => {
  const push = vi.fn()

  beforeEach(() => {
    vi.mocked(fetchUnreadNotificationCount).mockReset().mockResolvedValue(0)
    vi.mocked(fetchNotifications).mockReset().mockResolvedValue([])
    vi.mocked(markNotificationsRead).mockReset().mockResolvedValue(undefined)
    push.mockClear()
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
  })

  it("does not show a badge when there are no unread notifications", async () => {
    render(<NotificationBell />)
    await waitFor(() => expect(fetchUnreadNotificationCount).toHaveBeenCalled())
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
  })

  it("shows the unread count badge", async () => {
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValue(3)
    render(<NotificationBell />)
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument()
    })
  })

  it("caps the badge display at 99+", async () => {
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValue(150)
    render(<NotificationBell />)
    await waitFor(() => {
      expect(screen.getByText("99+")).toBeInTheDocument()
    })
  })

  it("opens the dropdown and fetches notifications on click", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([makeNotification({ title: "Заказ оплачен" })])
    const user = userEvent.setup()
    render(<NotificationBell />)

    await user.click(screen.getByLabelText("Уведомления"))

    await waitFor(() => {
      expect(screen.getByText("Заказ оплачен")).toBeInTheDocument()
    })
    expect(fetchNotifications).toHaveBeenCalledTimes(1)
  })

  it("shows the empty state when there are no notifications", async () => {
    const user = userEvent.setup()
    render(<NotificationBell />)
    await user.click(screen.getByLabelText("Уведомления"))
    await waitFor(() => {
      expect(screen.getByText("Нет уведомлений")).toBeInTheDocument()
    })
  })

  it("shows a retryable error instead of an empty state when loading fails", async () => {
    // Regression: fetchNotifications() failures were swallowed with an
    // empty catch, so the panel showed "no notifications" identically
    // to a genuinely empty inbox.
    vi.mocked(fetchNotifications).mockRejectedValueOnce(new Error("network"))
    const user = userEvent.setup()
    render(<NotificationBell />)
    await user.click(screen.getByLabelText("Уведомления"))

    await waitFor(() => {
      expect(screen.getByText("Не удалось загрузить уведомления")).toBeInTheDocument()
    })
    expect(screen.queryByText("Нет уведомлений")).not.toBeInTheDocument()

    vi.mocked(fetchNotifications).mockResolvedValueOnce([makeNotification({ title: "Заказ оплачен" })])
    await user.click(screen.getByRole("button", { name: "Повторить" }))

    await waitFor(() => {
      expect(screen.getByText("Заказ оплачен")).toBeInTheDocument()
    })
  })

  it("shows an inline error when marking all as read fails", async () => {
    // Regression: handleMarkAllRead had no try/catch at all — a
    // rejection just vanished with no feedback to the user.
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValue(1)
    vi.mocked(fetchNotifications).mockResolvedValue([makeNotification({ title: "First" })])
    vi.mocked(markNotificationsRead).mockRejectedValueOnce(new Error("network"))
    const user = userEvent.setup()
    render(<NotificationBell />)

    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument())
    await user.click(screen.getByLabelText("Уведомления"))
    await waitFor(() => screen.getByText("First"))

    await user.click(screen.getByRole("button", { name: "Прочитать все" }))

    await waitFor(() => {
      expect(screen.getByText("Не удалось отметить всё прочитанным")).toBeInTheDocument()
    })
    // Count is untouched since the request actually failed.
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("still navigates when markNotificationsRead fails on a notification click", async () => {
    // Regression: handleClick had no try/catch — a mark-as-read failure
    // meant setOpen(false)/router.push never ran, so clicking a
    // notification silently did nothing at all.
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValue(1)
    vi.mocked(fetchNotifications).mockResolvedValue([
      makeNotification({ id: 7, title: "Order update", url: "/orders/7", is_read: false }),
    ])
    vi.mocked(markNotificationsRead).mockRejectedValueOnce(new Error("network"))
    const user = userEvent.setup()
    render(<NotificationBell />)

    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument())
    await user.click(screen.getByLabelText("Уведомления"))
    await waitFor(() => screen.getByText("Order update"))

    await user.click(screen.getByText("Order update"))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/orders/7")
    })
    expect(screen.queryByText("Order update")).not.toBeInTheDocument()
  })

  it("toggles closed when clicking the bell again", async () => {
    const user = userEvent.setup()
    render(<NotificationBell />)
    await user.click(screen.getByLabelText("Уведомления"))
    await waitFor(() => screen.getByText("Нет уведомлений"))

    await user.click(screen.getByLabelText("Уведомления"))
    expect(screen.queryByText("Нет уведомлений")).not.toBeInTheDocument()
  })

  it("closes when clicking outside", async () => {
    const user = userEvent.setup()
    render(
      <div>
        <NotificationBell />
        <button>outside</button>
      </div>,
    )
    await user.click(screen.getByLabelText("Уведомления"))
    await waitFor(() => screen.getByText("Нет уведомлений"))

    fireEvent.mouseDown(screen.getByText("outside"))
    expect(screen.queryByText("Нет уведомлений")).not.toBeInTheDocument()
  })

  it("marks all as read and clears the badge", async () => {
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValue(2)
    vi.mocked(fetchNotifications).mockResolvedValue([
      makeNotification({ id: 1, title: "First", is_read: false }),
      makeNotification({ id: 2, title: "Second", is_read: false }),
    ])
    const user = userEvent.setup()
    render(<NotificationBell />)

    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument())
    await user.click(screen.getByLabelText("Уведомления"))
    await waitFor(() => screen.getByText("First"))

    await user.click(screen.getByRole("button", { name: "Прочитать все" }))

    expect(markNotificationsRead).toHaveBeenCalledWith()
    await waitFor(() => {
      expect(screen.queryByText("2")).not.toBeInTheDocument()
    })
  })

  it("clicking an unread notification marks it read, decrements the count, and navigates to its url", async () => {
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValue(1)
    vi.mocked(fetchNotifications).mockResolvedValue([
      makeNotification({ id: 7, title: "Order update", url: "/orders/7", is_read: false }),
    ])
    const user = userEvent.setup()
    render(<NotificationBell />)

    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument())
    await user.click(screen.getByLabelText("Уведомления"))
    await waitFor(() => screen.getByText("Order update"))

    await user.click(screen.getByText("Order update"))

    expect(markNotificationsRead).toHaveBeenCalledWith([7])
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/orders/7")
    })
    // Dropdown closes after navigating.
    expect(screen.queryByText("Order update")).not.toBeInTheDocument()
  })

  it("clicking an already-read notification does not call markNotificationsRead again", async () => {
    vi.mocked(fetchNotifications).mockResolvedValue([
      makeNotification({ id: 8, title: "Old news", url: "", is_read: true }),
    ])
    const user = userEvent.setup()
    render(<NotificationBell />)
    await user.click(screen.getByLabelText("Уведомления"))
    await waitFor(() => screen.getByText("Old news"))

    await user.click(screen.getByText("Old news"))

    expect(markNotificationsRead).not.toHaveBeenCalled()
  })
})
