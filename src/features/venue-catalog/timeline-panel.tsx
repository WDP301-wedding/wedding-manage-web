'use client';

import { hasDirtyCatalogForms, useCatalogLiveRefresh } from './use-catalog-live-refresh';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import type {
  CatalogGateway,
  CatalogTimeline,
  TimelineCatalogSnapshot,
  TimelineItemWrite,
  TimelineWrite,
} from './catalog-api';
import type { Authorize } from './catalog-types';
import { notify } from '../../design-system/notifications';
import {
  move,
  newTimelineItem,
  normalizeItems,
  text,
  TimelineDraft,
  TimelineItemsEditor,
  TimelineTextField,
} from './timeline-draft';

import { cx } from './catalog-classes';
import { PrintOrderDialog } from '../print-orders/print-order-dialog';
import { TemplateRecordRow, TemplateRecordTable } from './template-record-table';
import { useTemplateDraft } from './use-template-draft';
import type { TimelineVersion } from './timeline-draft';
import { cn } from 'cn';
export {
  TimelineDraft,
  TimelineItemsEditor,
  TimelineTextField,
  newTimelineItem,
  normalizeItems,
  move,
  text,
};

export function TimelinePanel({
  authorize,
  gateway,
}: Readonly<{ authorize: Authorize; gateway: CatalogGateway }>) {
  const [snapshot, setSnapshot] = useState<TimelineCatalogSnapshot | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  const closeCreate = useCallback(() => {
    if (!pendingRef.current) setCreating(false);
  }, []);

  const load = useCallback(
    async (background = false) => {
      try {
        const next = await authorize((token) => gateway.loadTimelines(token));
        if (!background || !hasDirtyCatalogForms()) setSnapshot(next);
        setError(null);
      } catch (caught) {
        setError(timelineError(caught));
      }
    },
    [authorize, gateway],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useCatalogLiveRefresh(load);

  const run = async (success: string, operation: (token: string) => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await authorize(operation);
      notify.success(success);
      await load();
      return true;
    } catch (caught) {
      const msg = timelineError(caught);
      setError(msg);
      notify.error(caught, { fallbackMessage: msg });
      return false;
    } finally {
      setPending(false);
    }
  };

  if (snapshot === null) {
    return (
      <section className={cx.section} aria-labelledby="timeline-title">
        <TimelineHeading />
        <p className={error === null ? cx.empty : cx.error} role="status">
          {error ?? 'Đang tải kịch bản tiệc…'}
        </p>
      </section>
    );
  }

  return (
    <section className={cx.section} id="timeline" aria-labelledby="timeline-title">
      <TimelineHeading />
      <div className="flex flex-wrap gap-3 border-b border-border p-4 sm:px-6">
        <button className={cx.primaryButton} type="button" onClick={() => setCreating(true)}>
          Thêm kịch bản
        </button>
      </div>
      {creating && (
        <PrintOrderDialog
          label="Thêm kịch bản tiệc"
          size="wide"
          title="Thêm kịch bản tiệc"
          onClose={closeCreate}
        >
          <NewTimelineForm
            pending={pending}
            onCancel={closeCreate}
            onSubmit={(input) =>
              run('Đã tạo bản nháp kịch bản.', (token) =>
                gateway.createTimeline(token, {
                  ...input,
                  templateId: crypto.randomUUID(),
                  versionId: crypto.randomUUID(),
                  displayOrder: snapshot.timelines.length,
                }),
              ).then((ok) => {
                if (ok) setCreating(false);
                return ok;
              })
            }
          />
        </PrintOrderDialog>
      )}
      {error && (
        <p className={cx.error} role="status">
          {error}
        </p>
      )}
      {snapshot.timelines.length === 0 ? (
        <p className={cx.empty}>Chưa có kịch bản tiệc.</p>
      ) : (
        <TemplateRecordTable label="Danh sách kịch bản tiệc" informationHeading="Nội dung">
          {snapshot.timelines.map((timeline) => (
            <TimelineAggregate
              key={timeline.id}
              gateway={gateway}
              pending={pending}
              run={run}
              timeline={timeline}
            />
          ))}
        </TemplateRecordTable>
      )}
    </section>
  );
}

function TimelineHeading() {
  return (
    <div className={cx.sectionHeading}>
      <h2 id="timeline-title">Kịch bản tiệc</h2>
      <p>Theo dõi bản đang công bố, quản lý bản nháp và xem lịch sử phiên bản.</p>
    </div>
  );
}

