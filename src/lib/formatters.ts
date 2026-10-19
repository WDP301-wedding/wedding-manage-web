/**
 * Shared currency and number formatters for wedding-manage-web.
 *
 * Rules:
 * - Integer VND only (no decimal VND values).
 * - Exact digit preservation; no arbitrary truncation or rounding drift.
 * - Standard Vietnamese locale conventions.
 */

/**
 * Formats an integer VND amount with Vietnamese locale thousand separators and 'đ' suffix.
 * Example: 1500000 -> "1.500.000 đ"
 */
export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} đ`;
}

/**
 * Formats an integer VND amount with Vietnamese locale thousand separators and '₫' symbol.
 * Example: 1500000 -> "1.500.000 ₫"
 */
export function formatVndSymbol(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} ₫`;
}

/**
 * Formats a nullable integer VND amount. Returns '—' when null, undefined, or NaN.
 */
export function formatVndNullable(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
}

/**
 * Formats currency using standard Intl currency style (e.g. for booking / catalog prices).
 * Example: 1500000 -> "1.500.000 ₫"
 */
export function formatCurrencyVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Alias for formatCurrencyVnd matching existing booking/billing helpers.
 */
export const money = formatCurrencyVnd;
