'use client';

import type { CatalogHall } from './catalog-types';
import { HallForm, SectionHeading, Status } from './catalog-forms';

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
    <section className="catalog-section" aria-labelledby="hall-title">
      <div className="catalog-section-toolbar">
        <SectionHeading eyebrow={`${halls.length} bản ghi`} title="Danh sách sảnh" />
        <div className="catalog-toolbar-actions">
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
            className="catalog-primary-button"
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
        <p className="catalog-empty">Không có sảnh phù hợp bộ lọc hiện tại.</p>
      ) : (
        <div className="catalog-table-scroll">
          <table className="catalog-table">
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
                    <div className="catalog-row-actions">
                      <button
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
