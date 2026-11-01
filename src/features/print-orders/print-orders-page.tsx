'use client';

import Link from 'next/link';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Button, buttonVariants } from '../../components/ui/button';
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
import type { PrintOrderView } from './print-orders-types';
import { PrintOrdersWorkspace } from './print-orders-workspace';

export { PrintOrdersWorkspace };

const defaultIdentity = sharedManagementSession;
const defaultGateway = createManagementPrintOrdersGateway();

export interface ManagementPrintOrdersPageProps {
  session?: ManagementIdentitySession;
  gateway?: ManagementPrintOrdersGateway;
  initialOrders?: readonly PrintOrderView[];
  useFixtures?: boolean;
}

function AccessNotice({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main data-ui-v3 className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="flex w-full max-w-[520px] flex-col items-start gap-3 rounded-xl border border-border bg-card p-8 shadow-hy-1">
        {children}
      </section>
    </main>
  );
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
    if (useFixtures) return;
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
      if (useFixtures) return op('demo-mock-token');
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
      if (!useFixtures) await session.logout();
    } finally {
      setSnapshot({ status: 'anonymous', denial: null });
    }
  }, [session, useFixtures]);

  if (snapshot === null && !useFixtures) {
    return (
      <AccessNotice>
        <p role="status" className="text-muted-foreground">
          Đang xác thực quyền truy cập quản lý…
        </p>
      </AccessNotice>
    );
  }

  if (!useFixtures && snapshot?.status === 'anonymous') {
    return (
      <AccessNotice>
        <h1 className="text-xl font-semibold">Yêu cầu đăng nhập</h1>
        <p className="text-muted-foreground">
          Bạn cần đăng nhập bằng tài khoản Quản lý (Manager) để truy cập phân hệ in ấn thiệp cưới.
        </p>
        <Link href="/" className={buttonVariants()}>
          Đăng nhập ngay
        </Link>
      </AccessNotice>
    );
  }

  const isManager = snapshot?.status === 'authenticated' && snapshot.presentation === 'manager';
  if (!useFixtures && snapshot?.status === 'authenticated' && !isManager) {
    const roleLabel =
      snapshot.presentation === 'staff' ? 'Nhân viên vận hành (Staff)' : 'không được phân quyền';
    return (
      <AccessNotice>
        <h1 className="text-xl font-semibold">Truy cập bị từ chối</h1>
        <p className="text-muted-foreground">
          Tài khoản {snapshot.actor.displayEmail} thuộc vai trò {roleLabel}. Phân hệ Quản lý Đơn in
          ấn yêu cầu quyền Quản lý (Manager).
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            Về trang chủ
          </Link>
          <Button type="button" onClick={() => void handleLogout()}>
            Đăng xuất
          </Button>
        </div>
      </AccessNotice>
    );
  }

  return (
    <PrintOrdersWorkspace
      snapshot={snapshot}
      gateway={resolvedGateway}
      authorize={handleAuthorize}
      isFixtureMode={useFixtures || initialOrders !== undefined}
      onLogout={() => void handleLogout()}
    />
  );
}
