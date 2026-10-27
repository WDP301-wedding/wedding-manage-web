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
  onCopy,
}: Readonly<{
  disabled: boolean;
  source: TimelineTemplateSource;
  onCopy: (items: readonly TimelineItemInput[]) => void;
}>) {
  const [versions, setVersions] = useState<readonly Version[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
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

  const copy = () => {
    const version = versions?.find((candidate) => candidate.id === selectedId);
    if (version === undefined) return;
    const start = minutes(source.shift.startTime);
    const end = minutes(source.shift.endTime);
    if (version.items.some((item) => item.offsetMinutes < 0 || start + item.offsetMinutes >= end)) {
      notify.warning('Mẫu có mốc nằm ngoài ca tiệc. Hãy chọn mẫu khác hoặc tạo kịch bản trống.');
      return;
    }
    const items = [...version.items].sort((left, right) => left.displayOrder - right.displayOrder);
    onCopy(
      items.map((item, order) => {
        const at = start + item.offsetMinutes;
        return {
          order,
          startTime: `${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`,
          title: item.title,
          ...(item.description === null ? {} : { description: item.description }),
        };
      }),
    );
    notify.success('Đã nạp mốc kịch bản từ mẫu.');
  };

  return (
    <div className="timeline-template-picker">
      <p>Bắt đầu từ mẫu đã công bố hoặc tự thêm các mốc bên dưới.</p>
      <button type="button" disabled={disabled || loading} onClick={() => void load()}>
        Tải mẫu kịch bản
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
              onChange={(event) => setSelectedId(event.target.value)}
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
    </div>
  );
}

function minutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}
