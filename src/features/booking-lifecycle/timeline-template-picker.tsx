'use client';

import { useState } from 'react';

import type { CatalogTimeline, TimelineCatalogSnapshot } from '../venue-catalog/catalog-api';
import type { TimelineItemInput } from './booking-api';
import { notify } from '../../design-system/notifications';

export type TimelineTemplateSource = Readonly<{
  load: () => Promise<TimelineCatalogSnapshot>;
  shift: Readonly<{ startTime: string; endTime: string }>;
}>;

type Version = CatalogTimeline['versions'][number];

export function TimelineTemplatePicker({
  disabled,
  source,
  replaceExisting = false,
  onCopy,
}: Readonly<{
  disabled: boolean;
  source: TimelineTemplateSource;
  replaceExisting?: boolean;
  onCopy: (items: readonly TimelineItemInput[]) => void;
}>) {
  const [versions, setVersions] = useState<readonly Version[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [replacement, setReplacement] = useState<readonly TimelineItemInput[] | null>(null);

  const load = async () => {
    if (disabled || loading) return;
    setReplacement(null);
    setLoading(true);
    setVersions(null);
    setSelectedId('');
    try {
      const snapshot = await source.load();
      setVersions(
        snapshot.timelines.flatMap((template) =>
          template.lifecycle === 'ACTIVE'
            ? template.versions.filter(
                (version) =>
                  version.id === template.currentPublishedVersionId &&
                  version.state === 'PUBLISHED',
              )
            : [],
        ),
      );
    } catch (err) {
      notify.error(err, { fallbackMessage: 'Không tải được mẫu kịch bản. Hãy thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  const apply = (items: readonly TimelineItemInput[]) => {
    if (disabled) return;
    onCopy(items);
    setReplacement(null);
    notify.success('Đã nạp mẫu vào bản đang soạn. Lưu kịch bản để ghi nhận thay đổi.');
  };

  const copy = () => {
    if (disabled || loading) return;
    const version = versions?.find((candidate) => candidate.id === selectedId);
    if (version === undefined) return;
    const start = minutes(source.shift.startTime);
    const end = minutes(source.shift.endTime);
    if (version.items.some((item) => item.offsetMinutes < 0 || start + item.offsetMinutes >= end)) {
      notify.warning('Mẫu có mốc nằm ngoài ca tiệc. Hãy chọn mẫu khác hoặc tạo kịch bản trống.');
      return;
    }
    const items = [...version.items].sort((left, right) => left.displayOrder - right.displayOrder);
    const copied = items.map((item, order) => {
      const at = start + item.offsetMinutes;
      return {
        order,
        startTime: `${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`,
        title: item.title,
        ...(item.description === null ? {} : { description: item.description }),
      };
    });
    if (replaceExisting) setReplacement(copied);
    else apply(copied);
  };

  return (
    <div className="timeline-template-picker">
      <p>
        Chọn mẫu đã công bố hoặc tự chỉnh các mốc bên dưới. Đổi mẫu chỉ thay bản đang soạn, chưa lưu
        hay phê duyệt kịch bản.
      </p>
      <button type="button" disabled={disabled || loading} onClick={() => void load()}>
        {replaceExisting ? 'Đổi mẫu kịch bản' : 'Tải mẫu kịch bản'}
      </button>
      {loading ? <p role="status">Đang tải mẫu kịch bản…</p> : null}
      {versions === null ? null : versions.length === 0 ? (
        <p role="status">Chưa có mẫu kịch bản đang công bố.</p>
      ) : (
        <>
          <label>
            Mẫu kịch bản đã công bố
            <select
              disabled={disabled || loading}
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setReplacement(null);
              }}
            >
              <option value="">Chọn mẫu kịch bản</option>
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name} · phiên bản {version.versionNumber}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={disabled || loading || selectedId === ''} onClick={copy}>
            Dùng mẫu này
          </button>
        </>
      )}
      {replacement !== null ? (
        <div
          className="timeline-template-confirmation"
          role="group"
          aria-label="Xác nhận đổi mẫu kịch bản"
        >
          <p role="alert">
            Thay toàn bộ mốc đang soạn bằng mẫu đã chọn? Các chỉnh sửa chưa lưu sẽ được thay thế.
            Kịch bản đã lưu vẫn được giữ cho đến khi bạn lưu bản mới.
          </p>
          <div className="timeline-editor-actions">
            <button
              type="button"
              disabled={disabled || loading}
              onClick={() => setReplacement(null)}
            >
              Giữ bản đang soạn
            </button>
            <button type="button" disabled={disabled || loading} onClick={() => apply(replacement)}>
              Xác nhận thay các mốc
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function minutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}
