'use client';

import { type FormEvent, useState } from 'react';
import type { CatalogGateway, CatalogTimeline, TimelineItemWrite } from './catalog-api';

export type TimelineVersion = CatalogTimeline['versions'][number];

export function newTimelineItem(offsetMinutes: number): TimelineItemWrite {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: null,
    offsetMinutes,
    durationMinutes: null,
    displayOrder: 1,
  };
}

export function normalizeItems(items: readonly TimelineItemWrite[]): TimelineItemWrite[] {
  return items.map((item, index) => ({ ...item, displayOrder: index + 1 }));
}

export function move<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

export function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function TimelineTextField({
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

export function TimelineItemsEditor({
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

export function TimelineDraft({
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

export function TimelineHistoryVersion({
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
