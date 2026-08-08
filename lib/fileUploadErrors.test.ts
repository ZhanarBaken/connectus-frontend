import { describe, it, expect } from "vitest"
import { translateFileUploadErrorMessage } from "./fileUploadErrors"

function makeT(overrides: Record<string, string> = {}) {
  const messages: Record<string, string> = {
    fileTypeNotAllowed: "This file type isn't allowed.",
    fileTooLarge: "The file is too large.",
    ...overrides,
  }
  return (key: string) => messages[key] ?? `[MISSING:${key}]`
}

describe("translateFileUploadErrorMessage", () => {
  const t = makeT()

  it("translates the AllowedMimeTypeValidator rejection message", () => {
    expect(
      translateFileUploadErrorMessage(
        "File type 'text/plain' is not allowed. Allowed: application/pdf, image/jpeg, image/png.",
        t,
      ),
    ).toBe("This file type isn't allowed.")
  })

  it("translates a missing content type the same way as an unsupported one", () => {
    expect(translateFileUploadErrorMessage("File content type is missing.", t))
      .toBe("This file type isn't allowed.")
  })

  it("translates the MaxFileSizeValidator rejection message", () => {
    expect(
      translateFileUploadErrorMessage("File is too large: 20480 KB. Max allowed: 15 MB.", t),
    ).toBe("The file is too large.")
  })

  it("falls back to the raw text for an unrecognized message", () => {
    expect(translateFileUploadErrorMessage("Something else entirely.", t))
      .toBe("Something else entirely.")
  })

  it("is case-insensitive", () => {
    expect(translateFileUploadErrorMessage("FILE IS TOO LARGE: 999 KB.", t))
      .toBe("The file is too large.")
  })
})
