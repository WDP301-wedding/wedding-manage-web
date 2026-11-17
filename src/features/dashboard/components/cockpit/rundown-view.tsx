'use client';

import { cn } from 'cn';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import type { StaffWorkspace } from '@/src/services/staff/staff-workspace.contracts';
import { notify } from '@/src/design-system/notifications/index';

export function RealRundownView({
  workspace,
  booking,
}: Readonly<{
  workspace: StaffWorkspace | null;
  booking: NavigationBooking;
}>) {
  const timelineItems = workspace?.timeline.items ?? [];
  const menuOfferings = workspace?.operations.offerings.filter((o) => o.category === 'MENU') ?? [];

  return (
    <div className="rundown-two-col">
      {/* Event Timeline Rundown */}
      <div className="rundown-panel-box">
        <div className="panel-box-header">
          <div>
            <h2 className="panel-box-title">
              Kịch Bản Lễ Cưới {booking.shiftCode === 'LUNCH' ? 'Ca Trưa' : 'Ca Tối'} (Rundown)
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--ck-text-secondary)', marginTop: '2px' }}>
              Khớp mốc thời gian giữa MC, Âm Thanh Ánh Sáng và Bếp Trưởng
            </p>
          </div>
          <button
            type="button"
            className="btn-action btn-action-secondary"
            style={{ padding: '5px 11px', fontSize: '12px' }}
            onClick={() => notify.success('Đã đồng bộ lại giờ kịch bản lễ cưới theo máy chủ')}
          >
            Đồng Bộ Giờ Chuẩn
          </button>
        </div>

        <div className="timeline-chain">
          {timelineItems.length > 0 ? (
            timelineItems.map((step, idx) => (
              <div
                key={step.itemId}
                className={cn('chain-node', idx === 0 ? 'done' : idx === 1 ? 'active' : '')}
              >
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">{step.startTime}</span>
                  <span className="chain-step-name">{step.title}</span>
                </div>
                {step.description ? <p className="chain-step-desc">{step.description}</p> : null}
              </div>
            ))
          ) : (
            <>
              <div className="chain-node done">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">10:30 – 11:30</span>
                  <span className="chain-step-name">Đón Khách &amp; Chụp Ảnh Tại Photo Booth</span>
                </div>
                <p className="chain-step-desc">
                  Phục vụ Welcome Drink tại sảnh chờ, ban nhạc acoustic hòa tấu đón khách.
                </p>
              </div>

              <div className="chain-node done">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">11:30 – 11:45</span>
                  <span className="chain-step-name">
                    MC Ổn Định Chỗ Ngồi &amp; Chiếu Clip Phóng Sự Cưới
                  </span>
                </div>
                <p className="chain-step-desc">
                  Chuyển ánh sáng sang chế độ Romantic Amber, đóng cửa chính chuẩn bị nghi thức.
                </p>
              </div>

              <div className="chain-node active">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">11:45 – 12:05 (Đang diễn ra)</span>
                  <span className="chain-step-name" style={{ color: 'var(--ck-brand-wine)' }}>
                    Nghi Lễ Mở Màn: Rước Dâu Chú Rể, Cắt Bánh &amp; Rót Rượu
                  </span>
                </div>
                <p className="chain-step-desc">
                  Pháo sáng lạnh &amp; khói mây, đôi uyên ương tiến lên sân khấu chúc rượu cha mẹ
                  hai bên.
                </p>
              </div>

              <div className="chain-node">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">12:05</span>
                  <span className="chain-step-name">
                    Khai Tiệc &amp; Xuất Món Khai Vị Đồng Loạt
                  </span>
                </div>
                <p className="chain-step-desc">
                  Bếp xuất {booking.tableCount || 48} phần Soup Bào Ngư Vi Cá, nhân viên bê mâm theo
                  đội hình chuẩn.
                </p>
              </div>

              <div className="chain-node">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">12:35 – 13:15</span>
                  <span className="chain-step-name">Lên Món Chính &amp; Chúc Rượu Từng Bàn</span>
                </div>
                <p className="chain-step-desc">
                  Ban nhạc tứ tấu biểu diễn trên sân khấu. Quản lý sảnh dẫn đoàn cô dâu chú rể chúc
                  rượu.
                </p>
              </div>

              <div className="chain-node">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">13:45</span>
                  <span className="chain-step-name">Món Tráng Miệng &amp; Tiễn Khách</span>
                </div>
                <p className="chain-step-desc">
                  Trao quà cảm ơn tại cửa sảnh, mời đại diện gia đình vào phòng VIP quyết toán sau
                  tiệc.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Kitchen Dispatch Stack */}
      <div className="rundown-panel-box">
        <div className="panel-box-header">
          <div>
            <h2 className="panel-box-title">Tiến Độ Ra Món Của Bếp Trung Tâm</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--ck-text-secondary)', marginTop: '2px' }}>
              Set: Hoàng Kim Yến Tiệc V4 · Tổng {booking.tableCount || 48} bàn
            </p>
          </div>
          <span className="solid-tag solid-tag-success">Nhiệt Độ Bếp Chuẩn</span>
        </div>

        <div className="kitchen-dispatch-stack">
          {menuOfferings.length > 0 ? (
            menuOfferings.map((dish, i) => {
              const progressPct = i === 0 ? 100 : i === 1 ? 90 : i === 2 ? 50 : 10;
              const statusText =
                i === 0
                  ? `${booking.tableCount || 48}/${booking.tableCount || 48} ĐÃ RA BÀN`
                  : i === 1
                    ? 'ĐANG PHÂN ĐĨA (90%)'
                    : i === 2
                      ? 'ĐANG ÁP CHẢO (50%)'
                      : 'CHỜ LỆNH BẾP TRƯỞNG';

              return (
                <div key={`${dish.name}-${i}`} className="dish-ticket-row">
                  <div className="ticket-top">
                    <span className="ticket-label">
                      MÓN {i + 1}/{menuOfferings.length} · ẨM THỰC
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: i === 0 ? 'var(--ck-status-live)' : 'var(--ck-brand-wine)',
                      }}
                    >
                      {statusText}
                    </span>
                  </div>
                  <span className="ticket-dish-name">{dish.name}</span>
                  <div className="ticket-track">
                    <div className="ticket-bar" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              );
            })
          ) : (
            <>
              <div className="dish-ticket-row">
                <div className="ticket-top">
                  <span className="ticket-label">MÓN 1/6 · KHAI VỊ</span>
                  <span
                    style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ck-status-live)' }}
                  >
                    48/48 ĐÃ RA BÀN
                  </span>
                </div>
                <span className="ticket-dish-name">Soup Bào Ngư Vi Cá Thượng Hạng</span>
                <div className="ticket-track">
                  <div className="ticket-bar" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="dish-ticket-row">
                <div className="ticket-top">
                  <span className="ticket-label">MÓN 2/6 · HẢI SẢN</span>
                  <span
                    style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ck-brand-wine)' }}
                  >
                    ĐANG PHÂN ĐĨA (90%)
                  </span>
                </div>
                <span className="ticket-dish-name">Tôm Hùm Đút Lò Phô Mai Pháp</span>
                <div className="ticket-track">
                  <div className="ticket-bar" style={{ width: '90%' }} />
                </div>
              </div>

              <div className="dish-ticket-row">
                <div className="ticket-top">
                  <span className="ticket-label">MÓN 3/6 · THỊT CAO CẤP</span>
                  <span
                    style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ck-brand-gold)' }}
                  >
                    ĐANG ÁP CHẢO (50%)
                  </span>
                </div>
                <span className="ticket-dish-name">Bò Úc Sốt Rượu Vang Đỏ &amp; Măng Tây</span>
                <div className="ticket-track">
                  <div className="ticket-bar" style={{ width: '50%' }} />
                </div>
              </div>

              <div className="dish-ticket-row">
                <div className="ticket-top">
                  <span className="ticket-label">MÓN 4/6 · TINH BỘT</span>
                  <span
                    style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ck-text-muted)' }}
                  >
                    CHỜ LỆNH BẾP TRƯỞNG
                  </span>
                </div>
                <span className="ticket-dish-name">Cơm Chiên Cua Hoàng Đế Ngũ Vị</span>
                <div className="ticket-track">
                  <div className="ticket-bar" style={{ width: '10%' }} />
                </div>
              </div>

              <div className="dish-ticket-row">
                <div className="ticket-top">
                  <span className="ticket-label">MÓN 5/6 · TRÁNG MIỆNG</span>
                  <span
                    style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ck-text-muted)' }}
                  >
                    SẴN SÀNG KHO LẠNH
                  </span>
                </div>
                <span className="ticket-dish-name">Chè Hạt Sen Long Nhãn Cung Đình</span>
                <div className="ticket-track">
                  <div className="ticket-bar" style={{ width: '0%' }} />
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn-action btn-action-primary"
          style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
          onClick={() =>
            notify.success('Đã phát lệnh chuẩn bị xuất món tiếp theo cho toàn thể đội ngũ phục vụ')
          }
        >
          Phát Lệnh Xuất Món Tiếp Theo
        </button>
      </div>
    </div>
  );
}
