import { useEffect, useState } from 'react';
import {
  type BookingAssignmentsRegistry,
  claimBookingAssignment,
  getBookingAssignments,
  resolveCurrentAccountEmail,
  resolveCurrentAccountId,
} from './booking-assignments';
import { notify } from '../../design-system/notifications';

export type LockNotice = { type: 'success' | 'warning' | 'info'; message: string } | null;

const ASSIGNMENTS_CHANGED = 'wedding_booking_assignments_changed';

/** Quản lý nhận phụ trách tiệc (khoá với quản lý khác), đồng bộ giữa các tab qua storage. */
export function useBookingClaims(currentAccountId?: string, currentAccountEmail?: string) {
  const resolvedAccountId = resolveCurrentAccountId(currentAccountId);
  const resolvedAccountEmail = resolveCurrentAccountEmail(currentAccountEmail);
  const [assignments, setAssignments] = useState<BookingAssignmentsRegistry>(() =>
    getBookingAssignments(),
  );
  const [lockNotice, setLockNotice] = useState<LockNotice>(null);

  useEffect(() => {
    const handleSync = () => setAssignments(getBookingAssignments());
    window.addEventListener('storage', handleSync);
    window.addEventListener(ASSIGNMENTS_CHANGED, handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener(ASSIGNMENTS_CHANGED, handleSync);
    };
  }, []);

  const claim = (bookingId: string, hallName?: string) => {
    const result = claimBookingAssignment(
      bookingId,
      resolvedAccountId,
      resolvedAccountEmail,
      hallName,
    );
    if (result.success) {
      const msg = `Bạn đã tiếp nhận tiệc ${hallName || ''} (${bookingId.slice(0, 8)}…). Tiệc này đã được khóa cho tài khoản của bạn.`;
      notify.success(msg);
      setLockNotice({ type: 'success', message: msg });
      window.dispatchEvent(new Event(ASSIGNMENTS_CHANGED));
    } else {
      const msg = `Tiệc này đã được ${result.existingAssignment?.assignedEmail || 'quản lý khác'} tiếp nhận và khóa. Bạn không thể nhận trùng tiệc.`;
      notify.warning(msg);
      setLockNotice({ type: 'warning', message: msg });
    }
    setAssignments(getBookingAssignments());
  };

  return {
    assignments,
    resolvedAccountId,
    claim,
    lockNotice,
    dismissLockNotice: () => setLockNotice(null),
  };
}
