'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Files, Power, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { PrintOrderDialog } from '../print-orders/print-order-dialog';
import { cx } from './catalog-classes';
import { formatVnd } from './food-catalog-shared';
import { FoodRecordDetails } from './food-record-details';
import type { CatalogDish, CatalogMenu } from './catalog-api';

/** List prices/names describe the publication, even while a new draft is being edited. */
export function latestFoodVersion<T extends CatalogDish | CatalogMenu>(
  record: T,
): T['versions'][number] | undefined {
  return (
    record.versions.find(({ id }) => id === record.currentPublishedVersionId) ??
    record.versions.find(({ id }) => id === record.draftVersionId)
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
        ? [
            {
              id: version.id,
              label: `${version.name} · phiên bản ${version.versionNumber}`,
              priceVnd: version.priceVnd,
            },
          ]
        : [];
    });
}

export function FoodRecordRow({
  record,
  editor,
  pending,
  onLifecycle,
  onDelete,
}: Readonly<{
  record: CatalogDish | CatalogMenu;
  editor: (close: () => void) => ReactNode;
  pending: boolean;
  onLifecycle: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}>) {
  const [view, setView] = useState<'details' | 'edit' | 'delete' | null>(null);
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  // Keep the dialog's focus trap mounted when saving changes pending/snapshot state.
  const close = useCallback(() => {
    if (!pendingRef.current) setView(null);
  }, []);
  const version = latestFoodVersion(record);
  if (!version) return null;
  const isMenu = 'priceVndPerTable' in version;
  const price = isMenu ? version.priceVndPerTable : version.priceVnd;
  const hasDraft = record.draftVersionId !== null;
  const closeAfterSave = () => setView(null);
  const editLabel = hasDraft ? 'Tiếp tục bản nháp' : 'Tạo phiên bản mới';
  return (
    <tr aria-label={version.name}>
      <td className="min-w-48 max-w-80 break-words font-semibold">{version.name}</td>
      <td>
        <div className="flex flex-col items-start gap-2">
          <Badge variant={record.lifecycle === 'RETIRED' ? 'neutral' : 'success'}>
            {record.lifecycle === 'RETIRED'
              ? 'Đã ngừng'
              : record.currentPublishedVersionId
                ? 'Đang hoạt động'
                : 'Chưa công bố'}
          </Badge>
          {hasDraft && record.currentPublishedVersionId && (
            <Badge variant="neutral">Có bản nháp</Badge>
          )}
        </div>
      </td>
      <td>{version.state === 'DRAFT' ? 'Chưa công bố' : `v${version.versionNumber}`}</td>
      <td className="whitespace-nowrap">
        {price === null ? 'Chưa niêm yết giá' : formatVnd(price)}
        {isMenu && <span className="text-xs text-muted-foreground"> / bàn</span>}
        {version.state === 'DRAFT' && (
          <p className="mt-1 text-xs text-muted-foreground">Giá bản nháp</p>
        )}
      </td>
      <td>
        <div className="grid w-max grid-cols-[max-content_max-content] justify-items-start gap-2 [&>button]:h-9 [&>button]:px-3 [&>button]:text-xs">
          <button className={cx.secondaryButton} type="button" onClick={() => setView('details')}>
            <Eye aria-hidden />
            Chi tiết
          </button>
          <button
            className={cx.secondaryButton}
            type="button"
            disabled={pending || record.lifecycle !== 'ACTIVE'}
            onClick={() => setView('edit')}
          >
            <Files aria-hidden />
            {editLabel}
          </button>
          <button
            className={cx.secondaryButton}
            type="button"
            disabled={pending}
            onClick={() => void onLifecycle()}
          >
            <Power aria-hidden />
            {record.lifecycle === 'ACTIVE' ? 'Ngừng' : 'Kích hoạt'}
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
            label={`${view === 'details' ? 'Chi tiết' : view === 'edit' ? editLabel : 'Xóa'} ${version.name}`}
            title={
              view === 'delete'
                ? `Xóa ${version.name}?`
                : view === 'edit'
                  ? editLabel
                  : version.name
            }
            onClose={close}
          >
            {view === 'details' ? (
              <FoodRecordDetails record={record} />
            ) : view === 'edit' ? (
              <>
                {editor(closeAfterSave)}
                <p className={cx.help}>
                  Bản nháp chỉ áp dụng cho lựa chọn mới sau khi công bố. Hợp đồng đã lập giữ nguyên.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Mục này sẽ được xóa khỏi danh mục. Dữ liệu đã sử dụng trong thực đơn và hợp đồng
                  vẫn được giữ nguyên.
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
      </td>
    </tr>
  );
}
