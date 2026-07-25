import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AvatarCropperModal from "./AvatarCropperModal"

function makeFile() {
  return new File(["fake-image-bytes"], "avatar.png", { type: "image/png" })
}

describe("AvatarCropperModal", () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>
  let getContextSpy: ReturnType<typeof vi.fn>
  let toBlobSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => "blob:mock-url")
    revokeObjectURLSpy = vi.fn()
    // jsdom does not implement object URLs or canvas rendering — the
    // component only needs these to exist and behave plausibly.
    URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL

    getContextSpy = vi.fn(() => ({
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    }))
    HTMLCanvasElement.prototype.getContext = getContextSpy as unknown as typeof HTMLCanvasElement.prototype.getContext

    toBlobSpy = vi.fn((cb: BlobCallback) => cb(new Blob(["mock"], { type: "image/jpeg" })))
    HTMLCanvasElement.prototype.toBlob = toBlobSpy as unknown as typeof HTMLCanvasElement.prototype.toBlob
  })

  afterEach(() => {
    document.body.style.overflow = ""
  })

  it("renders nothing when there is no file", () => {
    const { container } = render(
      <AvatarCropperModal file={null} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders the cropper UI when a file is given", () => {
    render(<AvatarCropperModal file={makeFile()} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText("Подгони аватарку")).toBeInTheDocument()
    expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(File))
  })

  it("locks body scroll while open", () => {
    render(<AvatarCropperModal file={makeFile()} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(document.body.style.overflow).toBe("hidden")
  })

  it("calls onClose when the close icon is clicked", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AvatarCropperModal file={makeFile()} onSave={vi.fn()} onClose={onClose} />)
    await user.click(screen.getByLabelText("Закрыть"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when Отмена is clicked", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AvatarCropperModal file={makeFile()} onSave={vi.fn()} onClose={onClose} />)
    await user.click(screen.getByText("Отмена"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("disables Save until the image has loaded", () => {
    render(<AvatarCropperModal file={makeFile()} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText("Сохранить")).toBeDisabled()
  })

  it("enables Save once the image reports its natural size", () => {
    render(<AvatarCropperModal file={makeFile()} onSave={vi.fn()} onClose={vi.fn()} />)
    const img = document.querySelector("img") as HTMLImageElement
    Object.defineProperty(img, "naturalWidth", { value: 800, configurable: true })
    Object.defineProperty(img, "naturalHeight", { value: 600, configurable: true })
    fireEvent.load(img)
    expect(screen.getByText("Сохранить")).not.toBeDisabled()
  })

  it("crops and saves the image on Save", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<AvatarCropperModal file={makeFile()} onSave={onSave} onClose={vi.fn()} />)
    const img = document.querySelector("img") as HTMLImageElement
    Object.defineProperty(img, "naturalWidth", { value: 800, configurable: true })
    Object.defineProperty(img, "naturalHeight", { value: 600, configurable: true })
    fireEvent.load(img)

    await user.click(screen.getByText("Сохранить"))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith(expect.any(Blob))
    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.92)
  })

  it("lets the user change the zoom via the range slider", () => {
    render(<AvatarCropperModal file={makeFile()} onSave={vi.fn()} onClose={vi.fn()} />)
    const slider = screen.getByLabelText("Масштаб") as HTMLInputElement
    expect(slider.value).toBe("1")
    fireEvent.change(slider, { target: { value: "2.5" } })
    expect(slider.value).toBe("2.5")
  })

  it("revokes the object URL on unmount", () => {
    const { unmount } = render(
      <AvatarCropperModal file={makeFile()} onSave={vi.fn()} onClose={vi.fn()} />,
    )
    unmount()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url")
  })
})
