'use client';

import type { BookingPrefill } from './booking-helpers';
import { bookingStyles } from './booking.styles';

export interface BookingCreatePrefillCardProps {
  prefill?: BookingPrefill | undefined;
}

export function BookingCreatePrefillCard({ prefill }: Readonly<BookingCreatePrefillCardProps>) {
  if (
    prefill?.eventDate ||
    prefill?.expectedGuests ||
    prefill?.preferredHallName ||
    prefill?.preferredMenuName ||
    prefill?.preferredShift ||
    prefill?.preferredHallId ||
    prefill?.preferredMenuVersionId
  ) {
    return (
      <div className="booking-prefill-card">
        <div className="booking-prefill-header">
          <span className="booking-prefill-badge">✓ Yêu cầu từ tư vấn</span>
          <span className="booking-prefill-desc">
            Thông tin khách đã gửi (chỉ tự chọn khi còn trong danh mục):
            {prefill.preferredHallName ? ` Sảnh (${prefill.preferredHallName}),` : ''}
            {prefill.preferredShift
              ? ` Ca (${prefill.preferredShift === 'LUNCH' ? 'Trưa' : 'Tối'}),`
              : ''}
            {prefill.preferredMenuName ? ` Thực đơn (${prefill.preferredMenuName}),` : ''}
            {prefill.eventDate ? ` ngày tổ chức (${prefill.eventDate})` : ''}
            {prefill.expectedGuests ? ` và ${prefill.expectedGuests} khách` : ''} từ yêu cầu tư
            vấn.
          </span>
        </div>
        <div className="booking-prefill-chips">
          {prefill.preferredHallName ? (
            <span className="booking-chip">
              Sảnh: <strong>{prefill.preferredHallName}</strong>
            </span>
          ) : null}
          {prefill.preferredShift ? (
            <span className="booking-chip">
              {prefill.preferredShift === 'LUNCH' ? 'Ca trưa' : 'Ca tối'}
            </span>
          ) : null}
          {prefill.eventDate ? (
            <span className="booking-chip">
              Ngày: <strong>{prefill.eventDate}</strong>
            </span>
          ) : null}
          {prefill.expectedGuests ? (
            <span className="booking-chip">
              Quy mô: <strong>{prefill.expectedGuests} khách</strong>
            </span>
          ) : null}
          {prefill.preferredMenuName ? (
            <span className="booking-chip">
              Thực đơn: <strong>{prefill.preferredMenuName}</strong>
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...bookingStyles.statusBanner('info'),
        fontSize: '0.82rem',
        padding: '8px 12px',
        marginBottom: '1rem',
        lineHeight: 1.5,
      }}
    >
      <strong>Gợi ý nghiệp vụ:</strong> Cặp đôi chưa chọn ngày cưới dự kiến khi gửi yêu cầu tư
      vấn. Quản lý vui lòng trao đổi, thống nhất ngày cưới &amp; quy mô cùng khách hàng rồi chọn
      ngày phù hợp bên dưới để kiểm tra lịch sảnh.
    </div>
  );
}
