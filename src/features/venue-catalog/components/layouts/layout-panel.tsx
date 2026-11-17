'use client';

import { Skeleton } from '@/src/components/ui/skeleton';
import {
  hasDirtyCatalogForms,
  useCatalogLiveRefresh,
} from '@/src/features/venue-catalog/hooks/use-catalog-live-refresh';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Authorize,
  CatalogGateway,
  LayoutCatalogSnapshot,
} from '@/src/features/venue-catalog/types/catalog-types';
import { notify } from '@/src/design-system/notifications/index';
import { cx } from '@/src/features/venue-catalog/styles/catalog-classes';
import { layoutErrorMessage } from '@/src/features/venue-catalog/utils/layout-helpers';
import { PrintOrderDialog } from '@/src/features/print-orders/components/dialogs/print-order-dialog';
import { TablePagination } from '@/src/components/data-display/table-controls';
import { useCatalogPagination } from '@/src/features/venue-catalog/hooks/use-catalog-pagination';
import { TemplateRecordTable } from '@/src/features/venue-catalog/components/timeline/template-record-table';
import { cn } from 'cn';
import { layoutFilters, type LayoutFilter, type NewLayoutDraft } from './layout-panel-config';
import {
  CreateLayoutForm,
  LayoutAggregate,
  LayoutVersionEditor,
} from './layout-version-components';

export function LayoutPanel({
  authorize,
  gateway,
}: Readonly<{ authorize: Authorize; gateway: CatalogGateway }>) {
  const [snapshot, setSnapshot] = useState<LayoutCatalogSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const reportValidationError = useCallback((message: string | null) => {
    if (message) notify.error(message);
  }, []);

  const [filter, setFilter] = useState<LayoutFilter>('all');
  const [dialog, setDialog] = useState<'create' | NewLayoutDraft | null>(null);
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  const dismiss = useCallback(() => {
    if (!pendingRef.current) setDialog(null);
  }, []);

  const load = useCallback(
    async (background = false, openDraftId?: string) => {
      setLoading(true);
      try {
        const next = await authorize((token) => gateway.loadLayouts(token));
        if (!background || !hasDirtyCatalogForms()) setSnapshot(next);
        if (openDraftId) {
          const layout = next.layouts.find(({ id }) => id === openDraftId);
          const version = layout?.versions.find(({ id }) => id === layout.draftVersionId);
          if (layout && version) setDialog({ layout, version });
        }
      } catch (caught) {
        notify.error(caught, { fallbackMessage: layoutErrorMessage(caught) });
      } finally {
        setLoading(false);
      }
    },
    [authorize, gateway],
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  useCatalogLiveRefresh(load);

  const run = async (
    successMessage: string,
    operation: (token: string) => Promise<void>,
    openDraftId?: string,
  ) => {
    setPending(true);
    try {
      await authorize(operation);
      notify.success(successMessage);
      await load(false, openDraftId);
      return true;
    } catch (caught) {
      const msg = layoutErrorMessage(caught);
      notify.error(caught, { fallbackMessage: msg });
      return false;
    } finally {
      setPending(false);
    }
  };

  const halls = snapshot?.halls ?? [];
  const layouts = snapshot?.layouts ?? [];
  const visibleLayouts = useMemo(() => {
    return layouts.filter((layout) => {
      if (filter === 'all') return true;
      if (layout.lifecycle !== 'ACTIVE') return false;
      const published = layout.currentPublishedVersionId !== null;
      return filter === 'active' ? published : !published;
    });
  }, [layouts, filter]);

  const layoutPagination = useCatalogPagination(visibleLayouts, 10, [5, 10, 20]);

  useEffect(() => {
    layoutPagination.resetPage();
  }, [filter, layoutPagination.resetPage]);

  if (loading && snapshot === null) {
    return (
      <section className={cx.section} aria-busy="true" aria-label="Đang tải mẫu bố trí">
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className={cn(cx.section, cx.layoutSection)} aria-labelledby="layout-heading">
      <div className={cx.sectionHeading}>
        <h2 id="layout-heading">Mẫu bố trí bàn</h2>
        <p>Theo dõi bản đang công bố, quản lý bản nháp và xem lịch sử bố cục theo sảnh.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-6">
        <button className={cx.primaryButton} type="button" onClick={() => setDialog('create')}>
          Thêm bố cục bàn
        </button>
        <div role="group" aria-label="Lọc bố cục theo trạng thái" className="flex flex-wrap gap-2">
          {layoutFilters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={cn(
                cx.secondaryButton,
                'aria-pressed:border-primary aria-pressed:bg-accent',
              )}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {dialog === 'create' && (
        <PrintOrderDialog label="Thêm bố cục bàn" title="Thêm bố cục bàn" onClose={dismiss}>
          <CreateLayoutForm
            halls={halls.filter((hall) => hall.lifecycle === 'ACTIVE')}
            pending={pending}
            onCancel={dismiss}
            onSubmit={async (input) => {
              const templateId = crypto.randomUUID();
              const versionId = crypto.randomUUID();
              const ok = await run(
                'Đã tạo bản nháp bố trí.',
                (token) =>
                  gateway.createLayout(token, {
                    ...input,
                    templateId,
                    versionId,
                    displayOrder: layouts.length + 1,
                  }),
                templateId,
              );
              if (ok) setDialog((current) => (current === 'create' ? null : current));
            }}
          />
        </PrintOrderDialog>
      )}
      {dialog && dialog !== 'create' && (
        <PrintOrderDialog
          label="Tiếp tục bản nháp"
          title="Tiếp tục bản nháp"
          size="wide"
          onClose={dismiss}
        >
          <LayoutVersionEditor
            version={dialog.version}
            layout={dialog.layout}
            gateway={gateway}
            hallMaximum={halls.find(({ id }) => id === dialog.layout.hallId)?.maxGuests ?? 0}
            pending={pending}
            run={run}
            close={() => setDialog(null)}
            setError={reportValidationError}
          />
        </PrintOrderDialog>
      )}
      {visibleLayouts.length === 0 ? (
        <p className={cx.empty}>
          {layouts.length === 0
            ? 'Chưa có mẫu bố trí. Tạo mẫu đầu tiên cho một sảnh hoạt động.'
            : 'Không có bố cục phù hợp với bộ lọc.'}
        </p>
      ) : (
        <>
          <TemplateRecordTable label="Danh sách bố cục bàn" informationHeading="Sảnh & sức chứa">
            {layoutPagination.paginatedItems.map((layout) => (
              <LayoutAggregate
                key={layout.id}
                gateway={gateway}
                hall={halls.find(({ id }) => id === layout.hallId)}
                layout={layout}
                pending={pending}
                run={run}
                setError={reportValidationError}
              />
            ))}
          </TemplateRecordTable>
          <div className="px-4 pb-6 sm:px-6">
            <TablePagination
              info={
                <span>
                  Hiển thị{' '}
                  <strong>
                    {layoutPagination.totalItems === 0 ? 0 : layoutPagination.startIndex + 1}
                  </strong>{' '}
                  – <strong>{layoutPagination.endIndex}</strong> /{' '}
                  <strong>{layoutPagination.totalItems}</strong> bố cục bàn
                </span>
              }
              pageSize={layoutPagination.pageSize}
              pageSizes={layoutPagination.pageSizes}
              onPageSize={layoutPagination.setPageSize}
              page={layoutPagination.page}
              totalPages={layoutPagination.totalPages}
              onPage={layoutPagination.setPage}
              navLabel="Phân trang bố cục bàn"
            />
          </div>
        </>
      )}
    </section>
  );
}
