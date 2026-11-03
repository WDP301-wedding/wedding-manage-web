'use client';
import Link from 'next/link';
import { OperationsShell } from '../identity-access/operations-shell';
import {
  type ManagementIdentitySession,
  sharedManagementSession,
} from '../identity-access/session';
import { useManagementSession } from '../identity-access/use-management-session';
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { CheckinDeskSection } from './checkin-desk-section';
import { StaffManagementSection } from './staff-management-section';
import { useStaffOperations } from './use-staff-operations';
import {
  StaffEventSelector,
  StaffCheckinReadiness,
  StaffTimeline,
} from './staff-workspace-summary';
import { StaffSeatingView } from './staff-seating-view';
import { StaffWorkBoard } from './staff-work-board';
export function StaffOperationsPage({
  session = sharedManagementSession,
}: Readonly<{ session?: ManagementIdentitySession }>) {
  const { snapshot, logout: handleLogout } = useManagementSession({ session });
  const authenticated = snapshot?.status === 'authenticated';
  const isManager = authenticated && snapshot.presentation === 'manager';
  const allowed =
    authenticated && (snapshot.presentation === 'manager' || snapshot.presentation === 'staff');
  const accountId = authenticated ? snapshot.actor.accountId : '';
  const staff = useStaffOperations({ authenticated: allowed, isManager, accountId });
  const context = staff.eventContext,
    view = context.workspace;
  const canSearch = Boolean(
    view && view.settings.checkInMode === 'BY_GUEST_NAME' && (isManager || view.windowOpen),
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
            Chọn tiệc, đón khách và phối hợp công việc trong phạm vi được phân công.
          </p>
        </header>
        {!allowed ? (
          <p role="status">
            {snapshot === null ? (
              'Đang kiểm tra phiên đăng nhập…'
            ) : (
              <>
                Khu vực dành cho Staff và Manager.{' '}
                <Link href="/" className="text-primary underline">
                  Đăng nhập
                </Link>
              </>
            )}
          </p>
        ) : (
          <>
            <StaffEventSelector
              context={context}
              disabled={staff.pending || context.configuring}
              isManager={isManager}
            />
            <StaffCheckinReadiness context={context} disabled={staff.pending} />
            <Tabs
              defaultValue="checkin"
              onValueChange={(value: unknown) => {
                if (
                  value === 'checkin' ||
                  value === 'management' ||
                  value === 'timeline' ||
                  value === 'seating' ||
                  value === 'work'
                )
                  staff.openTab(value);
              }}
            >
              <TabsList
                variant="line"
                aria-label="Chức năng tác nghiệp"
                className="max-w-full flex-wrap"
              >
                <TabsTrigger value="checkin">Đón khách &amp; Check-in</TabsTrigger>
                <TabsTrigger value="timeline">Kịch bản tiệc</TabsTrigger>
                <TabsTrigger value="seating">Sơ đồ bàn</TabsTrigger>
                <TabsTrigger value="work">Công việc &amp; Bàn giao</TabsTrigger>
                {isManager && <TabsTrigger value="management">Nhân sự</TabsTrigger>}
                <TabsIndicator />
              </TabsList>
              <TabsContent value="checkin" className="pt-4">
                {!canSearch && (
                  <p role="status" className="mb-4 rounded-lg bg-muted p-4 text-sm">
                    {!view
                      ? 'Chọn và mở tiệc để tra cứu khách.'
                      : view.settings.checkInMode === 'NONE'
                        ? 'Check-in chưa được bật cho tiệc này. Manager có thể bật tại phần Điều kiện đón khách.'
                        : 'Chưa đến giờ hoặc đã hết giờ check-in. Các phần kịch bản, sơ đồ và công việc vẫn sử dụng được.'}
                  </p>
                )}
                <CheckinDeskSection
                  bookingId={staff.bookingId}
                  setBookingId={staff.setBookingId}
                  searchQuery={staff.searchQuery}
                  setSearchQuery={staff.setSearchQuery}
                  searching={staff.searching}
                  pending={staff.pending || !canSearch}
                  available={canSearch}
                  seatingStatus={view?.seating.status ?? 'ABSENT'}
                  guests={staff.guests}
                  onSearchGuests={staff.handleSearchGuests}
                  onCheckIn={staff.handleCheckIn}
                  onUndoCheckIn={staff.handleUndoCheckIn}
                  isManager={isManager}
                  actionReason={staff.actionReason}
                  setActionReason={staff.setActionReason}
                />
                {staff.hasMoreGuests && (
                  <button
                    type="button"
                    className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold"
                    disabled={staff.searching || staff.pending}
                    onClick={() => void staff.handleMoreGuests()}
                  >
                    Tải thêm khách
                  </button>
                )}
              </TabsContent>
              <TabsContent value="timeline" className="pt-4">
                {view ? <StaffTimeline view={view} /> : <p>Chọn tiệc để xem kịch bản đã duyệt.</p>}
              </TabsContent>
              <TabsContent value="seating" className="pt-4">
                {view ? <StaffSeatingView view={view} /> : <p>Chọn tiệc để xem sơ đồ bàn.</p>}
              </TabsContent>
              <TabsContent value="work" className="pt-4">
                {view ? (
                  <StaffWorkBoard
                    key={`${accountId}:${view.bookingId}`}
                    view={view}
                    accountId={accountId}
                  />
                ) : (
                  <p>Chọn tiệc để xem công việc và bàn giao.</p>
                )}
              </TabsContent>
              {isManager && (
                <TabsContent value="management" className="pt-4">
                  <StaffManagementSection
                    bookingId={staff.bookingId}
                    staffAccountId={staff.staffAccountId}
                    staffAccountLabel={staff.staffAccountLabel}
                    setStaffAccountId={staff.setStaffAccountId}
                    pending={staff.pending}
                    assignments={staff.assignments}
                    loadingAssignments={staff.loadingAssignments}
                    onLoadAssignments={staff.handleLoadAssignments}
                    onProvisionStaff={staff.handleProvisionStaff}
                    onAssignStaff={staff.handleAssignStaff}
                    onRevokeAssignment={staff.handleRevokeAssignment}
                    actionReason={staff.actionReason}
                    setActionReason={staff.setActionReason}
                  />
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </main>
    </OperationsShell>
  );
}
