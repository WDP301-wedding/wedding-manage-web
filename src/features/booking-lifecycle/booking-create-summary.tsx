'use client';

import { cn } from 'cn';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { formatDate, money } from './booking-helpers';
import type { BookingSelections } from './booking-api';

export interface BookingCreateSummaryProps {
  currentHall: BookingSelections['halls'][number] | undefined;
  currentMenu: BookingSelections['menus'][number] | undefined;
  eventDate: string;
  shiftCode: string;
  currentTables: number;
  currentHeadcount: number;
  disabled: boolean;
  hasConsultation: boolean;
}

const priceRowClass = 'flex justify-between gap-3';

export function BookingCreateSummary({
  currentHall,
  currentMenu,
  eventDate,
  shiftCode,
  currentTables,
  currentHeadcount,
  disabled,
  hasConsultation,
}: Readonly<BookingCreateSummaryProps>) {
  const maxGuests = currentHall?.maxGuests ?? 0;
  const isOverCapacity = maxGuests > 0 && currentHeadcount > maxGuests;
  const capacityPercent =
    maxGuests > 0 && currentHeadcount > 0
      ? Math.min(100, Math.round((currentHeadcount / maxGuests) * 100))
      : 0;
  const estimatedTotal = currentMenu ? currentMenu.priceVndPerTable * currentTables : 0;
  const estimatedDeposit = Math.round(estimatedTotal * 0.3);

  return (
    <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-hy-1 min-[1100px]:sticky min-[1100px]:top-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Tóm tắt đề xuất</span>
          <h3 className="text-lg font-semibold">{currentHall?.name || 'Chưa chọn sảnh'}</h3>
        </div>
        <Badge>Bản nháp</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Ngày tổ chức</dt>
          <dd className="font-semibold tabular-nums">
            {eventDate ? formatDate(eventDate) : 'Chưa chọn ngày'}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Ca tiệc</dt>
          <dd className="font-semibold">
            {shiftCode === 'LUNCH'
              ? 'Trưa (10:00–14:00)'
              : shiftCode === 'DINNER'
                ? 'Tối (17:00–22:00)'
                : 'Chưa chọn ca'}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-3 text-xs">
          <span className="text-muted-foreground">Sức chứa sảnh</span>
          <span className="font-semibold tabular-nums">
            {currentHall ? `${currentHeadcount || 0} / ${currentHall.maxGuests} khách` : '--'}
          </span>
        </div>
        <div aria-hidden className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn('h-2 rounded-full', isOverCapacity ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${capacityPercent}%` }}
          />
        </div>
        {isOverCapacity ? (
          <p className="text-xs font-semibold text-hy-error">
            Vượt quá sức chứa tối đa của sảnh ({currentHall?.maxGuests} khách)
          </p>
        ) : currentHall && currentHeadcount > 0 ? (
          <p className="text-xs text-hy-success">Sức chứa sảnh phù hợp ({capacityPercent}%)</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className={priceRowClass}>
          <span className="text-muted-foreground">Thực đơn</span>
          <strong className="text-right font-semibold">{currentMenu?.name || 'Chưa chọn'}</strong>
        </div>
        <div className={priceRowClass}>
          <span className="text-muted-foreground">Đơn giá</span>
          <span className="tabular-nums">
            {currentMenu ? `${money(currentMenu.priceVndPerTable)}/bàn` : '--'}
          </span>
        </div>
        <div className={priceRowClass}>
          <span className="text-muted-foreground">Số bàn</span>
          <span className="tabular-nums">{currentTables ? `${currentTables} bàn` : '--'}</span>
        </div>
        <div className="my-1 h-px bg-border" />
        <div className={cn(priceRowClass, 'items-baseline')}>
          <span>Tạm tính:</span>
          <strong className="text-lg font-bold text-primary tabular-nums">
            {money(estimatedTotal)}
          </strong>
        </div>
        <div className={priceRowClass}>
          <span className="text-muted-foreground">Tiền cọc tối thiểu (30%):</span>
          <strong className="font-semibold tabular-nums">{money(estimatedDeposit)}</strong>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          disabled={disabled || !hasConsultation}
          type="submit"
          className="h-auto min-h-13 w-full flex-col gap-0 py-2"
          aria-label="Tạo booking"
        >
          <span>Tạo booking</span>
          <span className="text-2xs font-medium" aria-hidden="true">
            &amp; Khởi tạo đề xuất giữ sảnh
          </span>
        </Button>
        <p className="text-center text-2xs text-muted-foreground">
          Khung giờ sẽ được tự động bảo lưu sau khi tạo đề xuất
        </p>
      </div>
    </aside>
  );
}
