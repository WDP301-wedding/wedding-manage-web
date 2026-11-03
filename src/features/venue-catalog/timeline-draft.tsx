'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import type { CatalogGateway, CatalogTimeline, TimelineItemWrite } from './catalog-api';

import { cx } from './catalog-classes';
import { cn } from 'cn';
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
    <div className={cx.field}>
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const update = (index: number, patch: Partial<TimelineItemWrite>) =>
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));

  const handleDragStart = (event: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    onChange(move(items, draggedIndex, targetIndex));
    setDraggedIndex(null);
  };

  const roleTags = ['MC', 'Âm thanh', 'Ánh sáng', 'Bếp & Phục vụ', 'Khánh tiết'] as const;

  return (
    <ol className={cx.timelineItems} aria-label="Các mục kịch bản theo thứ tự">
      {items.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={(event) => handleDragStart(event, index)}
          onDragOver={handleDragOver}
          onDrop={(event) => handleDrop(event, index)}
          onDragEnd={() => setDraggedIndex(null)}
          className={cn(
            draggedIndex === index && 'opacity-50 border-dashed border-primary',
          )}
        >
          <div className={cn(cx.timelineItemOrder, 'cursor-grab active:cursor-grabbing')}>
            <strong>{String(index + 1).padStart(2, '0')}</strong>
            <button
              type="button"
              className={cx.orderButton}
              aria-label={`Đưa ${item.title || `mục ${index + 1}`} lên`}
              disabled={index === 0}
              onClick={() => onChange(move(items, index, index - 1))}
            >
              <ArrowUp aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              className={cx.orderButton}
              aria-label={`Đưa ${item.title || `mục ${index + 1}`} xuống`}
              disabled={index === items.length - 1}
              onClick={() => onChange(move(items, index, index + 1))}
            >
              <ArrowDown aria-hidden className="size-4" />
            </button>
          </div>
          <div className={cx.timelineItemFields}>
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
            <label className={cx.timelineDescriptionField}>
              Mô tả mục {index + 1}
              <input
                value={item.description ?? ''}
                maxLength={2000}
                onChange={(event) =>
                  update(index, { description: event.currentTarget.value || null })
                }
              />
              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
                <span>Gợi ý vai trò:</span>
                {roleTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => {
                      const prefix = `[${tag}] `;
                      const desc = item.description ?? '';
                      if (!desc.includes(prefix)) {
                        update(index, { description: prefix + desc });
                      }
                    }}
                  >
                    +{tag}
                  </button>
                ))}
              </span>
            </label>
          </div>
          <button
            className={cx.timelineRemoveButton}
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
      className={cn(cx.timelineEditor, cx.timelineDraft)}
      aria-label={`Bản nháp ${version.name}`}
      onSubmit={submit}
    >
      <div className={cx.timelineEditorHeading}>
        <div>
          <h3>{version.name}</h3>
          <p className={cx.help}>Bản nháp, phiên bản {version.revision}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={cx.secondaryButton}
            type="button"
            onClick={() => {
              const standardWeddingPreset: TimelineItemWrite[] = [
                {
                  id: crypto.randomUUID(),
                  title: 'Đón khách & Chụp ảnh lưu niệm',
                  description: '[Lễ tân] Hướng dẫn khách ký tên và vào sảnh',
                  offsetMinutes: 0,
                  durationMinutes: 45,
                  displayOrder: 1,
                },
                {
                  id: crypto.randomUUID(),
                  title: 'Ổn định sảnh tiệc & Chiếu clip cưới',
                  description: '[MC] [Âm thanh] Mời khách vào bàn, chiếu phóng sự',
                  offsetMinutes: 45,
                  durationMinutes: 15,
                  displayOrder: 2,
                },
                {
                  id: crypto.randomUUID(),
                  title: 'Khai mạc & Nghi thức Lễ cưới',
                  description: '[MC] Giới thiệu hai bên gia đình và cô dâu chú rể',
                  offsetMinutes: 60,
                  durationMinutes: 15,
                  displayOrder: 3,
                },
                {
                  id: crypto.randomUUID(),
                  title: 'Cắt bánh cưới & Khui champagne',
                  description: '[Khánh tiết] Nghi thức cắt bánh và rót rượu chúc mừng',
                  offsetMinutes: 75,
                  durationMinutes: 15,
                  displayOrder: 4,
                },
                {
                  id: crypto.randomUUID(),
                  title: 'Chúc rượu & Khai tiệc ẩm thực',
                  description: '[Bếp & Phục vụ] Toàn thể nâng ly, lên món khai vị',
                  offsetMinutes: 90,
                  durationMinutes: 15,
                  displayOrder: 5,
                },
                {
                  id: crypto.randomUUID(),
                  title: 'Giao lưu âm nhạc & Đi bàn chúc mừng',
                  description: '[Âm thanh] Ban nhạc biểu diễn, chụp hình tại từng bàn',
                  offsetMinutes: 105,
                  durationMinutes: 60,
                  displayOrder: 6,
                },
                {
                  id: crypto.randomUUID(),
                  title: 'Tiễn khách & Trao quà cảm ơn',
                  description: '[Lễ tân] Tiễn khách tại sảnh đón và gửi quà lưu niệm',
                  offsetMinutes: 165,
                  durationMinutes: 30,
                  displayOrder: 7,
                },
              ];
              setItems(standardWeddingPreset);
            }}
          >
            Nạp mẫu chuẩn tiệc cưới
          </button>
          <button
            className={cx.secondaryButton}
            type="button"
            onClick={() => setItems([...items, newTimelineItem(items.length * 15)])}
          >
            Thêm mục
          </button>
        </div>
      </div>
      <div className={cx.formGrid}>
        <TimelineTextField label="Tên bản nháp" name="name" defaultValue={version.name} />
        <TimelineTextField
          label="Mô tả bản nháp"
          name="description"
          defaultValue={version.description}
        />
      </div>
      <TimelineItemsEditor items={items} onChange={setItems} />
      <div className={cn(cx.formActions, cx.timelineActions)}>
        <button className={cx.secondaryButton} type="submit" disabled={pending}>
          Lưu kịch bản nháp
        </button>
        <button
          className={cx.primaryButton}
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
    <div className={cx.timelineHistoryVersion}>
      <div>
        <span className={cx.versionState}>
          {version.state === 'PUBLISHED' ? 'Đã công bố' : 'Đã thay thế'} · v
          {version.versionNumber ?? '—'}
        </span>
        <strong>{version.name}</strong>
        <small>{version.items.length} mục · chỉ đọc</small>
      </div>
      {canClone ? (
        <button
          className={cx.secondaryButton}
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
