// Class dùng chung cho màn Thiệp và in ấn (hàng đợi, chi tiết đơn, báo giá, hộp thoại).
import type { StatusTone } from './print-orders-types';

export const cardClass =
  'flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-hy-1';
export const cardTitleClass = 'text-base font-semibold';
export const labelClass = 'flex flex-col gap-1.5 text-xs font-semibold';
export const hintClass = 'text-xs text-muted-foreground';
export const errorTextClass = 'text-xs text-hy-error';
export const textareaClass =
  'min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm font-normal text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
export const dialogActionsClass = 'flex flex-wrap justify-end gap-2 pt-2';

export const toneBadge: Record<StatusTone, 'neutral' | 'success' | 'warning' | 'error'> = {
  neutral: 'neutral',
  green: 'success',
  amber: 'warning',
  red: 'error',
};
