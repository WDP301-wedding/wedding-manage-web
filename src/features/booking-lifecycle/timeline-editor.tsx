'use client';

import { useState } from 'react';

import type { TimelineItemInput } from './booking-api';

type Draft = Readonly<{
  key: string;
  itemId?: string;
  startTime: string;
  title: string;
  description: string;
}>;

export function TimelineEditor({
  disabled,
  initialItems,
  needsReason = false,
  onSave,
}: Readonly<{
  disabled: boolean;
  initialItems: readonly Readonly<{
    itemId: string;
    startTime: string;
    title: string;
    description: string | null;
  }>[];
  needsReason?: boolean;
  onSave: (items: readonly TimelineItemInput[], reason: string) => Promise<void>;
}>) {
  const [drafts, setDrafts] = useState<readonly Draft[]>(() =>
    initialItems.map((item) => ({
      ...item,
      key: item.itemId,
      description: item.description ?? '',
    })),
  );
  const [reason, setReason] = useState('');
  const update = (key: string, change: Partial<Draft>) =>
    setDrafts((current) =>
      current.map((item) => (item.key === key ? { ...item, ...change } : item)),
    );
  const move = (index: number, direction: number) => {
    setDrafts((current) => {
      const next = [...current];
      const destination = index + direction;
      if (destination < 0 || destination >= next.length) return current;
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
  };

  return (
    <form
      className="timeline-editor"
      onSubmit={(event) => {
        event.preventDefault();
        const items = drafts.map((item, order) => ({
          ...(item.itemId ? { itemId: item.itemId } : {}),
          order,
          startTime: item.startTime,
          title: item.title,
          ...(item.description.trim() ? { description: item.description } : {}),
        }));
        void onSave(items, reason);
      }}
    >
      <fieldset disabled={disabled}>
        <legend>Chỉnh sửa các mốc chương trình</legend>
        {drafts.length === 0 ? <p>Chưa có mốc. Thêm nội dung hoặc lưu bản nháp trống.</p> : null}
        {drafts.map((item, index) => (
          <div className="timeline-editor-item" key={item.key}>
            <strong>Mốc {index + 1}</strong>
            <label>
              Giờ bắt đầu mốc {index + 1}
              <input
                type="time"
                required
                value={item.startTime}
                onChange={(event) => update(item.key, { startTime: event.target.value })}
              />
            </label>
            <label>
              Nội dung mốc {index + 1}
              <input
                required
                maxLength={120}
                value={item.title}
                onChange={(event) => update(item.key, { title: event.target.value })}
              />
            </label>
            <label>
              Ghi chú mốc {index + 1}
              <textarea
                rows={2}
                maxLength={2000}
                value={item.description}
                onChange={(event) => update(item.key, { description: event.target.value })}
              />
            </label>
            <div className="timeline-editor-actions">
              <button type="button" disabled={index === 0} onClick={() => move(index, -1)}>
                Đưa mốc {index + 1} lên
              </button>
              <button
                type="button"
                disabled={index === drafts.length - 1}
                onClick={() => move(index, 1)}
              >
                Đưa mốc {index + 1} xuống
              </button>
              <button
                type="button"
                onClick={() =>
                  setDrafts((current) => current.filter((row) => row.key !== item.key))
                }
              >
                Xóa mốc {index + 1}
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          disabled={drafts.length >= 100}
          onClick={() =>
            setDrafts((current) => [
              ...current,
              { key: crypto.randomUUID(), startTime: '', title: '', description: '' },
            ])
          }
        >
          Thêm mốc chương trình
        </button>
        {needsReason ? (
          <label>
            Lý do thay đổi
            <textarea
              required
              maxLength={500}
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        ) : null}
        <button type="submit">{needsReason ? 'Gửi yêu cầu thay đổi' : 'Lưu kịch bản mới'}</button>
      </fieldset>
    </form>
  );
}
