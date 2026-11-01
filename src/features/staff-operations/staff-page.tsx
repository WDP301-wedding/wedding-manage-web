'use client';

import { OperationsShell } from '../identity-access/operations-shell';
import {
  type ManagementIdentitySession,
  sharedManagementSession,
} from '../identity-access/session';
import { useManagementSession } from '../identity-access/use-management-session';
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { CheckinDeskSection } from './checkin-desk-section';
import { StaffManagementSection } from './staff-management-section';
import { type StaffTab, useStaffOperations } from './use-staff-operations';

export function StaffOperationsPage({
  session = sharedManagementSession,
}: Readonly<{
  session?: ManagementIdentitySession;
}>) {
  const { snapshot, logout: handleLogout } = useManagementSession({ session });
  const isManager = snapshot?.status === 'authenticated' && snapshot.presentation === 'manager';
  const staff = useStaffOperations({
    authenticated: snapshot?.status === 'authenticated',
    isManager,
  });

  const checkinDesk = (
    <CheckinDeskSection
      bookingId={staff.bookingId}
      setBookingId={staff.setBookingId}
      searchQuery={staff.searchQuery}
      setSearchQuery={staff.setSearchQuery}
      searching={staff.searching}
      pending={staff.pending}
      guests={staff.guests}
      onSearchGuests={staff.handleSearchGuests}
      onCheckIn={staff.handleCheckIn}
      onUndoCheckIn={staff.handleUndoCheckIn}
    />
  );

  return (
    <OperationsShell
      activePage="staff"
      contentId="staff-content"
      snapshot={snapshot}
      onLogout={handleLogout}
      pending={staff.pending}
    >
      <main
        data-ui-v3
        id="staff-content"
        className="flex min-h-screen flex-col gap-6 bg-background p-[clamp(1rem,3vw,3.25rem)]"
      >
        <header className="flex max-w-3xl flex-col gap-1">
          <h1 className="text-2xl font-bold">Nhân sự &amp; Tác nghiệp</h1>
          <p className="text-muted-foreground">
            Đón tiếp và xác nhận khách mời tại sảnh cưới (Check-in), phân công nhân sự và điều phối
            vận hành.
          </p>
        </header>

        {isManager ? (
          <Tabs value={staff.activeTab} onValueChange={(value) => staff.openTab(value as StaffTab)}>
            <TabsList variant="line" aria-label="Phân hệ nhân sự">
              <TabsTrigger value="checkin">Đón khách &amp; Check-in</TabsTrigger>
              <TabsTrigger value="management">Quản lý tài khoản &amp; Phân công</TabsTrigger>
              <TabsIndicator />
            </TabsList>
            <TabsContent value="checkin" className="pt-4">
              {checkinDesk}
            </TabsContent>
            <TabsContent value="management" className="pt-4">
              <StaffManagementSection
                bookingId={staff.bookingId}
                staffAccountId={staff.staffAccountId}
                setStaffAccountId={staff.setStaffAccountId}
                pending={staff.pending}
                assignments={staff.assignments}
                loadingAssignments={staff.loadingAssignments}
                onLoadAssignments={staff.handleLoadAssignments}
                onProvisionStaff={staff.handleProvisionStaff}
                onAssignStaff={staff.handleAssignStaff}
                onRevokeAssignment={staff.handleRevokeAssignment}
              />
            </TabsContent>
          </Tabs>
        ) : (
          checkinDesk
        )}
      </main>
    </OperationsShell>
  );
}
