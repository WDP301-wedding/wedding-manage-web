'use client';

import Link from 'next/link';

export interface BookingUnauthorizedHintProps {
  bookingId: string;
}

export function BookingUnauthorizedHint({ bookingId }: Readonly<BookingUnauthorizedHintProps>) {
  if (!bookingId) return null;

  return (
    <div
      style={{
        marginTop: '1.25rem',
        padding: '12px 16px',
        background: 'var(--hy-status-error-bg, #fdecea)',
        border: '1px solid var(--hy-status-error-border, #fecaca)',
        borderRadius: '6px',
        textAlign: 'left',
        maxWidth: '640px',
        margin: '1.25rem auto 0',
      }}
    >
      <div
        style={{
          color: 'var(--hy-status-error, #c62828)',
          fontWeight: 600,
          fontSize: '0.88rem',
          marginBottom: '4px',
        }}
      >
        💡 Gợi ý xử lý khi không có quyền xem hồ sơ đề xuất &amp; kịch bản:
      </div>
      <p
        style={{
          margin: '0 0 10px',
          fontSize: '0.82rem',
          color: 'var(--hy-text, #2b1d22)',
          lineHeight: 1.5,
        }}
      >
        Tiệc cưới <code>{bookingId.slice(0, 8)}…</code> được tạo bởi Quản lý khác (hoặc là dữ liệu
        mẫu nhà hàng). Theo quy định của hệ thống, chỉ Quản lý trực tiếp tạo hồ sơ tư vấn ban đầu
        mới có quyền duyệt &amp; chỉnh sửa kịch bản tiệc này. Bạn vẫn có thể thực hiện các thao tác
        vận hành khác:
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link
          className="booking-secondary"
          href={`/billing?bookingId=${bookingId}`}
          style={{ textDecoration: 'none', padding: '5px 12px', fontSize: '0.8rem' }}
        >
          💳 Xem thanh toán &amp; Tiền cọc →
        </Link>
        <Link
          className="booking-secondary"
          href={`/staff?bookingId=${bookingId}`}
          style={{ textDecoration: 'none', padding: '5px 12px', fontSize: '0.8rem' }}
        >
          👥 Phân công Staff tiệc này →
        </Link>
      </div>
    </div>
  );
}
