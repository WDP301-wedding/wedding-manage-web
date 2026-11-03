'use client';

import { useState } from 'react';
import type { CatalogDish, CatalogMenu } from './catalog-api';
import { cx } from './catalog-classes';
import { formatVnd, type DishVersion, type MenuVersion } from './food-catalog-shared';

function VersionContent({ version }: Readonly<{ version: DishVersion | MenuVersion }>) {
  const isMenu = 'priceVndPerTable' in version;
  const price = isMenu ? version.priceVndPerTable : version.priceVnd;
  return (
    <div className="flex min-w-0 flex-col gap-3 text-sm break-words">
      <p className="font-semibold">{version.name}</p>
      <p>{version.description || 'Chưa có mô tả.'}</p>
      <p className="font-semibold text-primary">
        {price === null ? 'Chưa niêm yết giá' : formatVnd(price)}
        {isMenu ? ' / bàn' : ''}
      </p>
      {!isMenu && <p>Nhóm món: {version.categoryLabel}</p>}
      {version.publishedAt && (
        <p className="text-xs text-muted-foreground">
          Công bố:{' '}
          {new Date(version.publishedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
        </p>
      )}
      {isMenu && (
        <>
          <h3 className="font-semibold">Các món trong thực đơn ({version.items.length})</h3>
          <ol className="flex flex-col divide-y divide-border">
            {[...version.items]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((item, index) => (
                <li key={item.dishVersionId} className="flex gap-3 py-3">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  <div className="min-w-0">
                    <p className="font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.categoryLabel} · phiên bản {item.dishVersionNumber}
                    </p>
                    <p className="mt-1">{item.description || 'Chưa có mô tả.'}</p>
                  </div>
                </li>
              ))}
          </ol>
        </>
      )}
    </div>
  );
}

export function FoodRecordDetails({ record }: Readonly<{ record: CatalogDish | CatalogMenu }>) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const current = record.versions.find(({ id }) => id === record.currentPublishedVersionId);
  const draft = record.versions.find(({ id }) => id === record.draftVersionId);
  const history = record.versions
    .filter(({ state }) => state === 'SUPERSEDED')
    .sort((a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0));
  const selected = history.find(({ id }) => id === selectedId);
  return (
    <>
      <p className="text-sm">
        Trạng thái:{' '}
        {record.lifecycle === 'RETIRED' ? 'Đã ngừng' : current ? 'Đang hoạt động' : 'Chưa công bố'}
      </p>
      <section aria-label="Bản đang công bố" className="flex flex-col gap-3">
        <h3 className="font-semibold">
          {current
            ? `${record.lifecycle === 'RETIRED' ? 'Bản công bố gần nhất' : 'Bản đang công bố'} · v${current.versionNumber}`
            : 'Chưa có bản công bố'}
        </h3>
        {current && <VersionContent version={current} />}
      </section>
      {draft && (
        <section
          aria-label="Bản nháp"
          className="flex flex-col gap-3 rounded-lg border border-border p-4"
        >
          <h3 className="font-semibold">Bản nháp · chưa công bố</h3>
          <VersionContent version={draft} />
        </section>
      )}
      <section
        aria-label="Lịch sử phiên bản"
        className="flex flex-col gap-3 border-t border-border pt-4"
      >
        <h3 className="font-semibold">Lịch sử phiên bản ({history.length})</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có phiên bản trước đây.</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((version) => (
              <li
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <span className="min-w-0 text-sm break-words">
                  v{version.versionNumber} · {version.name}
                </span>
                <button
                  type="button"
                  className={cx.secondaryButton}
                  aria-label={`Chi tiết phiên bản ${version.versionNumber}`}
                  aria-expanded={selectedId === version.id}
                  onClick={() => setSelectedId(selectedId === version.id ? null : version.id)}
                >
                  Chi tiết
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected && (
          <section
            aria-label={`Chi tiết phiên bản ${selected.versionNumber}`}
            className="rounded-lg border border-border p-4"
          >
            <h3 className="mb-3 font-semibold">Phiên bản {selected.versionNumber} · đã thay thế</h3>
            <VersionContent version={selected} />
          </section>
        )}
      </section>
    </>
  );
}
