/**
 * Shared currency and number formatters for wedding-manage-web.
 *
 * Rules:
 * - Integer VND only (no decimal VND values).
 * - Exact digit preservation; no arbitrary truncation or rounding drift.
 * - Standard Vietnamese locale conventions with official '₫' currency symbol.
 * - Singleton formatter instances for high performance and low GC overhead.
 */

const VI_NUMBER_FORMAT = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
});

/**
 * Formats an integer VND amount with Vietnamese locale thousand separators and '₫' symbol.
 * Example: 1500000 -> "1.500.000 ₫"
 */
export function formatVnd(amount: number): string {
  return `${VI_NUMBER_FORMAT.format(Math.round(amount))} ₫`;
}

/**
 * Formats an integer VND amount with Vietnamese locale thousand separators and '₫' symbol.
 * Retained for backward compatibility.
 */
export function formatVndSymbol(amount: number): string {
  return formatVnd(amount);
}

/**
 * Formats a nullable integer VND amount. Returns '—' when null, undefined, or NaN.
 */
export function formatVndNullable(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return formatVnd(amount);
}

/**
 * Formats currency using standard Intl currency style (e.g. for booking / catalog prices).
 * Example: 1500000 -> "1.500.000 ₫"
 */
export function formatCurrencyVnd(value: number): string {
  return formatVnd(value);
}

/**
 * Alias for formatCurrencyVnd matching existing booking/billing helpers.
 */
export const money = formatVnd;
