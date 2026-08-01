// Shared by every file-upload surface backed by
// apps.core.validators.AllowedMimeTypeValidator / MaxFileSizeValidator
// (mentor verification documents, order documents/receipts, mentor
// profile photo, ...) — those validators raise plain English text with
// no locale awareness. Every caller must have `fileTypeNotAllowed` and
// `fileTooLarge` keys in its own translation namespace; anything
// unrecognized falls back to the raw text rather than showing nothing.
export function translateFileUploadErrorMessage(raw: string, t: (key: string) => string): string {
  const lower = raw.toLowerCase()
  if (lower.includes("file type") && lower.includes("is not allowed")) {
    return t("fileTypeNotAllowed")
  }
  if (lower.includes("file content type is missing")) {
    return t("fileTypeNotAllowed")
  }
  if (lower.includes("file is too large")) {
    return t("fileTooLarge")
  }
  return raw
}
