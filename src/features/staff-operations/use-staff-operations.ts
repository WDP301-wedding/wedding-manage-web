import { useStaffEventContext } from './use-staff-event-context';
import { staffCommand } from './staff-command-intents';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { staffService, type EventAssignmentItem } from '../../services/staff.service';
import { notify } from '../../design-system/notifications';
import { describeApiError } from '../../lib/api/api-errors';

export type StaffTab = 'management' | 'timeline' | 'seating' | 'work';
const minReasonLength = 10;
export function useStaffOperations({
  authenticated,
  isManager,
  accountId = '',
}: Readonly<{ authenticated: boolean; isManager: boolean; accountId?: string }>) {
  const [pending, setPending] = useState(false);
  const mutationLock = useRef(false);
  const [selectedTab, setActiveTab] = useState<StaffTab | null>(null);
  const activeTab = selectedTab ?? (isManager ? 'management' : 'work');
  const eventContext = useStaffEventContext(authenticated, accountId, pending);
  const { eventId, resolveEventId } = eventContext;
  const scope = `${accountId}:${eventId}`;
  const currentScope = useRef(scope);
  useEffect(() => {
    currentScope.current = scope;
  }, [scope]);
  const requestVersion = useRef(0);
  const [assignmentResult, setAssignmentResult] = useState<{
    scope: string;
    items: readonly EventAssignmentItem[];
  } | null>(null);
  const assignments = assignmentResult?.scope === scope ? assignmentResult.items : [];
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [failure, setFailure] = useState<{ scope: string; message: string } | null>(null);
  const [staffAccountId, setStaffAccountId] = useState('');
  const [staffAccountLabel, setStaffAccountLabel] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [directoryVersion, setDirectoryVersion] = useState(0);
  const handleLoadAssignments = async () => {
    if (!eventId || !authenticated || !isManager) return;
    const version = ++requestVersion.current;
    setLoadingAssignments(true);
    setFailure(null);
    try {
      const items = await staffService.getEventAssignments(eventId);
      if (currentScope.current === scope && version === requestVersion.current)
        setAssignmentResult({ scope, items });
    } catch (err) {
      if (currentScope.current === scope && version === requestVersion.current)
        setFailure({ scope, message: describeApiError(err).message });
    } finally {
      if (currentScope.current === scope && version === requestVersion.current)
        setLoadingAssignments(false);
    }
  };
  const refreshPersonnel = async () => {
    await Promise.all([handleLoadAssignments(), eventContext.refreshWorkspace()]);
  };
  useLiveRefresh(
    async (isCurrent) => {
      const version = ++requestVersion.current;
      setLoadingAssignments(true);
      try {
        const items = await staffService.getEventAssignments(eventId);
        if (isCurrent() && version === requestVersion.current) {
          setAssignmentResult({ scope, items });
          setFailure(null);
        }
      } catch (err) {
        if (isCurrent()) setFailure({ scope, message: describeApiError(err).message });
      } finally {
        if (isCurrent()) setLoadingAssignments(false);
      }
    },
    {
      scope: `staff-assignments:${scope}`,
      bookingId: eventId,
      initial: true,
      enabled: authenticated && isManager && Boolean(eventId),
      blocked: pending,
      types: ['staff.updated'],
    },
  );
  const handleProvisionStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get('email') as string;

    if (mutationLock.current) return;
    mutationLock.current = true;
    setPending(true);
    try {
      const res = await staffCommand(
        `${accountId}:staff-provision`,
        { email: email.trim().toLowerCase() },
        (key) => staffService.provisionStaffAccount({ email }, key),
      );
      notify.success(
        `Đã chuẩn bị tài khoản ${email}. ${res.credentialSetupRequired ? 'Nhân viên cần thiết lập mật khẩu qua luồng Quên mật khẩu trước khi đăng nhập.' : 'Nhân viên dùng tài khoản hiện có.'}`,
      );
      setStaffAccountId(res.accountId);
      setStaffAccountLabel(email);
      setNeedsPassword(res.credentialSetupRequired);
      form.reset();
      setDirectoryVersion((value) => value + 1);
    } catch (err) {
      notify.error(err, { fallbackMessage: 'Không thể cấp tài khoản nhân viên.' });
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  };

  const handleAssignStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const staffId = data.get('staffAccountId') as string;

    if (mutationLock.current) return;
    mutationLock.current = true;
    setPending(true);
    try {
      const id = await resolveEventId();
      if (!id) return;
      // Cấp lại cho người đã từng được phân công thì gửi revision hiện tại; phân công mới là 0.
      const latestAssignments = await staffService.getEventAssignments(id);
      const previous = latestAssignments.find((item) => item.staffAccountId === staffId.trim());
      if (previous?.status === 'ACTIVE') {
        notify.info('Nhân viên này đã được phân công cho tiệc.');
        return;
      }
      const body = {
        bookingId: id,
        staffAccountId: staffId.trim(),
        expectedRevision: previous?.revision ?? 0,
      };
      await staffCommand(
        `${accountId}:${id}:assign:${staffId.trim()}:${body.expectedRevision}`,
        body,
        (key) => staffService.assignStaff(body, key),
      );
      notify.success('Phân công nhân sự vào tiệc thành công!');
      await refreshPersonnel();
      form.reset();
      setStaffAccountId('');
      setStaffAccountLabel('');
    } catch (err) {
      notify.error(err, { fallbackMessage: 'Phân công nhân sự thất bại.' });
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  };

  const handleRevokeAssignment = async (assignmentId: string, reason: string) => {
    const assignment = assignments.find((item) => item.assignmentId === assignmentId);
    if (!eventId || !assignment) return;
    if (reason.length < minReasonLength) return;
    if (mutationLock.current) return;
    mutationLock.current = true;
    setPending(true);
    try {
      await staffCommand(
        `${accountId}:${eventId}:revoke:${assignmentId}:${assignment.revision}`,
        { assignmentId, revision: assignment.revision, reason },
        (key) =>
          staffService.revokeAssignment(eventId, assignmentId, assignment.revision, reason, key),
      );
      notify.success('Đã thu hồi phân công nhân sự.');
      await refreshPersonnel();
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  };

  return {
    eventContext,
    pending,
    activeTab,
    openTab: setActiveTab,
    assignments,
    loadingAssignments,
    staffAccountId,
    staffAccountLabel,
    needsPassword,
    directoryVersion,
    refreshPersonnel,
    assignmentError: failure?.scope === scope ? failure.message : null,
    assignmentsReady: assignmentResult?.scope === scope,
    selectStaff: (id: string, label: string, setup: boolean) => {
      setStaffAccountId(id);
      setStaffAccountLabel(label);
      setNeedsPassword(setup);
    },
    handleLoadAssignments,
    handleProvisionStaff,
    handleAssignStaff,
    handleRevokeAssignment,
  };
}
