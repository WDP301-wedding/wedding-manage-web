'use client';

import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import type {
  CatalogGateway,
  CatalogTimeline,
  TimelineCatalogSnapshot,
  TimelineItemWrite,
  TimelineWrite,
} from './catalog-api';
import type { Authorize } from './catalog-types';
import {
  move,
  newTimelineItem,
  normalizeItems,
  text,
  TimelineDraft,
  TimelineHistoryVersion,
  TimelineItemsEditor,
  TimelineTextField,
  type TimelineVersion,
} from './timeline-draft';

export {
  TimelineDraft,
  TimelineHistoryVersion,
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSnapshot(await authorize((token) => gateway.loadTimelines(token)));
      setError(null);
    } catch (caught) {
      setError(timelineError(caught));
    }
  }, [authorize, gateway]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const run = async (success: string, operation: (token: string) => Promise<void>) => {
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      await authorize(operation);
      setMessage(success);
      await load();
      return true;
    } catch (caught) {
      setError(timelineError(caught));
      return false;
    } finally {
      setPending(false);
    }
  };

  if (snapshot === null) {
    return (
      <section className="catalog-section" aria-labelledby="timeline-title">
        <TimelineHeading />
        <p className={error === null ? 'catalog-empty' : 'catalog-error'} role="status">
          {error ?? 'Đang tải kịch bản tiệc…'}
        </p>
      </section>
    );
  }

  return (
    <section className="catalog-section" id="timeline" aria-labelledby="timeline-title">
      <TimelineHeading />
      <div className="catalog-panel-messages" aria-live="polite">
        {message === null ? null : (
          <p className="catalog-success" role="status">
            {message}
          </p>
        )}
        {error === null ? null : (
          <p className="catalog-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <NewTimelineForm
        pending={pending}
        onSubmit={(input) =>
          run('Đã tạo bản nháp kịch bản.', (token) =>
            gateway.createTimeline(token, {
              ...input,
              templateId: crypto.randomUUID(),
              versionId: crypto.randomUUID(),
              displayOrder: snapshot.timelines.length,
            }),
          )
        }
      />
      <div className="timeline-list">
        {snapshot.timelines.length === 0 ? (
          <p className="catalog-empty">Chưa có kịch bản tiệc.</p>
        ) : (
          snapshot.timelines.map((timeline) => (
            <TimelineAggregate
              key={timeline.id}
              gateway={gateway}
              pending={pending}
              run={run}
              timeline={timeline}
            />
          ))
        )}
      </div>
    </section>
  );
}

function TimelineHeading() {
  return (
    <div className="catalog-section-heading">
      <p className="section-kicker">Thứ tự theo phút</p>
      <h2 id="timeline-title">Kịch bản tiệc</h2>
    </div>
  );
}

function NewTimelineForm({
  onSubmit,
  pending,
}: Readonly<{ onSubmit: (input: TimelineWrite) => Promise<boolean>; pending: boolean }>) {
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
    <form className="timeline-editor" aria-label="Tạo kịch bản tiệc" onSubmit={submit}>
      <div className="timeline-editor-heading">
        <div>
          <p className="section-kicker">Template mới</p>
          <h3>Tạo kịch bản</h3>
        </div>
        <button
          className="catalog-secondary-button"
          type="button"
          onClick={() => setItems([...items, newTimelineItem(items.length * 15)])}
        >
          Thêm mục
        </button>
      </div>
      <div className="catalog-form-grid">
        <TimelineTextField label="Tên kịch bản" name="name" />
        <TimelineTextField label="Mô tả kịch bản" name="description" />
      </div>
      <TimelineItemsEditor items={items} onChange={setItems} />
      <div className="catalog-form-actions timeline-actions">
        <button className="catalog-primary-button" type="submit" disabled={pending}>
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
  const label =
    timeline.versions.find(({ id }) => id === timeline.currentPublishedVersionId)?.name ??
    timeline.versions[0]?.name ??
    'Kịch bản chưa đặt tên';
  return (
    <article className="timeline-aggregate">
      <header className="catalog-aggregate-header">
        <div>
          <span
            className={`status ${timeline.lifecycle === 'ACTIVE' ? 'status-ready' : 'status-retired'}`}
          >
            {timeline.lifecycle === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngừng'}
          </span>
          <h4>{label}</h4>
        </div>
        <button
          type="button"
          onClick={() =>
            void run('Đã cập nhật trạng thái kịch bản.', (token) =>
              gateway.changeTimelineLifecycle(token, {
                id: timeline.id,
                expectedRevision: timeline.revision,
                transition: timeline.lifecycle === 'ACTIVE' ? 'RETIRE' : 'RESTORE',
              }),
            )
          }
        >
          {timeline.lifecycle === 'ACTIVE' ? 'Ngừng' : 'Khôi phục'}
        </button>
      </header>
      <div className="catalog-history" role="region" aria-label={`Lịch sử ${label}`}>
        {timeline.versions.map((version) =>
          version.state === 'DRAFT' ? (
            <TimelineDraft
              key={version.id}
              gateway={gateway}
              pending={pending}
              run={run}
              version={version}
            />
          ) : (
            <TimelineHistoryVersion
              key={version.id}
              canClone={timeline.draftVersionId === null}
              gateway={gateway}
              pending={pending}
              run={run}
              templateId={timeline.id}
              version={version}
            />
          ),
        )}
      </div>
    </article>
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
