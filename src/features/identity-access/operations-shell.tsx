'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ManagementSessionSnapshot } from './session';

export function OperationsShell({
  children,
  activePage,
  contentId,
  snapshot,
  onLogout,
  pending = false,
}: Readonly<{
  children: ReactNode;
  activePage: 'overview' | 'bookings' | 'consultations' | 'catalog' | 'account';
  contentId: string;
  snapshot: ManagementSessionSnapshot | null;
  onLogout: () => void;
  pending?: boolean;
}>) {
  const actor =
    snapshot?.status === 'authenticated' && snapshot.presentation !== 'denied'
      ? snapshot.actor
      : null;
  const manager = snapshot?.status === 'authenticated' && snapshot.presentation === 'manager';
  const navClass = (page: typeof activePage) =>
    `nav-item${activePage === page ? ' nav-item-active' : ''}`;
  return (
    <div className="admin-shell operations-shell">
      <a className="skip-link" href={`#${contentId}`}>
        Đi đến nội dung chính
      </a>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true">
            W
          </span>
          <span>
            WEDDING<small>OPERATIONS</small>
          </span>
        </div>
        <nav className="admin-navigation" aria-label="Điều hướng vận hành">
          <Link
            className={navClass('overview')}
            href="/"
            aria-current={activePage === 'overview' ? 'page' : undefined}
          >
            Tổng quan
          </Link>
          <Link className="nav-item" href="/#upcoming-events">
            Lịch tiệc <span className="nav-count">08</span>
          </Link>
          <Link className="nav-item" href="/#customers">
            Khách hàng
          </Link>
          <Link className="nav-item" href="/#menu">
            Thực đơn
          </Link>
          {manager ? (
            <>
              <Link
                className={navClass('bookings')}
                href="/bookings"
                aria-current={activePage === 'bookings' ? 'page' : undefined}
              >
                Đặt tiệc
              </Link>
              <Link className="nav-item" href="/billing">
                Quản lý thanh toán
              </Link>
              <Link
                className={navClass('consultations')}
                href="/consultation-requests"
                aria-current={activePage === 'consultations' ? 'page' : undefined}
              >
                Yêu cầu tư vấn
              </Link>
              <Link className="nav-item" href="/#staff">
                Nhân sự
              </Link>
              <Link
                className={navClass('catalog')}
                href="/catalog"
                aria-current={activePage === 'catalog' ? 'page' : undefined}
              >
                Danh mục
              </Link>
            </>
          ) : null}
        </nav>
        <div className="sidebar-footer">
          {actor ? (
            <div className="profile-block">
              <Link
                className="operations-account-link"
                href="/account"
                aria-current={activePage === 'account' ? 'page' : undefined}
                aria-label={`Quản lý tài khoản ${actor.displayEmail}`}
              >
                <span className="operations-account-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
                  </svg>
                </span>
                <span className="operations-account-label">
                  <strong>{actor.displayEmail}</strong>
                  <small>{manager ? 'Quản lý nhà hàng' : 'Nhân viên vận hành'}</small>
                </span>
              </Link>
              <button
                className="operations-logout"
                type="button"
                onClick={onLogout}
                disabled={pending}
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link className="nav-item" href="/">
              Đăng nhập
            </Link>
          )}
        </div>
      </aside>
      {children}
    </div>
  );
}
