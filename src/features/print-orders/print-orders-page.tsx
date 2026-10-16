'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ManagementIdentitySession,
  ManagementSessionSnapshot,
} from '../identity-access/session';
import { sharedManagementSession } from '../identity-access/session';
import {
  createManagementPrintOrdersGateway,
  type ManagementPrintOrdersGateway,
} from './print-orders-api';
import {
  createFixturePrintOrdersGateway,
  DEMO_MANAGER_SNAPSHOT,
  DEMO_PRINT_ORDERS,
} from './print-orders-fixtures';
import { printOrderStyles } from './print-orders.styles';
import type { PrintOrderView } from './print-orders-types';
import { PrintOrdersWorkspace, type WorkspaceProps } from './print-orders-workspace';
import '../../../app/print-orders/print-orders.css';

export { DEMO_MANAGER_SNAPSHOT } from './print-orders-fixtures';
export { PrintOrdersWorkspace, type WorkspaceProps } from './print-orders-workspace';
export { QuoteDrawer } from './quote-drawer';
export {
  HandoverModal,
  CancelOrderModal,
  CreateOrderNoticeModal,
  HistoryModal,
} from './print-order-modals';
export { PrintOrdersTable } from './print-orders-table';
export { PrintOrdersDetail } from './print-orders-detail';

const defaultIdentity = sharedManagementSession;
const defaultGateway = createManagementPrintOrdersGateway();

export interface ManagementPrintOrdersPageProps {
  session?: ManagementIdentitySession;
  gateway?: ManagementPrintOrdersGateway;
  initialOrders?: readonly PrintOrderView[];
  useFixtures?: boolean;
}

export function ManagementPrintOrdersPage({
  session = defaultIdentity,
  gateway = defaultGateway,
  initialOrders,
  useFixtures = false,
}: ManagementPrintOrdersPageProps) {
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(
    useFixtures ? DEMO_MANAGER_SNAPSHOT : null,
  );

  useEffect(() => {
    if (useFixtures) {
      return;
    }
    let active = true;
    void session.restore().then((res) => {
      if (active) setSnapshot(res);
    });
    return () => {
      active = false;
    };
  }, [session, useFixtures]);

  const resolvedGateway = useMemo(() => {
    if (useFixtures || initialOrders !== undefined) {
      return createFixturePrintOrdersGateway(initialOrders ?? DEMO_PRINT_ORDERS);
    }
    return gateway;
  }, [useFixtures, initialOrders, gateway]);

  const handleAuthorize = useCallback(
    async <T,>(op: (token: string) => Promise<T>): Promise<T> => {
      if (useFixtures) {
        return op('demo-mock-token');
      }
      try {
        return await session.authorize(op);
      } catch (err) {
        setSnapshot(session.snapshot());
        throw err;
      }
    },
    [session, useFixtures],
  );

  const handleLogout = useCallback(async () => {
    try {
      if (!useFixtures) {
        await session.logout();
      }
    } finally {
      setSnapshot({ status: 'anonymous', denial: null });
    }
  }, [session, useFixtures]);

  if (snapshot === null && !useFixtures) {
    return (
      <div className="v0-shell">
        <main className="v0-content" style={printOrderStyles.centeredNotice}>
          <p role="status">Đang xác thực quyền truy cập quản lý…</p>
        </main>
      </div>
    );
  }

  // Auth gate 1: Anonymous users
  if (!useFixtures && snapshot?.status === 'anonymous') {
    return (
      <div className="v0-shell">
        <main className="v0-content" style={printOrderStyles.centeredNotice}>
          <h1>Yêu cầu đăng nhập</h1>
          <p role="alert">
            Bạn cần đăng nhập bằng tài khoản Quản lý (Manager) để truy cập phân hệ in ấn thiệp cưới.
          </p>
          <Link
            href="/"
            className="v0-button v0-button-primary"
            style={printOrderStyles.primaryActionWithMargin}
          >
            Đăng nhập ngay
          </Link>
        </main>
      </div>
    );
  }

  // Auth gate 2: Non-manager authenticated users (Staff, Couple, etc.)
  const isManager = snapshot?.status === 'authenticated' && snapshot.presentation === 'manager';
  if (!useFixtures && snapshot?.status === 'authenticated' && !isManager) {
    const roleLabel =
      snapshot.presentation === 'staff' ? 'Nhân viên vận hành (Staff)' : 'không được phân quyền';
    return (
      <div className="v0-shell">
        <main className="v0-content" style={printOrderStyles.centeredNotice}>
          <h1>Truy cập bị từ chối</h1>
          <p role="alert">
            Tài khoản {snapshot.actor.displayEmail} thuộc vai trò {roleLabel}. Phân hệ Quản lý Đơn
            in ấn yêu cầu quyền Quản lý (Manager).
          </p>
          <div style={printOrderStyles.authDeniedButtons}>
            <Link href="/" className="v0-button v0-button-secondary">
              Về trang chủ
            </Link>
            <button
              type="button"
              className="v0-button v0-button-primary"
              onClick={() => {
                void handleLogout();
              }}
            >
              Đăng xuất
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PrintOrdersWorkspace
      snapshot={snapshot}
      gateway={resolvedGateway}
      authorize={handleAuthorize}
      isFixtureMode={useFixtures || initialOrders !== undefined}
      onLogout={() => {
        void handleLogout();
      }}
    />
  );
}
