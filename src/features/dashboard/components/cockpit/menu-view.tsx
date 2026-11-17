'use client';

import { useEffect, useState } from 'react';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import type { StaffWorkspace } from '@/src/services/staff/staff-workspace.contracts';
import { catalogService, type PublicMenu } from '@/src/services/catalog/catalog.service';
import { notify } from '@/src/design-system/notifications/index';

export function RealMenuView({
  workspace,
  booking,
}: Readonly<{
  workspace: StaffWorkspace | null;
  booking: NavigationBooking;
}>) {
  const [packages, setPackages] = useState<readonly PublicMenu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void catalogService
      .getPublicMenus()
      .then((items) => {
        if (!active) return;
        setPackages(items);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const offerings = workspace?.operations.offerings ?? [];
  const menuDishes = offerings.filter((o) => o.category === 'MENU');

  return (
    <div className="master-event-card" style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '18px',
          borderBottom: '1px solid var(--ck-border-base)',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <span className="strip-sub-code">Danh Mục Ẩm Thực Hoàng Gia</span>
          <h2
            style={{
              fontSize: '17.5px',
              fontWeight: 700,
              color: 'var(--ck-text-main)',
              marginTop: '3px',
            }}
          >
            Set Menu: Hoàng Kim Yến Tiệc V4 (
            {menuDishes.length > 0 ? `${menuDishes.length} Món` : '6 Món'})
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--ck-text-secondary)', marginTop: '2px' }}>
            Bếp trưởng MasterChef thiết kế riêng cho mùa cưới Hỷ Yến 2026
          </p>
        </div>
        <button
          type="button"
          className="btn-action btn-action-secondary"
          onClick={() => notify.info('Đang tải xuống file Catalog định lượng ẩm thực PDF…')}
        >
          Tải Catalog Ẩm Thực (PDF)
        </button>
      </div>

      <div className="menu-catalog-grid">
        {/* Course 1: Khai Vị */}
        <div className="menu-course-card">
          <div className="course-card-header">
            <span className="strip-sub-code" style={{ color: 'var(--ck-brand-wine)' }}>
              MÓN 1/6 · KHAI VỊ
            </span>
            <span className="solid-tag solid-tag-success">48/48 BÀN</span>
          </div>
          <div className="dish-card-item">
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ck-text-main)' }}>
              Soup Bào Ngư Vi Cá Thượng Hạng
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--ck-text-secondary)' }}>
              Nước dùng thanh ngọt hầm thảo mộc 12 tiếng, bào ngư tươi nhập khẩu, nấm đông cô Nhật.
            </p>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--ck-brand-gold)',
                fontWeight: 600,
                marginTop: '4px',
              }}
            >
              Quy chuẩn: Thố sứ hoàng gia giữ nhiệt 85°C
            </span>
          </div>
        </div>

        {/* Course 2: Hải Sản */}
        <div className="menu-course-card">
          <div className="course-card-header">
            <span className="strip-sub-code" style={{ color: 'var(--ck-brand-wine)' }}>
              MÓN 2/6 · HẢI SẢN CAO CẤP
            </span>
            <span
              className="solid-tag"
              style={{ background: 'var(--ck-brand-wine-subtle)', color: 'var(--ck-brand-wine)' }}
            >
              ĐANG RA BÀN
            </span>
          </div>
          <div className="dish-card-item">
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ck-text-main)' }}>
              Tôm Hùm Đút Lò Phô Mai Pháp
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--ck-text-secondary)' }}>
              Tôm hùm bông tươi sống nướng sốt kem bơ phô mai Gruyère thượng hạng kèm bánh mì bơ
              tỏi.
            </p>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--ck-brand-gold)',
                fontWeight: 600,
                marginTop: '4px',
              }}
            >
              Quy chuẩn: 1/2 con lớn/khách, dĩa sứ men ngọc
            </span>
          </div>
        </div>

        {/* Course 3: Thịt Cao Cấp */}
        <div className="menu-course-card">
          <div className="course-card-header">
            <span className="strip-sub-code" style={{ color: 'var(--ck-brand-gold)' }}>
              MÓN 3/6 · THỊT CAO CẤP
            </span>
            <span className="solid-tag solid-tag-warn">ĐANG ÁP CHẢO</span>
          </div>
          <div className="dish-card-item">
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ck-text-main)' }}>
              Thăn Bò Úc Sốt Rượu Vang Đỏ &amp; Măng Tây
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--ck-text-secondary)' }}>
              Bò Black Angus ủ khô, măng tây giòn ngọt, sốt vang đỏ Bordeaux nấu cùng tiêu đen Phú
              Quốc.
            </p>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--ck-brand-gold)',
                fontWeight: 600,
                marginTop: '4px',
              }}
            >
              Độ chín: Medium chuẩn 5 sao
            </span>
          </div>
        </div>

        {/* Course 4: Tinh Bột */}
        <div className="menu-course-card">
          <div className="course-card-header">
            <span className="strip-sub-code">MÓN 4/6 · TINH BỘT NO TIỆC</span>
            <span
              className="solid-tag"
              style={{ background: 'var(--ck-bg-subtle)', color: 'var(--ck-text-muted)' }}
            >
              CHỜ LỆNH
            </span>
          </div>
          <div className="dish-card-item">
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ck-text-main)' }}>
              Cơm Chiên Cua Hoàng Đế Ngũ Vị
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--ck-text-secondary)' }}>
              Thịt cua King Crab Alaska xào tơi cùng hạt gạo ngọc trời, trứng muối và rau củ tươi.
            </p>
          </div>
        </div>

        {/* Course 5: Tráng Miệng */}
        <div className="menu-course-card">
          <div className="course-card-header">
            <span className="strip-sub-code">MÓN 5/6 · TRÁNG MIỆNG</span>
            <span
              className="solid-tag"
              style={{ background: 'var(--ck-bg-subtle)', color: 'var(--ck-text-muted)' }}
            >
              KHO LẠNH
            </span>
          </div>
          <div className="dish-card-item">
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ck-text-main)' }}>
              Chè Hạt Sen Long Nhãn Cung Đình
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--ck-text-secondary)' }}>
              Hạt sen Tây Hồ hầm nhừ, long nhãn Hưng Yên, đường phèn thanh mát ướp hoa bưởi.
            </p>
          </div>
        </div>

        {/* Course 6: Đồ Uống */}
        <div className="menu-course-card">
          <div className="course-card-header">
            <span className="strip-sub-code" style={{ color: 'var(--ck-status-live)' }}>
              GÓI ĐỒ UỐNG TRỌN GÓI
            </span>
            <span className="solid-tag solid-tag-success">FREE-FLOW</span>
          </div>
          <div className="dish-card-item">
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ck-text-main)' }}>
              Bia Heineken Silver &amp; Nước Ngọt Suốt Tiệc
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--ck-text-secondary)' }}>
              Phục vụ không giới hạn trong 2.5 giờ tiệc, ướp lạnh đá bi đạt chuẩn 4°C.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
