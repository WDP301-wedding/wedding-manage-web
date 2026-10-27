'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { notify } from '../../design-system/notifications';

import apiContractLock from '../../../api-contract.lock.json';
import { OperationsShell } from '../identity-access/operations-shell';
import { sharedManagementSession } from '../identity-access/session';
import { createVenueCatalogGateway, type VenueCatalogGateway } from './catalog-api';
import {
  CatalogAccessPanel,
  catalogErrorMessage,
  CatalogStatus,
  Field,
  field,
  HallForm,
  integerField,
  nullableField,
  RestaurantForm,
  SectionHeading,
  ShiftForm,
  shiftLabel,
  Status,
} from './catalog-forms';
import {
  type Authorize,
  type CatalogTab,
  catalogTabs,
  CatalogTabs,
  ManagerVenueWorkspace,
  supportsFood,
  supportsLayout,
  supportsMedia,
  supportsTimeline,
} from './manager-venue-workspace';

export {
  CatalogAccessPanel,
  catalogErrorMessage,
  CatalogStatus,
  catalogTabs,
  CatalogTabs,
  Field,
  field,
  HallForm,
  integerField,
  ManagerVenueWorkspace,
  nullableField,
  RestaurantForm,
  SectionHeading,
  ShiftForm,
  shiftLabel,
  Status,
  supportsFood,
  supportsLayout,
  supportsMedia,
  supportsTimeline,
  type Authorize,
  type CatalogTab,
};

import { useManagementSession } from '../identity-access/use-management-session';

const catalogSession = sharedManagementSession;
const catalogGateway = createVenueCatalogGateway();
const catalogContractDigest = apiContractLock.source.sha256.slice(0, 8);
const authorizeCatalogSession: Authorize = (operation) => catalogSession.authorize(operation);

export function VenueCatalogPage() {
  const {
    snapshot: identity,
    loggingOut,
    logoutError,
    logout,
  } = useManagementSession({
    session: catalogSession,
  });

  useEffect(() => {
    if (logoutError) {
      notify.error(logoutError);
    }
  }, [logoutError]);

  const state =
    identity === null
      ? 'loading'
      : identity.status === 'anonymous'
        ? 'anonymous'
        : identity.presentation === 'manager'
          ? 'manager'
          : 'staff';

  const content =
    state === 'loading' ? (
      <CatalogStatus label="Đang xác minh quyền truy cập…" />
    ) : state === 'anonymous' ? (
      <CatalogAccessPanel title="Cần đăng nhập">
        <p>Hãy đăng nhập bằng tài khoản Quản lý để mở danh mục địa điểm.</p>
        <Link className="catalog-primary-link" href="/">
          Về trang đăng nhập
        </Link>
      </CatalogAccessPanel>
    ) : (
      <VenueCatalogWorkspace
        role={state === 'manager' ? 'MANAGER' : 'STAFF'}
        gateway={catalogGateway}
        authorize={authorizeCatalogSession}
      />
    );

  return (
    <OperationsShell
      activePage="catalog"
      contentId="catalog-content"
      snapshot={identity}
      onLogout={logout}
      pending={loggingOut}
    >
      {content}
    </OperationsShell>
  );
}

export function VenueCatalogWorkspace({
  authorize,
  gateway,
  role,
}: Readonly<{
  authorize: Authorize;
  gateway: VenueCatalogGateway;
  role: 'MANAGER' | 'STAFF';
}>) {
  if (role !== 'MANAGER') {
    return (
      <CatalogAccessPanel title="Không có quyền quản trị danh mục">
        <p>Khu vực này chỉ dành cho Quản lý được máy chủ xác thực.</p>
      </CatalogAccessPanel>
    );
  }
  return (
    <ManagerVenueWorkspace
      authorize={authorize}
      catalogContractDigest={catalogContractDigest}
      gateway={gateway}
    />
  );
}
