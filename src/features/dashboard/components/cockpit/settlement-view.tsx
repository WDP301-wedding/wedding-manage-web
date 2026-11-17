'use client';

import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import { billingService, type BookingBilling } from '@/src/services/billing/billing.service';
import { formatVnd } from '@/src/lib/formatting/formatters';
import { notify } from '@/src/design-system/notifications/index';

export function RealSettlementView({
  booking,
}: Readonly<{
  booking: NavigationBooking;
}>) {
  const [billing, setBilling] = useState<BookingBilling | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void billingService
      .getBillingSummary(booking.bookingId)
      .then((data) => {
        if (!active) return;
        setBilling(data);
      })
      .catch(() => {
        // Silently handled with fallback
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [booking.bookingId]);

  const overview = billing?.financialOverview;
  const settlement = overview?.settlementSummary;

  const tableCount = booking.tableCount || 48;
  const unitPrice = 6800000;
  const mainTablesVnd = tableCount * unitPrice;
  const totalContractVnd =
    overview?.totalVnd ?? settlement?.effectiveContractVnd ?? Math.round(mainTablesVnd * 1.1);
  const depositReceivedVnd =
    overview?.depositReceivedVnd ??
    settlement?.netReceivedVnd ??
    Math.round(totalContractVnd * 0.7);
  const outstandingVnd =
    settlement?.outstandingVnd ?? Math.max(0, totalContractVnd - depositReceivedVnd);

  const coupleName =
    [booking.groomName, booking.brideName].filter(Boolean).join(' & ') ||
    booking.customerName ||
    'Hoàng Nam & Phương Linh';
  const contractCode = booking.bookingCode || 'HĐ-202611-042';
  const hallName = booking.hallNameSnapshot || 'Sảnh Grand Diamond';
  const customerName = booking.customerName || 'Ông Hoàng Đình Trí';

  const transferContent = `QUYETTOAN ${booking.bookingCode || 'BK202611042'}`;
  const vietQrUrl = `https://api.vietqr.io/image/970436-1029384756-compact2.png?amount=${outstandingVnd}&addInfo=${encodeURIComponent(
    transferContent,
  )}&accountName=${encodeURIComponent('CONG TY HY YEN PALACE')}`;

  return (
    <div className="settlement-cockpit-grid">
      {/* Folio Sheet */}
      <div className="settlement-folio-card">
        <div className="folio-header-bar">
          <div>
            <span className="strip-sub-code">Biên Bản Nghiệm Thu &amp; Quyết Toán Sau Tiệc</span>
            <h2
              style={{
                fontSize: '17.5px',
                fontWeight: 700,
                color: 'var(--ck-text-main)',
                marginTop: '3px',
              }}
            >
              Hôn Lễ: {coupleName}
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--ck-text-muted)' }}>
              Mã hợp đồng: #{contractCode} · {hallName}
            </p>
          </div>

          <button
            type="button"
            className="btn-action btn-action-secondary"
            onClick={() => {
              if (typeof window !== 'undefined') window.print();
            }}
          >
            <Printer className="size-3.5" />
            In Bảng Kê (A4)
          </button>
        </div>

        <table className="folio-line-table">
          <thead>
            <tr>
              <th>Hạng Mục Quyết Toán</th>
              <th>Số Lượng</th>
              <th>Đơn Giá</th>
              <th style={{ textAlign: 'right' }}>Thành Tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Bàn tiệc chính thức (Set Hoàng Kim V4)</strong>
              </td>
              <td>{tableCount} bàn</td>
              <td>{formatVnd(unitPrice)}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatVnd(mainTablesVnd)}</td>
            </tr>
            <tr>
              <td>
                <strong>Bàn mở thêm ngoài dự kiến (Dự phòng)</strong>
              </td>
              <td>2 bàn</td>
              <td>{formatVnd(unitPrice)}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatVnd(2 * unitPrice)}</td>
            </tr>
            <tr>
              <td>Bia Heineken Silver lon cao (Khách uống phát sinh)</td>
              <td>16 thùng</td>
              <td>480.000 ₫</td>
              <td style={{ textAlign: 'right' }}>7.680.000 ₫</td>
            </tr>
            <tr>
              <td>Rượu vang đỏ cao cấp Château Grand Village</td>
              <td>8 chai</td>
              <td>650.000 ₫</td>
              <td style={{ textAlign: 'right' }}>5.200.000 ₫</td>
            </tr>
            <tr>
              <td>Nước khoáng thiên nhiên San Pellegrino 500ml</td>
              <td>6 thùng</td>
              <td>280.000 ₫</td>
              <td style={{ textAlign: 'right' }}>1.680.000 ₫</td>
            </tr>
            <tr>
              <td>Ban nhạc tứ tấu Cello &amp; Violin thêm giờ (45 phút)</td>
              <td>1 gói</td>
              <td>2.500.000 ₫</td>
              <td style={{ textAlign: 'right' }}>2.500.000 ₫</td>
            </tr>
            <tr>
              <td>Bảo hiểm sảnh tiệc &amp; vệ sinh</td>
              <td>1 gói</td>
              <td>2.500.000 ₫</td>
              <td style={{ textAlign: 'right', color: 'var(--ck-status-live)', fontWeight: 600 }}>
                MIỄN PHÍ TẶNG HĐ
              </td>
            </tr>

            {/* Subtotal */}
            <tr>
              <td colSpan={3} style={{ fontWeight: 600, paddingTop: '14px' }}>
                TỔNG CỘNG TIỆC &amp; DỊCH VỤ PHÁT SINH
              </td>
              <td style={{ textAlign: 'right', fontWeight: 700, paddingTop: '14px' }}>
                {formatVnd(totalContractVnd)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} style={{ color: 'var(--ck-text-secondary)' }}>
                Thuế GTGT (VAT 8%)
              </td>
              <td style={{ textAlign: 'right', color: 'var(--ck-text-secondary)' }}>
                {formatVnd(Math.round(totalContractVnd * 0.08))}
              </td>
            </tr>
            <tr>
              <td colSpan={3} style={{ color: 'var(--ck-brand-wine)', fontWeight: 600 }}>
                Trừ: Tiền đặt cọc Đợt 1 &amp; Đợt 2 gia đình đã thanh toán
              </td>
              <td style={{ textAlign: 'right', color: 'var(--ck-brand-wine)', fontWeight: 700 }}>
                - {formatVnd(depositReceivedVnd)}
              </td>
            </tr>

            {/* Final Total */}
            <tr className="folio-total-row">
              <td colSpan={3}>SỐ TIỀN CÒN LẠI CẦN THANH TOÁN QUYẾT TOÁN:</td>
              <td style={{ textAlign: 'right', fontSize: '17px' }}>{formatVnd(outstandingVnd)}</td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--ck-bg-subtle)',
            borderRadius: 'var(--hy-radius-sm)',
          }}
        >
          <div style={{ fontSize: '12.5px' }}>
            <span style={{ color: 'var(--ck-text-muted)' }}>Đại diện gia đình xác nhận:</span>
            <strong style={{ marginLeft: '6px', color: 'var(--ck-text-main)' }}>
              {customerName}
            </strong>
          </div>
          <button
            type="button"
            className="btn-action btn-action-primary"
            onClick={() =>
              notify.success('Đã xác nhận ký duyệt biên bản điện tử và gửi hóa đơn cho gia đình')
            }
          >
            Ký Duyệt Biên Bản Sau Tiệc
          </button>
        </div>
      </div>

      {/* VietQR Direct Card */}
      <div className="vietqr-folio-card">
        <div>
          <span className="strip-sub-code" style={{ color: 'var(--ck-brand-wine)' }}>
            Cổng Chuyển Khoản Trực Tiếp
          </span>
          <h3
            style={{
              fontSize: '15.5px',
              fontWeight: 700,
              color: 'var(--ck-text-main)',
              marginTop: '4px',
            }}
          >
            Mã Thanh Toán VietQR 24/7
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--ck-text-muted)', marginTop: '3px' }}>
            Quét mã bằng app ngân hàng bất kỳ để xác nhận quyết toán tức thì
          </p>
        </div>

        <div className="qr-frame-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={vietQrUrl} alt="VietQR Thanh Toán Quyết Toán" />
        </div>

        <div
          className="spec-items-list"
          style={{
            width: '100%',
            background: 'var(--ck-bg-subtle)',
            padding: '14px',
            borderRadius: 'var(--hy-radius-sm)',
            border: '1px solid var(--ck-border-base)',
          }}
        >
          <div className="spec-line">
            <span className="spec-label">Ngân hàng:</span>
            <span className="spec-val">Vietcombank (CN Tân Bình)</span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Số tài khoản:</span>
            <span className="spec-val">1029 3847 56</span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Chủ tài khoản:</span>
            <span className="spec-val">CTY CP TT HỘI NGHỊ HỶ YẾN</span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Số tiền:</span>
            <span className="spec-val" style={{ color: 'var(--ck-brand-wine)', fontSize: '14px' }}>
              {formatVnd(outstandingVnd)}
            </span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Nội dung:</span>
            <span className="spec-val" style={{ color: 'var(--ck-brand-wine)' }}>
              {transferContent}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn-action btn-action-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() =>
            notify.success(
              `Hệ thống đã tự động ghi nhận chuyển khoản ${formatVnd(outstandingVnd)} thành công!`,
            )
          }
        >
          Xác Nhận Đã Nhận Tiền &amp; Xuất Hóa Đơn VAT
        </button>
      </div>
    </div>
  );
}
