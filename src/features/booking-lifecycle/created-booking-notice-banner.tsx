'use client';

export interface CreatedBookingNoticeBannerProps {
  notice: {
    bookingId: string;
    consultationId: string;
    email?: string | undefined;
  };
  onDismiss: () => void;
  onNavigateToAccount: () => void;
}

export function CreatedBookingNoticeBanner({
  notice,
  onDismiss,
  onNavigateToAccount,
}: Readonly<CreatedBookingNoticeBannerProps>) {
  return (
    <div
      style={{
        backgroundColor: '#f0fdf4',
        border: '1.5px solid #22c55e',
        borderRadius: '8px',
        padding: '1.1rem 1.35rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.12)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#15803d',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            ✓ Khởi tạo tiệc cưới nháp thành công
          </span>
          <h3
            style={{
              margin: '0.25rem 0',
              color: '#14532d',
              fontSize: '1.05rem',
              fontWeight: 700,
            }}
          >
            Hồ sơ tiệc mới đã sẵn sàng
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534', lineHeight: 1.5 }}>
            Bản nháp tiệc đã sẵn sàng! Bạn có thể mời cặp đôi truy cập hồ sơ tiệc
            {notice.email ? (
              <>
                {' '}
                (<strong>{notice.email}</strong>)
              </>
            ) : null}{' '}
            để họ đăng nhập vào xem đề xuất &amp; duyệt kịch bản.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '1.25rem',
            color: '#15803d',
            cursor: 'pointer',
            lineHeight: 1,
            padding: '2px 6px',
          }}
          aria-label="Đóng thông báo"
        >
          ×
        </button>
      </div>

      <div
        style={{
          marginTop: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={onNavigateToAccount}
          style={{
            backgroundColor: '#15803d',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <span>Xem mục quản lý tài khoản cặp đôi bên dưới ↓</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #86efac',
            color: '#15803d',
            borderRadius: '6px',
            padding: '7px 12px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Đóng thông báo
        </button>
      </div>
    </div>
  );
}
