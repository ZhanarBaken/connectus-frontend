import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { authFetch } from "@/lib/api"
import MentorDocumentsUploader, { type MentorDocument } from "@/components/MentorDocumentsUploader"

vi.mock("@/lib/api")

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response
}

function makeDoc(overrides: Partial<MentorDocument> = {}): MentorDocument {
  return {
    id: 1,
    kind: "diploma",
    original_filename: "diploma.pdf",
    content_type: "application/pdf",
    size_bytes: 2048,
    status: "pending",
    review_note: "",
    uploaded_at: "2026-01-01T00:00:00Z",
    download_url: "https://cdn.example.com/diploma.pdf",
    ...overrides,
  }
}

function makeFile(name: string, sizeBytes: number, type: string): File {
  const file = new File(["x"], name, { type })
  Object.defineProperty(file, "size", { value: sizeBytes })
  return file
}

// One compact card per document kind — find the diploma card's file input
// via its label, since there are now several file inputs on the page.
function getSlot(label: string): HTMLElement {
  return screen.getByText(label).closest("div.border-gray-200.rounded-xl.p-3") as HTMLElement
}

describe("MentorDocumentsUploader", () => {
  beforeEach(() => {
    vi.mocked(authFetch).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows a loading spinner before the initial fetch resolves", () => {
    vi.mocked(authFetch).mockReturnValue(new Promise(() => {}))
    const { container } = render(<MentorDocumentsUploader />)
    expect(container.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("shows a drop hint in every kind's slot when there are no documents", async () => {
    vi.mocked(authFetch).mockResolvedValue(jsonResponse([]))
    render(<MentorDocumentsUploader />)
    await waitFor(() => {
      expect(screen.getAllByText("Перетащите файл сюда или нажмите для выбора")).toHaveLength(4)
    })
  })

  it("shows an error banner when the initial load fails", async () => {
    vi.mocked(authFetch).mockResolvedValue(jsonResponse({}, false))
    render(<MentorDocumentsUploader />)
    await waitFor(() => {
      expect(screen.getByText("Не удалось загрузить документы")).toBeInTheDocument()
    })
  })

  it("handles a paginated {results: [...]} response shape", async () => {
    vi.mocked(authFetch).mockResolvedValue(jsonResponse({ results: [makeDoc()] }))
    render(<MentorDocumentsUploader />)
    await waitFor(() => {
      expect(screen.getByText("diploma.pdf")).toBeInTheDocument()
    })
  })

  it("renders existing documents with status badges", async () => {
    vi.mocked(authFetch).mockResolvedValue(
      jsonResponse([
        makeDoc({ id: 1, status: "pending", original_filename: "a.pdf" }),
        makeDoc({ id: 2, status: "approved", original_filename: "b.pdf" }),
        makeDoc({ id: 3, status: "rejected", original_filename: "c.pdf", review_note: "Blurry scan" }),
      ]),
    )
    render(<MentorDocumentsUploader />)

    await waitFor(() => expect(screen.getByText("a.pdf")).toBeInTheDocument())
    expect(screen.getByText("На проверке")).toBeInTheDocument()
    expect(screen.getByText("Одобрен")).toBeInTheDocument()
    expect(screen.getByText("Отклонён")).toBeInTheDocument()
    expect(screen.getByText(/Blurry scan/)).toBeInTheDocument()
  })

  it("calls onDocumentsChange with the initial document list after load", async () => {
    vi.mocked(authFetch).mockResolvedValue(jsonResponse([makeDoc(), makeDoc({ id: 2 })]))
    const onDocumentsChange = vi.fn()
    render(<MentorDocumentsUploader onDocumentsChange={onDocumentsChange} />)
    await waitFor(() => {
      expect(onDocumentsChange).toHaveBeenCalledWith([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 }),
      ])
    })
  })

  it("rejects a file over the 15MB limit before ever calling the API", async () => {
    vi.mocked(authFetch).mockResolvedValue(jsonResponse([]))
    const user = userEvent.setup()
    render(<MentorDocumentsUploader />)
    await waitFor(() => screen.getAllByText("Перетащите файл сюда или нажмите для выбора"))

    const slot = getSlot("Диплом")
    const input = slot.querySelector('input[type="file"]') as HTMLInputElement
    const bigFile = makeFile("huge.pdf", 16 * 1024 * 1024, "application/pdf")
    await user.upload(input, bigFile)

    expect(within(slot).getByText("Файл слишком большой. Максимум 15 MB.")).toBeInTheDocument()
    // Only the initial GET should have happened — no POST attempted.
    expect(vi.mocked(authFetch)).toHaveBeenCalledTimes(1)
  })

  it("rejects a disallowed file type chosen via the file picker (not just drag-and-drop)", async () => {
    vi.mocked(authFetch).mockResolvedValue(jsonResponse([]))
    render(<MentorDocumentsUploader />)
    await waitFor(() => screen.getAllByText("Перетащите файл сюда или нажмите для выбора"))

    const slot = getSlot("Диплом")
    const input = slot.querySelector('input[type="file"]') as HTMLInputElement
    // A real OS picker can still return a mismatched type (e.g. the user
    // chooses "All Files") — simulate that directly, since user.upload()
    // pre-filters by `accept` and would never let a bad file reach the
    // change handler at all.
    const badFile = makeFile(
      "resume.docx",
      1024,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    fireEvent.change(input, { target: { files: [badFile] } })

    expect(
      await within(slot).findByText("Недопустимый формат файла. Разрешены только PDF, JPEG и PNG."),
    ).toBeInTheDocument()
    // Only the initial GET — no POST attempted for a disallowed type.
    expect(vi.mocked(authFetch)).toHaveBeenCalledTimes(1)
  })

  it("ignores a second upload attempt for the same kind while one is already in flight", async () => {
    let resolvePost!: (value: Response) => void
    const postPromise = new Promise<Response>((resolve) => { resolvePost = resolve })
    vi.mocked(authFetch)
      .mockResolvedValueOnce(jsonResponse([])) // initial load
      .mockReturnValueOnce(postPromise) // first POST — held pending

    const user = userEvent.setup()
    render(<MentorDocumentsUploader />)
    await waitFor(() => screen.getAllByText("Перетащите файл сюда или нажмите для выбора"))

    const slot = getSlot("Диплом")
    const input = slot.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, makeFile("first.pdf", 1024, "application/pdf"))
    // First upload is now in flight (its POST promise is still unresolved).
    await user.upload(input, makeFile("second.pdf", 1024, "application/pdf"))

    // Still only the initial GET plus the one in-flight POST — the second
    // selection must be a no-op, not a second POST.
    expect(vi.mocked(authFetch)).toHaveBeenCalledTimes(2)

    resolvePost(jsonResponse(makeDoc({ id: 9, original_filename: "first.pdf" })))
    await waitFor(() => {
      expect(screen.getByText("first.pdf")).toBeInTheDocument()
    })
  })

  it("uploads a valid file and prepends it to the list", async () => {
    vi.mocked(authFetch)
      .mockResolvedValueOnce(jsonResponse([])) // initial load
      .mockResolvedValueOnce(jsonResponse(makeDoc({ id: 9, original_filename: "new.pdf" }))) // upload POST

    const user = userEvent.setup()
    const onDocumentsChange = vi.fn()
    render(<MentorDocumentsUploader onDocumentsChange={onDocumentsChange} />)
    await waitFor(() => screen.getAllByText("Перетащите файл сюда или нажмите для выбора"))

    const slot = getSlot("Диплом")
    const input = slot.querySelector('input[type="file"]') as HTMLInputElement
    const file = makeFile("new.pdf", 1024, "application/pdf")
    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText("new.pdf")).toBeInTheDocument()
    })
    expect(onDocumentsChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 9, original_filename: "new.pdf" }),
    ])

    const [, uploadCall] = vi.mocked(authFetch).mock.calls
    expect(uploadCall[1]?.method).toBe("POST")
    expect(uploadCall[1]?.body).toBeInstanceOf(FormData)
  })

  it("shows the server's field error when the upload POST fails", async () => {
    vi.mocked(authFetch)
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ file: ["Недопустимый формат файла"] }, false))

    const user = userEvent.setup()
    render(<MentorDocumentsUploader />)
    await waitFor(() => screen.getAllByText("Перетащите файл сюда или нажмите для выбора"))

    const slot = getSlot("Диплом")
    const input = slot.querySelector('input[type="file"]') as HTMLInputElement
    const file = makeFile("bad.pdf", 1024, "application/pdf")
    await user.upload(input, file)

    await waitFor(() => {
      expect(within(slot).getByText("Недопустимый формат файла")).toBeInTheDocument()
    })
  })

  it("marks diploma and enrollment_certificate as required, but not university_id or other", async () => {
    vi.mocked(authFetch).mockResolvedValue(jsonResponse([]))
    render(<MentorDocumentsUploader />)
    await waitFor(() => screen.getAllByText("Перетащите файл сюда или нажмите для выбора"))

    expect(within(getSlot("Диплом")).getByText("*")).toBeInTheDocument()
    expect(within(getSlot("Справка о зачислении")).getByText("*")).toBeInTheDocument()
    expect(within(getSlot("Студенческий билет")).queryByText("*")).not.toBeInTheDocument()
    expect(within(getSlot("Другое")).queryByText("*")).not.toBeInTheDocument()
  })

  it("hides the upload form when isBanned is true", async () => {
    vi.mocked(authFetch).mockResolvedValue(jsonResponse([makeDoc()]))
    render(<MentorDocumentsUploader isBanned />)
    await waitFor(() => screen.getByText("diploma.pdf"))
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(0)
    expect(screen.queryByLabelText("Удалить")).not.toBeInTheDocument()
  })

  it("deletes a document after confirming, and updates the count", async () => {
    vi.mocked(authFetch)
      .mockResolvedValueOnce(jsonResponse([makeDoc({ id: 1, original_filename: "a.pdf" })]))
      .mockResolvedValueOnce(jsonResponse({}))

    vi.spyOn(window, "confirm").mockReturnValue(true)
    const onDocumentsChange = vi.fn()
    const user = userEvent.setup()
    render(<MentorDocumentsUploader onDocumentsChange={onDocumentsChange} />)
    await waitFor(() => screen.getByText("a.pdf"))

    await user.click(screen.getByLabelText("Удалить"))

    await waitFor(() => {
      expect(screen.queryByText("a.pdf")).not.toBeInTheDocument()
    })
    expect(onDocumentsChange).toHaveBeenLastCalledWith([])
  })

  it("does not delete when the confirm dialog is dismissed", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(
      jsonResponse([makeDoc({ id: 1, original_filename: "a.pdf" })]),
    )
    vi.spyOn(window, "confirm").mockReturnValue(false)
    const user = userEvent.setup()
    render(<MentorDocumentsUploader />)
    await waitFor(() => screen.getByText("a.pdf"))

    await user.click(screen.getByLabelText("Удалить"))

    expect(screen.getByText("a.pdf")).toBeInTheDocument()
    // Only the initial GET — no DELETE call issued.
    expect(vi.mocked(authFetch)).toHaveBeenCalledTimes(1)
  })

  it("does not render a delete button for an approved document", async () => {
    vi.mocked(authFetch).mockResolvedValue(
      jsonResponse([makeDoc({ id: 1, status: "approved", original_filename: "a.pdf" })]),
    )
    render(<MentorDocumentsUploader />)
    await waitFor(() => screen.getByText("a.pdf"))
    const card = screen.getByText("a.pdf").closest("div.bg-gray-50") as HTMLElement
    expect(within(card).queryByLabelText("Удалить")).not.toBeInTheDocument()
  })
})
