'use client';
import { useSearchParams } from 'next/navigation';
import { BookingArchive } from './booking-archive';
import { sharedManagementSession } from '../identity-access/session';
import { useManagementSession } from '../identity-access/use-management-session';
import { OperationsShell } from '../identity-access/operations-shell';
import { ManagementBillingWorkspace } from '../payments-billing/billing-page';
import { createManagementBillingGateway } from '../payments-billing/billing-api';
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
