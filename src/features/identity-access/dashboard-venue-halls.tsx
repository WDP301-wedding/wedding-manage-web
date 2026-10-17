'use client';

import Link from 'next/link';
import type { PublicHall } from '../../services/catalog.service';

export function DashboardVenueHalls({
  halls,
  isManager = false,
}: Readonly<{
  halls: readonly PublicHall[];
  isManager?: boolean;
}>) {
  return (
    <section className="schedule-panel dashboard-schedule" id="available-halls">
      <div className="section-heading">
        <div>
          <p className="section-kicker" style={{ color: 'var(--hy-wine)' }}>
            Không gian tiệc
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--hy-ink)' }}>
            Danh mục sảnh cưới khả dụng ({halls.length})
          </h2>
        </div>
        {isManager ? (
          <Link
            className="text-button"
            href="/catalog"
            style={{ color: 'var(--hy-wine)', fontWeight: 600 }}
          >
            Quản lý danh mục →
          </Link>
        ) : null}
      </div>

      {halls.length === 0 ? (
        <div
          className="booking-empty"
          style={{
            padding: '2.5rem 1rem',
            textAlign: 'center',
            background: 'var(--hy-surface)',
            borderRadius: 'var(--hy-radius-md)',
            border: '1px dashed var(--hy-outline)',
            color: 'var(--hy-ink-muted)',
          }}
        >
          <p style={{ margin: 0 }}>Không có sảnh cưới nào đang mở trong hệ thống.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table
            aria-label="Danh mục sảnh tiệc"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'var(--hy-surface)',
              borderRadius: 'var(--hy-radius-md)',
              border: '1px solid var(--hy-outline)',
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'var(--hy-surface-container)',
                  borderBottom: '1px solid var(--hy-outline)',
                }}
              >
                <th
                  scope="col"
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    color: 'var(--hy-ink-muted)',
                    fontWeight: 600,
                  }}
                >
                  Tên sảnh
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    color: 'var(--hy-ink-muted)',
                    fontWeight: 600,
                  }}
                >
                  Sức chứa tối đa
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    color: 'var(--hy-ink-muted)',
                    fontWeight: 600,
                  }}
                >
                  Trạng thái hoạt động
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    color: 'var(--hy-ink-muted)',
                    fontWeight: 600,
                  }}
                >
                  Mô tả
                </th>
              </tr>
            </thead>
            <tbody>
              {halls.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--hy-outline)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--hy-ink)' }}>
                    {h.name}
                  </td>
                  <td
                    style={{
                      padding: '0.75rem 1rem',
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--hy-ink)',
                    }}
                  >
                    {h.maxGuests} khách
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      className="status status-ready"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: 'var(--hy-radius-sm)',
                        background: 'var(--hy-success-bg)',
                        color: 'var(--hy-success)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                      }}
                    >
                      Đang hoạt động
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '0.75rem 1rem',
                      maxWidth: '300px',
                      color: 'var(--hy-ink-muted)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {h.description || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
