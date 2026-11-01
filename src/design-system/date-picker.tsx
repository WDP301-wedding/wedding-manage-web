'use client';

import { type CSSProperties, useId, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from 'cn';
import { WEEKDAYS } from './date-picker-utils';
import { useDatePicker } from './use-date-picker';

export interface DatePickerProps {
  name?: string | undefined;
  id?: string | undefined;
  value?: string | undefined;
  defaultValue?: string | undefined;
  min?: string | undefined;
  max?: string | undefined;
  placeholder?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  hasError?: boolean | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  ariaDescribedby?: string | undefined;
  ariaLabelledby?: string | undefined;
  ariaLabel?: string | undefined;
  onChange?: ((isoDate: string) => void) | undefined;
}

const navButtonClass =
  'inline-flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

export function DatePicker({
  name,
  id,
  value,
  defaultValue,
  min,
  max,
  placeholder = 'dd/mm/yyyy',
  required,
  disabled,
  hasError,
  className,
  style,
  ariaDescribedby,
  ariaLabelledby,
  ariaLabel,
  onChange,
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = id ?? `hy-date-input-${generatedId}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const picker = useDatePicker({ value, defaultValue, min, max, disabled, onChange, containerRef });

  return (
    <div
      ref={containerRef}
      data-ui-v3
      className={cn('relative w-full min-w-0', className)}
      style={style}
    >
      {name ? <input type="hidden" name={name} value={picker.selectedIso} /> : null}

      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={cn(
            'h-11 w-full min-w-0 rounded-lg border border-input bg-card pr-11 pl-3 text-sm font-normal text-foreground tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50',
            picker.isOpen && 'border-primary',
            hasError && 'border-destructive',
          )}
          value={picker.displayValue}
          placeholder={placeholder}
          required={required && !picker.selectedIso}
          disabled={disabled}
          min={min}
          max={max}
          aria-describedby={ariaDescribedby}
          aria-labelledby={ariaLabelledby}
          aria-label={ariaLabel}
          aria-expanded={picker.isOpen}
          aria-haspopup="dialog"
          onClick={picker.handleToggle}
          onChange={picker.handleInputChange}
          onBlur={picker.handleBlur}
          onKeyDown={picker.handleKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Chọn ngày từ lịch"
          disabled={disabled}
          className="absolute top-1 right-1 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          onClick={picker.handleToggle}
        >
          <Calendar aria-hidden className="size-[18px]" />
        </button>
      </div>

      {picker.isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Chọn ngày"
          className="absolute top-full left-0 z-50 mt-1.5 flex w-[300px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl border border-border bg-popover p-3 shadow-hy-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="pl-1 text-sm font-semibold tabular-nums">
              Tháng {picker.viewMonth + 1}/{picker.viewYear}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Tháng trước"
                className={navButtonClass}
                onClick={picker.handlePrevMonth}
              >
                <ChevronLeft aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Tháng sau"
                className={navButtonClass}
                onClick={picker.handleNextMonth}
              >
                <ChevronRight aria-hidden className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-2xs font-semibold text-muted-foreground">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {picker.emptyCells.map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {picker.dayCells.map((cell) => (
              <button
                key={cell.iso}
                type="button"
                disabled={cell.isDisabled}
                className={cn(
                  'inline-flex aspect-square items-center justify-center rounded-lg text-sm tabular-nums transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  cell.isToday && 'font-semibold text-primary ring-1 ring-primary/40 ring-inset',
                  cell.isSelected &&
                    'bg-primary font-semibold text-primary-foreground hover:bg-primary',
                  cell.isDisabled &&
                    'pointer-events-none text-muted-foreground/50 line-through hover:bg-transparent',
                )}
                onClick={() => picker.handleDaySelect(cell.day)}
                aria-label={`${cell.day}/${picker.viewMonth + 1}/${picker.viewYear}`}
              >
                {cell.day}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 border-t border-border pt-2 text-2xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-primary" />
              Đã chọn
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-muted-foreground/50 line-through">
                12
              </span>
              Không khả dụng
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="h-9 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
              onClick={picker.handleClear}
            >
              Xoá
            </button>
            <button
              type="button"
              className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-hy-wine-pressed"
              onClick={() => picker.setIsOpen(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
