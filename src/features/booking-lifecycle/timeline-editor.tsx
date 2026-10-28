'use client';

import { useState } from 'react';

import type { TimelineItemInput } from './booking-api';
import { TimelineTemplatePicker, type TimelineTemplateSource } from './timeline-template-picker';

function ArrowUpIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

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
  templateSource,
  onSave,
  onCancel,
}: Readonly<{
  disabled: boolean;
  initialItems: readonly Readonly<{
    itemId: string;
    startTime: string;
    title: string;
    description: string | null;
  }>[];
  needsReason?: boolean;
  templateSource?: TimelineTemplateSource;
  onSave: (items: readonly TimelineItemInput[], reason: string) => Promise<void>;
  onCancel?: () => void;
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
        {templateSource !== undefined ? (
          <TimelineTemplatePicker
            disabled={disabled}
            source={templateSource}
            replaceExisting={drafts.length > 0}
            onCopy={(items) =>
              setDrafts(
                items.map((item) => ({
                  key: crypto.randomUUID(),
                  startTime: item.startTime,
                  title: item.title,
                  description: item.description ?? '',
                })),
              )
            }
          />
        ) : null}
        {drafts.length === 0 ? <p>Chưa có mốc. Thêm nội dung hoặc lưu bản nháp trống.</p> : null}
        <div className="timeline-editor-items-container">
          {drafts.map((item, index) => (
            <div className="timeline-editor-item" key={item.key}>
              <div className="timeline-editor-item-main-row">
                <span className="timeline-milestone-chip" aria-hidden="true">
                  #{index + 1}
                </span>
                <strong className="visually-hidden">Mốc {index + 1}</strong>
                <div className="timeline-editor-fields-row">
                  <label className="timeline-field-time">
                    <span className="visually-hidden">Giờ bắt đầu mốc {index + 1}</span>
                    <input
                      type="time"
                      required
                      aria-label={`Giờ bắt đầu mốc ${index + 1}`}
                      value={item.startTime}
                      onChange={(event) => update(item.key, { startTime: event.target.value })}
                    />
                  </label>
                  <label className="timeline-field-title">
                    <span className="visually-hidden">Nội dung mốc {index + 1}</span>
                    <input
                      required
                      maxLength={120}
                      aria-label={`Nội dung mốc ${index + 1}`}
                      placeholder={`Nội dung mốc ${index + 1}...`}
                      value={item.title}
                      onChange={(event) => update(item.key, { title: event.target.value })}
                    />
                  </label>
                </div>
                <div className="timeline-editor-actions timeline-editor-item-actions">
                  <button
                    type="button"
                    className="timeline-action-btn"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    title={`Đưa mốc ${index + 1} lên`}
                    aria-label={`Đưa mốc ${index + 1} lên`}
                  >
                    <ArrowUpIcon />
                    <span className="visually-hidden">Đưa mốc {index + 1} lên</span>
                  </button>
                  <button
                    type="button"
                    className="timeline-action-btn"
                    disabled={index === drafts.length - 1}
                    onClick={() => move(index, 1)}
                    title={`Đưa mốc ${index + 1} xuống`}
                    aria-label={`Đưa mốc ${index + 1} xuống`}
                  >
                    <ArrowDownIcon />
                    <span className="visually-hidden">Đưa mốc ${index + 1} xuống</span>
                  </button>
                  <button
                    type="button"
                    className="timeline-action-btn timeline-action-delete"
                    onClick={() =>
                      setDrafts((current) => current.filter((row) => row.key !== item.key))
                    }
                    title={`Xóa mốc ${index + 1}`}
                    aria-label={`Xóa mốc ${index + 1}`}
                  >
                    <TrashIcon />
                    <span className="visually-hidden">Xóa mốc {index + 1}</span>
                  </button>
                </div>
              </div>
              <div className="timeline-editor-note-row">
                <label className="timeline-field-desc">
                  <span className="visually-hidden">Ghi chú mốc {index + 1}</span>
                  <textarea
                    rows={1}
                    maxLength={2000}
                    aria-label={`Ghi chú mốc ${index + 1}`}
                    placeholder="Ghi chú chi tiết (nếu có)"
                    value={item.description}
                    onChange={(event) => update(item.key, { description: event.target.value })}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="timeline-add-button"
          disabled={drafts.length >= 100}
          onClick={() =>
            setDrafts((current) => [
              ...current,
              { key: crypto.randomUUID(), startTime: '', title: '', description: '' },
            ])
          }
        >
          <PlusIcon />
          <span>Thêm mốc chương trình</span>
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
        <div className="timeline-editor-submit-actions">
          <button type="submit">{needsReason ? 'Gửi yêu cầu thay đổi' : 'Lưu kịch bản mới'}</button>
          {onCancel ? (
            <button
              type="button"
              className="booking-secondary"
              disabled={disabled}
              onClick={onCancel}
            >
              Hủy
            </button>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}
