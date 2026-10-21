'use client';

import type { FormEvent } from 'react';
import type { GuestSearchResultItem } from '../../services/staff.service';
import { staffStyles } from './staff.styles';

export interface CheckinDeskSectionProps {
  bookingId: string;
  setBookingId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searching: boolean;
  pending: boolean;
  guests: readonly GuestSearchResultItem[];
  onSearchGuests: (event?: FormEvent) => Promise<void>;
  onCheckIn: (guestId: string) => Promise<void>;
  onUndoCheckIn: (guestId: string) => Promise<void>;
}

export function CheckinDeskSection({
  bookingId,
  setBookingId,
  searchQuery,
  setSearchQuery,
  searching,
  pending,
  guests,
  onSearchGuests,
  onCheckIn,
  onUndoCheckIn,
}: Readonly<CheckinDeskSectionProps>) {
  return (
    <section aria-labelledby="checkin-desk-title">
      <div style={staffStyles.cardBox}>
        <h2 id="checkin-desk-title" style={staffStyles.cardTitle}>
          Bàn đón tiếp &amp; Tra cứu khách mời
        </h2>
        <p style={staffStyles.cardSubtitle}>
          Nhập mã tiệc (bookingId) để tải dữ liệu khách mời. Tra cứu nhanh theo họ tên hoặc số điện
          thoại.
        </p>

        <form onSubmit={onSearchGuests} style={staffStyles.searchForm}>
          <div>
            <label htmlFor="staff-booking-id" style={staffStyles.fieldLabel}>
              Mã tiệc (Booking ID)
            </label>
            <input
              id="staff-booking-id"
              type="text"
              required
              placeholder="VD: cd0b75ab-6256-427e-9b37-777f8b9c2822"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              onBlur={() => setBookingId(bookingId.trim())}
              style={staffStyles.input}
            />
          </div>

          <div>
            <label htmlFor="staff-search-query" style={staffStyles.fieldLabel}>
              Họ tên hoặc SĐT khách
            </label>
            <input
              id="staff-search-query"
              type="text"
              placeholder="Nhập tên khách mời hoặc số điện thoại"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={staffStyles.input}
            />
          </div>

          <button
            type="submit"
            disabled={searching || !bookingId.trim()}
            style={staffStyles.primaryButton(searching || !bookingId.trim())}
          >
            {searching ? 'Đang tìm…' : 'Tra cứu khách'}
          </button>
        </form>
      </div>

      {/* Results Table with Large High-Contrast Buttons (S1/S2 requirement) */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>
          Danh sách kết quả tra cứu ({guests.length})
        </h3>

        {guests.length === 0 ? (
          <div style={staffStyles.emptyBox}>
            <p style={{ color: '#6b7280' }}>
              Chưa có khách mời nào được hiển thị. Hãy nhập mã tiệc và bấm tra cứu.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table aria-label="Danh sách khách mời check-in" style={staffStyles.table}>
              <thead>
                <tr style={staffStyles.tableHeadRow}>
                  <th style={staffStyles.tableHeadCell}>Họ và tên</th>
                  <th style={staffStyles.tableHeadCell}>Số đuôi SĐT</th>
                  <th style={staffStyles.tableHeadCell}>Nhóm khách</th>
                  <th style={staffStyles.tableHeadCell}>Bàn gợi ý</th>
                  <th style={staffStyles.tableHeadCell}>Trạng thái</th>
                  <th style={{ ...staffStyles.tableHeadCell, textAlign: 'right' }}>
                    Thao tác tác nghiệp
                  </th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => {
                  const isCheckedIn = g.checkedIn;
                  return (
                    <tr key={g.guestId} style={staffStyles.tableBodyRow}>
                      <td style={{ ...staffStyles.tableCell, fontWeight: 600 }}>{g.name}</td>
                      <td style={{ ...staffStyles.tableCell, color: '#4b5563' }}>
                        {g.phoneLast4 ? `…${g.phoneLast4}` : '—'}
                      </td>
                      <td style={staffStyles.tableCell}>
                        <span style={staffStyles.groupBadge}>{g.groupName || 'Chung'}</span>
                      </td>
                      <td style={{ ...staffStyles.tableCell, fontWeight: 600, color: '#1e40af' }}>
                        {g.tableLabels && g.tableLabels.length > 0
                          ? g.tableLabels.join(', ')
                          : 'Chưa xếp bàn'}
                      </td>
                      <td style={staffStyles.tableCell}>
                        <span style={staffStyles.statusBadge(isCheckedIn)}>
                          {isCheckedIn ? 'Đã check-in' : 'Chưa đến'}
                        </span>
                      </td>
                      <td style={{ ...staffStyles.tableCell, textAlign: 'right' }}>
                        {!isCheckedIn ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => void onCheckIn(g.guestId)}
                            style={staffStyles.checkinButton(pending)}
                            aria-label={`Check-in cho khách ${g.name}`}
                          >
                            Check-in ngay
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => void onUndoCheckIn(g.guestId)}
                            style={staffStyles.undoButton(pending)}
                            aria-label={`Hoàn tác check-in cho khách ${g.name}`}
                          >
                            Hoàn tác
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
