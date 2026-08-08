// The backend's create_support_invoice raises plain English ValueErrors —
// translate the ones a mentor can realistically hit; anything unrecognized
// falls back to the raw message rather than showing nothing. `t` is the
// caller's own Orders.Detail translator, passed in rather than called via
// useTranslations here since this is a plain function (also unit-tested
// standalone), not a component.
export function translateInvoiceErrorMessage(raw: string, t: (key: string) => string): string {
  const lower = raw.toLowerCase()
  if (lower.includes("already a live engagement")) {
    return t("invoiceErrorLiveEngagement")
  }
  if (lower.includes("no open conversation")) {
    return t("invoiceErrorNoConversation")
  }
  if (lower.includes("does not belong to this mentor") || lower.includes("not a support-category service")) {
    return t("invoiceErrorServiceUnavailable")
  }
  if (lower.includes("whole number of tenge")) {
    return t("invoiceErrorPriceFractional")
  }
  if (lower.includes("price must be at least")) {
    return t("invoiceErrorPriceMin")
  }
  if (lower.includes("price cannot be more than")) {
    return t("invoiceErrorPriceMax")
  }
  if (lower.includes("enter the price as a number")) {
    return t("invoiceErrorPriceInvalid")
  }
  if (lower.includes("duration must be at least")) {
    return t("invoiceErrorMonthsMin")
  }
  if (lower.includes("duration cannot be more than")) {
    return t("invoiceErrorMonthsMax")
  }
  if (lower.includes("enter the duration as a number")) {
    return t("invoiceErrorMonthsInvalid")
  }
  return raw
}
