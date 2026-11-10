'use client';
import type { ReactNode } from 'react';
import { Button } from '../../components/ui/button';
import { formatUnitLabel, formatVnd } from '../../lib/formatters';
import type { OfferingItem, OfferingKind } from './offering-catalog-api';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 [overflow-wrap:anywhere]">
      <dt className="mb-1 text-xs text-muted-foreground xl:sr-only">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
export function OfferingCatalogList({
  kind,
  items,
  pending,
  onEdit,
  onToggle,
}: {
  kind: OfferingKind;
  items: readonly OfferingItem[];
  pending: boolean;
  onEdit: (item: OfferingItem) => void;
  onToggle: (item: OfferingItem) => void;
}) {
  const columns =
    kind === 'incidentals'
      ? 'xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.3fr)]'
      : 'xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]';
  const headers = [
    kind === 'incidentals' ? 'Hạng mục' : 'Dịch vụ',
    'Đơn giá',
    ...(kind === 'incidentals' ? ['Cách tính'] : []),
    'Trạng thái',
    'Thao tác',
  ];
  return (
    <div className="min-w-0 rounded-lg border border-border">
      <div
        aria-hidden="true"
        className={`hidden gap-4 rounded-t-lg bg-muted px-4 py-3 text-xs font-semibold text-muted-foreground xl:grid ${columns}`}
      >
        {headers.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      {items.length === 0 ? (
        <p role="status" className="p-5 text-sm text-muted-foreground">
          Không có {kind === 'incidentals' ? 'hạng mục' : 'dịch vụ'} ở trạng thái này.
        </p>
      ) : (
        <ul className="min-w-0 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="min-w-0 p-4">
              <div className={`grid min-w-0 gap-4 sm:grid-cols-2 xl:items-start ${columns}`}>
                <div className="min-w-0 [overflow-wrap:anywhere]">
                  <p className="font-medium">{item.name}</p>
                  {item.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <dl className="min-w-0">
                  <Detail label="Đơn giá">
                    {formatVnd(item.unitPriceVnd)}/{formatUnitLabel(item.unit)}
                  </Detail>
                </dl>
                {kind === 'incidentals' ? (
                  <dl className="min-w-0">
                    <Detail label="Cách tính">{item.chargingRule}</Detail>
                  </dl>
                ) : null}
                <dl className="min-w-0">
                  <Detail label="Trạng thái">
                    <span
                      className={`inline-block max-w-full rounded-md px-2 py-1 text-xs leading-relaxed ${item.active ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                      {item.active ? 'Đang sử dụng' : 'Đã ngừng'}
                    </span>
                  </Detail>
                </dl>
                <div className="flex min-w-0 flex-wrap gap-2 sm:col-span-2 xl:col-span-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    aria-label={`Sửa ${item.name}`}
                    onClick={() => onEdit(item)}
                  >
                    Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    aria-label={`${item.active ? 'Ngừng sử dụng' : 'Khôi phục'} ${item.name}`}
                    onClick={() => onToggle(item)}
                  >
                    {item.active ? 'Ngừng sử dụng' : 'Khôi phục'}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
