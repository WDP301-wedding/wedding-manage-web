'use client';

import type { CatalogHall } from './catalog-types';
import { HallForm, SectionHeading, Status } from './catalog-forms';

import { cx } from './catalog-classes';
export function VenueHallsSection({
  halls,
  hallFilter,
  setHallFilter,
  creatingHall,
  setCreatingHall,
  editingHall,
  setEditingHall,
  pending,
  onSaveHall,
  onToggleLifecycle,
}: Readonly<{
  halls: readonly CatalogHall[];
  hallFilter: 'ALL' | 'ACTIVE' | 'RETIRED';
  setHallFilter: (filter: 'ALL' | 'ACTIVE' | 'RETIRED') => void;
  creatingHall: boolean;
  setCreatingHall: (creating: boolean) => void;
  editingHall: CatalogHall | null;
  setEditingHall: (hall: CatalogHall | null) => void;
  pending: boolean;
  onSaveHall: (input: {
    name: string;
    maxGuests: number;
    description?: string;
    displayOrder?: number;
  }) => Promise<void>;
  onToggleLifecycle: (hall: CatalogHall) => void;
}>) {
  const filteredHalls = halls.filter(
    ({ lifecycle }) => hallFilter === 'ALL' || lifecycle === hallFilter,
  );

  return (
    <section className={cx.section} aria-labelledby="hall-title">
      <div className={cx.sectionToolbar}>
        <SectionHeading meta={`${halls.length} bản ghi`} title="Danh sách sảnh" />
        <div className={cx.toolbarActions}>
          <label>
            Lọc trạng thái sảnh
            <select
              value={hallFilter}
              onChange={(event) => setHallFilter(event.currentTarget.value as typeof hallFilter)}
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="RETIRED">Đã ngừng</option>
            </select>
          </label>
          <button
            className={cx.primaryButton}
            type="button"
            onClick={() => {
              setEditingHall(null);
              setCreatingHall(true);
            }}
          >
            Thêm sảnh
          </button>
        </div>
      </div>

      {filteredHalls.length === 0 ? (
        <p className={cx.empty}>Không có sảnh phù hợp bộ lọc hiện tại.</p>
      ) : (
        <div className={cx.tableScroll}>
          <table className={cx.table}>
            <caption className="sr-only">Danh sách sảnh theo trạng thái</caption>
            <thead>
              <tr>
                <th scope="col">Sảnh</th>
                <th scope="col">Sức chứa</th>
                <th scope="col">Thứ tự</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredHalls.map((hall) => (
                <tr key={hall.id}>
                  <td>
                    <strong>{hall.name}</strong>
                    <span>{hall.description || 'Chưa có mô tả'}</span>
                  </td>
                  <td>{hall.maxGuests.toLocaleString('vi-VN')} khách</td>
                  <td>{hall.displayOrder}</td>
                  <td>
                    <Status lifecycle={hall.lifecycle} />
                  </td>
                  <td>
                    <div className={cx.rowActions}>
                      <button
                        className={cx.secondaryButton}
                        type="button"
                        onClick={() => {
                          setCreatingHall(false);
                          setEditingHall(hall);
                        }}
                        aria-label={`Chỉnh sửa ${hall.name}`}
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        className={cx.dangerButton}
                        type="button"
                        disabled={pending}
                        onClick={() => onToggleLifecycle(hall)}
                      >
                        {hall.lifecycle === 'ACTIVE' ? 'Ngừng hoạt động' : 'Khôi phục'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creatingHall || editingHall !== null ? (
        <HallForm
          hall={editingHall}
          pending={pending}
          onCancel={() => {
            setCreatingHall(false);
            setEditingHall(null);
          }}
          onSubmit={onSaveHall}
        />
      ) : null}
    </section>
  );
}
