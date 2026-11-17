'use client';
import { useSearchParams } from 'next/navigation';
import { BookingArchive } from '@/src/features/booking-archive/components/booking-archive';
import { sharedManagementSession } from '@/src/features/identity-access/session/session';
import { useManagementSession } from '@/src/features/identity-access/session/use-management-session';
import { OperationsShell } from '@/src/components/layout/operations-shell';
import { ManagementBillingWorkspace } from '@/src/features/payments-billing/pages/billing-page';
import { createManagementBillingGateway } from '@/src/features/payments-billing/api/billing-api';
const gateway = createManagementBillingGateway();
export function ManagerArchivePage() {
  const { snapshot, logout } = useManagementSession({ session: sharedManagementSession });
  const id = useSearchParams().get('bookingId');
  const allowed = snapshot?.status === 'authenticated' && snapshot.presentation === 'manager';
  return (
    <OperationsShell
      activePage="archive"
      contentId="archive-content"
      snapshot={snapshot}
      onLogout={logout}
    >
      <main data-ui-v3 id="archive-content" className="p-[clamp(1rem,3vw,3.25rem)]">
        {allowed ? (
          <BookingArchive
            finance={
              id ? (
                <ManagementBillingWorkspace
                  key={id}
                  accountId={snapshot.actor.accountId}
                  authorize={(operation) => sharedManagementSession.authorize(operation)}
                  gateway={gateway}
                  archiveMode
                />
              ) : undefined
            }
          />
        ) : (
          <p role="status">Cần đăng nhập bằng tài khoản Manager.</p>
        )}
      </main>
    </OperationsShell>
  );
}
