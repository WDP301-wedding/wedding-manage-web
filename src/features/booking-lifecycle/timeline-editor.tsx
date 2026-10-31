'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import type { TimelineItemInput } from './booking-api';
import { TimelineTemplatePicker, type TimelineTemplateSource } from './timeline-template-picker';

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
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
        <legend className="mb-3 text-base font-semibold">Chỉnh sửa các mốc chương trình</legend>
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
        {drafts.length === 0 ? (
          <p className="text-muted-foreground">
            Chưa có mốc. Thêm nội dung hoặc lưu bản nháp trống.
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          {drafts.map((item, index) => (
            <div
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
              key={item.key}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="min-w-8 rounded-full bg-secondary px-2 py-0.5 text-center text-2xs font-semibold text-muted-foreground"
                  aria-hidden="true"
                >
                  #{index + 1}
                </span>
                <strong className="sr-only">Mốc {index + 1}</strong>
                <label className="shrink-0">
                  <span className="sr-only">Giờ bắt đầu mốc {index + 1}</span>
                  <Input
                    type="time"
                    required
                    className="w-36 tabular-nums"
                    aria-label={`Giờ bắt đầu mốc ${index + 1}`}
                    value={item.startTime}
                    onChange={(event) => update(item.key, { startTime: event.target.value })}
                  />
                </label>
                <label className="min-w-40 flex-1">
                  <span className="sr-only">Nội dung mốc {index + 1}</span>
                  <Input
                    required
                    maxLength={120}
                    aria-label={`Nội dung mốc ${index + 1}`}
                    placeholder={`Nội dung mốc ${index + 1}...`}
                    value={item.title}
                    onChange={(event) => update(item.key, { title: event.target.value })}
                  />
                </label>
                <div className="flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    title={`Đưa mốc ${index + 1} lên`}
                    aria-label={`Đưa mốc ${index + 1} lên`}
                  >
                    <ChevronUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === drafts.length - 1}
                    onClick={() => move(index, 1)}
                    title={`Đưa mốc ${index + 1} xuống`}
                    aria-label={`Đưa mốc ${index + 1} xuống`}
                  >
                    <ChevronDown aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-hy-error hover:bg-hy-error-bg"
                    onClick={() =>
                      setDrafts((current) => current.filter((row) => row.key !== item.key))
                    }
                    title={`Xóa mốc ${index + 1}`}
                    aria-label={`Xóa mốc ${index + 1}`}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </div>
              <label className="sm:pl-10">
                <span className="sr-only">Ghi chú mốc {index + 1}</span>
                <Textarea
                  rows={1}
                  maxLength={2000}
                  className="min-h-10 bg-muted text-xs"
                  aria-label={`Ghi chú mốc ${index + 1}`}
                  placeholder="Ghi chú chi tiết (nếu có)"
                  value={item.description}
                  onChange={(event) => update(item.key, { description: event.target.value })}
                />
              </label>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed bg-transparent"
          disabled={drafts.length >= 100}
          onClick={() =>
            setDrafts((current) => [
              ...current,
              { key: crypto.randomUUID(), startTime: '', title: '', description: '' },
            ])
          }
        >
          <Plus aria-hidden />
          <span>Thêm mốc chương trình</span>
        </Button>
        {needsReason ? (
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Lý do thay đổi
            <Textarea
              className="font-normal"
              required
              maxLength={500}
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button type="submit">{needsReason ? 'Gửi yêu cầu thay đổi' : 'Lưu kịch bản mới'}</Button>
          {onCancel ? (
            <Button type="button" variant="outline" disabled={disabled} onClick={onCancel}>
              Hủy
            </Button>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}
