// Class dùng chung cho trang thanh toán và các form nghiệp vụ (thu, hoàn, duyệt hoàn).
export const pageStateClass =
  'flex min-h-[60vh] flex-col items-start gap-3 bg-background p-6 sm:p-10';
export const cardClass =
  'flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-hy-1';
export const panelClass = 'flex flex-col gap-4';
export const fieldsetClass = 'flex min-w-0 flex-col gap-3';
export const rowClass = 'grid gap-3 sm:grid-cols-2';
export const labelClass = 'flex min-w-0 flex-col gap-1 text-xs font-semibold';
export const inputClass = 'font-normal';
export const selectClass =
  'h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm font-normal text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50';
export const confirmClass = 'flex flex-col gap-2 rounded-lg border-2 border-primary bg-card p-4';
