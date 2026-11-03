'use client';

import { type ReactNode, useState } from 'react';
import { Eye, Pencil, Power, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { PrintOrderDialog } from '../print-orders/print-order-dialog';
import { cx } from './catalog-classes';
import { formatVnd } from './food-catalog-shared';
import type { CatalogDish, CatalogMenu } from './catalog-api';

/** Prefer the working draft, otherwise the authoritative published pointer. */
export function latestFoodVersion<T extends CatalogDish | CatalogMenu>(
  record: T,
): T['versions'][number] | undefined {
  return (
    record.versions.find(({ id }) => id === record.draftVersionId) ??
    record.versions.find(({ id }) => id === record.currentPublishedVersionId) ??
    [...record.versions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]
  );
}

export function currentDishOptions(dishes: readonly CatalogDish[]) {
  return dishes
    .filter(({ lifecycle }) => lifecycle === 'ACTIVE')
    .flatMap((dish) => {
      const version = dish.versions.find(
        ({ id, state }) => id === dish.currentPublishedVersionId && state === 'PUBLISHED',
      );
      return version
        ? [{ id: version.id, label: `${version.name} · phiên bản ${version.versionNumber}` }]
        : [];
    });
}

export function FoodRecordCard({
  label,
  lifecycle,
  draft,
  price,
  priceUnit,
  summary,
  details,
  editor,
  pending,
  onEdit,
  onLifecycle,
  onDelete,
}: Readonly<{
  label: string;
  lifecycle: 'ACTIVE' | 'RETIRED';
  draft: boolean;
  price: number | null;
  priceUnit?: string;
  summary: ReactNode;
  details: ReactNode;
  editor: ReactNode;
  pending: boolean;
  onEdit: () => Promise<boolean>;
  onLifecycle: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}>) {
  const [view, setView] = useState<'details' | 'edit' | 'delete' | null>(null);
  const close = () => {
    if (!pending) setView(null);
  };
  return (
    <article className={cx.aggregate} aria-label={label}>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={lifecycle === 'ACTIVE' ? 'success' : 'neutral'}>
            {lifecycle === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngừng'}
          </Badge>
          {draft && <Badge variant="neutral">Chưa công bố</Badge>}
        </div>
        <h4 className="text-base font-semibold break-words">{label}</h4>
        <p className="text-lg font-semibold text-primary">
          {price === null ? 'Chưa niêm yết giá' : formatVnd(price)}
          {priceUnit && (
            <span className="text-xs font-normal text-muted-foreground"> / {priceUnit}</span>
          )}
        </p>
        <div className="text-sm text-muted-foreground">{summary}</div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border bg-muted/30 p-3">
        <button className={cx.secondaryButton} type="button" onClick={() => setView('details')}>
          <Eye aria-hidden />
          Xem chi tiết
        </button>
        <button
          className={cx.secondaryButton}
          type="button"
          disabled={pending || lifecycle !== 'ACTIVE'}
          onClick={() => {
            void onEdit().then((ok) => {
              if (ok) setView('edit');
            });
          }}
        >
          <Pencil aria-hidden />
          Chỉnh sửa
        </button>
        <button
          className={cx.secondaryButton}
          type="button"
          disabled={pending}
          onClick={() => void onLifecycle()}
        >
          <Power aria-hidden />
          {lifecycle === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt'}
        </button>
        <button
          className={cx.dangerButton}
          type="button"
          disabled={pending}
          onClick={() => setView('delete')}
        >
          <Trash2 aria-hidden />
          Xóa
        </button>
      </div>
      {view !== null && (
        <PrintOrderDialog
          label={`${view === 'details' ? 'Chi tiết' : view === 'edit' ? 'Chỉnh sửa' : 'Xóa'} ${label}`}
          title={view === 'delete' ? `Xóa ${label}?` : label}
          onClose={close}
        >
          {view === 'details' ? (
            details
          ) : view === 'edit' ? (
            <>
              {draft ? editor : details}
              <p className={cx.help}>
                Thay đổi chỉ áp dụng cho lựa chọn mới sau khi công bố. Hợp đồng đã lập giữ nguyên.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Mục này sẽ được xóa khỏi danh mục. Dữ liệu đã sử dụng trong thực đơn và hợp đồng vẫn
                được giữ nguyên.
              </p>
              <div className={cx.formActions}>
                <button
                  className={cx.secondaryButton}
                  type="button"
                  disabled={pending}
                  onClick={close}
                >
                  Hủy
                </button>
                <button
                  className={cx.dangerButton}
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    void onDelete().then((ok) => {
                      if (ok) setView(null);
                    });
                  }}
                >
                  {pending ? 'Đang xóa…' : 'Xác nhận xóa'}
                </button>
              </div>
            </>
          )}
        </PrintOrderDialog>
      )}
    </article>
  );
}
