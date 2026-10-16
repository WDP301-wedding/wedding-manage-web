import Link from 'next/link';

export function StaffCheckinBanner() {
  return (
    <section
      className="schedule-panel dashboard-schedule"
      id="staff-checkin-banner"
      style={{
        marginBottom: '2.5rem',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
        border: '1px solid #bbf7d0',
        padding: '2rem',
        borderRadius: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div>
          <p className="section-kicker" style={{ color: '#16a34a', fontWeight: 600 }}>
            Tác nghiệp Lễ tân · Check-in
          </p>
          <h2 style={{ margin: '0.25rem 0', fontSize: '1.5rem', color: '#166534' }}>
            Bàn đón tiếp &amp; Điểm danh khách mời
          </h2>
          <p style={{ color: '#374151', margin: '0.5rem 0 0', maxWidth: '640px', lineHeight: 1.5 }}>
            Bạn đang đăng nhập với vai trò <strong>Nhân viên vận hành (Staff)</strong>. Truy cập Bàn
            đón khách để nhập mã tiệc cưới, tra cứu tên khách và hướng dẫn vị trí bàn tiệc.
          </p>
        </div>
        <Link
          href="/staff"
          className="text-button"
          style={{
            background: '#16a34a',
            color: '#ffffff',
            padding: '0.875rem 1.75rem',
            borderRadius: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap',
          }}
        >
          Vào bàn đón khách &amp; Check-in →
        </Link>
      </div>
    </section>
  );
}
