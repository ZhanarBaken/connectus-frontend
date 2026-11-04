/** Pre-snapshot orders were sold by the KZT-only business. Display fallback
 * only: never write this assumption back as a captured contract currency. */
export const LEGACY_ORDER_CURRENCY = "KZT"

/** Display a validated stored amount. No conversion or commission arithmetic. */
export function formatMoney(
  amount: string | null | undefined,
  currency: string,
  locale = "ru-RU",
): string {
  if (currency !== "KZT" || typeof amount !== "string" || !/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount)) {
    return "—"
  }
  const value = Number(amount)
  // Keep the decimal's cents within JS's safe integer range.
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER / 100) return "—"
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ₸`
}