function NewTimelineForm({
  onSubmit,
  pending,
  onCancel,
}: Readonly<{
  onSubmit: (input: TimelineWrite) => Promise<boolean>;
  pending: boolean;
  onCancel: () => void;
}>) {
  const [items, setItems] = useState<TimelineItemWrite[]>([newTimelineItem(0)]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void onSubmit({
      name: text(data, 'name'),
      description: text(data, 'description'),
      items: normalizeItems(items),
    }).then((success) => {
      if (success) {
        form.reset();
        setItems([newTimelineItem(0)]);
      }
    });
  };
  return (
    <form className={cx.timelineEditor} aria-label="Tạo kịch bản tiệc" onSubmit={submit}>
      <div className={cx.timelineEditorHeading}>
        <div>
          <h3>Tạo kịch bản</h3>
        </div>
        <button
          className={cx.secondaryButton}
          type="button"
          onClick={() => setItems([...items, newTimelineItem(items.length * 15)])}
        >
          Thêm mục
        </button>
      </div>
      <div className={cx.formGrid}>
        <TimelineTextField label="Tên kịch bản" name="name" />
        <TimelineTextField label="Mô tả kịch bản" name="description" />
      </div>
      <TimelineItemsEditor items={items} onChange={setItems} />
      <div className={cn(cx.formActions, cx.timelineActions)}>
        <button className={cx.secondaryButton} type="button" disabled={pending} onClick={onCancel}>
          Hủy
        </button>
        <button className={cx.primaryButton} type="submit" disabled={pending}>
          Tạo bản nháp kịch bản
        </button>
      </div>
    </form>
  );
}

function TimelineAggregate({
  gateway,
  pending,
  run,
  timeline,
}: Readonly<{
  gateway: CatalogGateway;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  timeline: CatalogTimeline;
}>) {
  return (
    <TemplateRecordRow
      record={timeline}
      pending={pending}
      information={(version) => <p>{version.items.length} mục chương trình</p>}
      renderVersion={(version) => <TimelineVersionContent version={version} />}
      editor={(version, close) => (
        <TimelineVersionEditor
          key={version.id}
          version={version}
          timeline={timeline}
          gateway={gateway}
          pending={pending}
          run={run}
          close={close}
        />
      )}
      onLifecycle={() =>
        run('Đã cập nhật trạng thái kịch bản.', (token) =>
          gateway.changeTimelineLifecycle(token, {
            id: timeline.id,
            expectedRevision: timeline.revision,
            transition: timeline.lifecycle === 'ACTIVE' ? 'RETIRE' : 'RESTORE',
          }),
        )
      }
    />
  );
}

function TimelineVersionEditor({
  version,
  timeline,
  gateway,
  pending,
  run,
  close,
}: Readonly<{
  version: TimelineVersion;
  timeline: CatalogTimeline;
  gateway: CatalogGateway;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  close: () => void;
}>) {
  const checkpoint = useTemplateDraft(version);
  return (
    <TimelineDraft
      version={version}
      pending={pending}
      onCancel={close}
      onSave={(input, publish) =>
        run(publish ? 'Đã công bố kịch bản.' : 'Đã lưu kịch bản nháp.', async (token) => {
          const draft = await checkpoint.prepare((intent) =>
            gateway.cloneTimeline(token, { templateId: timeline.id, ...intent }),
          );
          await gateway.updateTimelineDraft(token, {
            ...input,
            versionId: draft.id,
            expectedRevision: draft.revision,
          });
          checkpoint.saved();
          if (publish)
            await gateway.publishTimeline(token, {
              versionId: draft.id,
              expectedRevision: draft.revision + 1,
            });
        }).then((ok) => {
          if (ok) close();
          return ok;
        })
      }
    />
  );
}

function TimelineVersionContent({ version }: Readonly<{ version: TimelineVersion }>) {
  return (
    <ol className="flex flex-col divide-y divide-border" aria-label="Nội dung kịch bản">
      {[...version.items]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((item, index) => (
          <li key={item.id} className="flex gap-3 py-3">
            <span className="text-muted-foreground">{index + 1}.</span>
            <div className="min-w-0">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bắt đầu sau {item.offsetMinutes} phút ·{' '}
                {item.durationMinutes === null
                  ? 'Chưa có thời lượng'
                  : `${item.durationMinutes} phút`}
              </p>
              {item.description && <p className="mt-2">{item.description}</p>}
            </div>
          </li>
        ))}
    </ol>
  );
}

function timelineError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 403 || error.status === 404) {
      return 'Máy chủ từ chối thao tác kịch bản. Quyền cục bộ không được sử dụng.';
    }
    if (error.status === 409) {
      return 'Kịch bản đã thay đổi hoặc đã được công bố ở phiên khác. Tải lại lịch sử rồi thử lại.';
    }
    if (error.status === 422) {
      return error.details?.map(({ message }) => message).join(' ') || 'Kịch bản chưa hợp lệ.';
    }
  }
  return 'Không thể hoàn tất thao tác kịch bản.';
}
