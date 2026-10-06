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

type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;
type TimelineVersion = CatalogTimeline['versions'][number];

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

function TimelineDraft({
  gateway,
  pending,
  run,
  version,
}: Readonly<{
  gateway: CatalogGateway;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  version: TimelineVersion;
}>) {
  const [items, setItems] = useState<TimelineItemWrite[]>(() => normalizeItems(version.items));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run('Đã lưu kịch bản nháp.', (token) =>
      gateway.updateTimelineDraft(token, {
        versionId: version.id,
        expectedRevision: version.revision,
        name: text(data, 'name'),
        description: text(data, 'description'),
        items: normalizeItems(items),
      }),
    );
  };
  return (
    <form
      className="timeline-editor timeline-draft"
      aria-label={`Bản nháp ${version.name}`}
      onSubmit={submit}
    >
      <div className="timeline-editor-heading">
        <div>
          <p className="section-kicker">Bản nháp · revision {version.revision}</p>
          <h3>{version.name}</h3>
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
        <TimelineTextField label="Tên bản nháp" name="name" defaultValue={version.name} />
        <TimelineTextField
          label="Mô tả bản nháp"
          name="description"
          defaultValue={version.description}
        />
      </div>
      <TimelineItemsEditor items={items} onChange={setItems} />
      <div className="catalog-form-actions timeline-actions">
        <button className="catalog-secondary-button" type="submit" disabled={pending}>
          Lưu kịch bản nháp
        </button>
        <button
          className="catalog-primary-button"
          type="button"
          disabled={pending}
          onClick={() =>
            void run('Đã công bố kịch bản.', (token) =>
              gateway.publishTimeline(token, {
                versionId: version.id,
                expectedRevision: version.revision,
              }),
            )
          }
        >
          Công bố kịch bản
        </button>
      </div>
    </form>
  );
}

function TimelineItemsEditor({
  items,
  onChange,
}: Readonly<{
  items: readonly TimelineItemWrite[];
  onChange: (items: TimelineItemWrite[]) => void;
}>) {
  const update = (index: number, patch: Partial<TimelineItemWrite>) =>
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  return (
    <ol className="timeline-items" aria-label="Các mục kịch bản theo thứ tự">
      {items.map((item, index) => (
        <li key={item.id}>
          <div className="timeline-item-order">
            <strong>{String(index + 1).padStart(2, '0')}</strong>
            <button
              type="button"
              aria-label={`Đưa ${item.title || `mục ${index + 1}`} lên`}
              disabled={index === 0}
              onClick={() => onChange(move(items, index, index - 1))}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Đưa ${item.title || `mục ${index + 1}`} xuống`}
              disabled={index === items.length - 1}
              onClick={() => onChange(move(items, index, index + 1))}
            >
              ↓
            </button>
          </div>
          <div className="timeline-item-fields">
            <label>
              Tiêu đề mục {index + 1}
              <input
                value={item.title}
                required
                maxLength={120}
                onChange={(event) => update(index, { title: event.currentTarget.value })}
              />
            </label>
            <label>
              Bắt đầu sau (phút)
              <input
                aria-label={`Bắt đầu mục ${index + 1} sau phút`}
                type="number"
                min={0}
                max={1440}
                step={1}
                value={item.offsetMinutes}
                onChange={(event) =>
                  update(index, { offsetMinutes: Number(event.currentTarget.value) })
                }
              />
            </label>
            <label>
              Thời lượng (phút)
              <input
                aria-label={`Thời lượng mục ${index + 1}`}
                type="number"
                min={1}
                max={1440}
                step={1}
                value={item.durationMinutes ?? ''}
                onChange={(event) =>
                  update(index, {
                    durationMinutes:
                      event.currentTarget.value === '' ? null : Number(event.currentTarget.value),
                  })
                }
              />
            </label>
            <label className="timeline-description-field">
              Mô tả mục {index + 1}
              <input
                value={item.description ?? ''}
                maxLength={2000}
                onChange={(event) =>
                  update(index, { description: event.currentTarget.value || null })
                }
              />
            </label>
          </div>
          <button
            className="timeline-remove-button"
            type="button"
            aria-label={`Xóa ${item.title || `mục ${index + 1}`}`}
            disabled={items.length === 1}
            onClick={() => onChange(items.filter(({ id }) => id !== item.id))}
          >
            Xóa
          </button>
        </li>
      ))}
    </ol>
  );
}

function TimelineHistoryVersion({
  canClone,
  gateway,
  pending,
  run,
  templateId,
  version,
}: Readonly<{
  canClone: boolean;
  gateway: CatalogGateway;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  templateId: string;
  version: TimelineVersion;
}>) {
  return (
    <div className="timeline-history-version">
      <div>
        <span className="catalog-version-state">
          {version.state === 'PUBLISHED' ? 'Đã công bố' : 'Đã thay thế'} · v
          {version.versionNumber ?? '—'}
        </span>
        <strong>{version.name}</strong>
        <small>{version.items.length} mục · chỉ đọc</small>
      </div>
      {canClone ? (
        <button
          className="catalog-secondary-button"
          type="button"
          disabled={pending}
          aria-label={`Nhân bản phiên bản ${version.versionNumber ?? ''}`}
          onClick={() =>
            void run('Đã nhân bản kịch bản thành bản nháp.', (token) =>
              gateway.cloneTimeline(token, {
                templateId,
                sourceVersionId: version.id,
                versionId: crypto.randomUUID(),
              }),
            )
          }
        >
          Nhân bản
        </button>
      ) : null}
    </div>
  );
}

function TimelineTextField({
  defaultValue,
  label,
  name,
}: Readonly<{ defaultValue?: string; label: string; name: string }>) {
  const id = `timeline-${name}-${label.replaceAll(/\s+/gu, '-').toLocaleLowerCase('vi-VN')}`;
  return (
    <div className="catalog-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} defaultValue={defaultValue} required />
    </div>
  );
}

function newTimelineItem(offsetMinutes: number): TimelineItemWrite {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: null,
    offsetMinutes,
    durationMinutes: null,
    displayOrder: 1,
  };
}

function normalizeItems(items: readonly TimelineItemWrite[]): TimelineItemWrite[] {
  return items.map((item, index) => ({ ...item, displayOrder: index + 1 }));
}

function move<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
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
