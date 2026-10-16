import { sharedManagementSession } from './session';

export interface BookingAssignment {
  bookingId: string;
  assignedAccountId: string;
  assignedEmail?: string | undefined;
  assignedAt: string;
  hallNameSnapshot?: string | undefined;
}

export type BookingAssignmentsRegistry = Record<string, BookingAssignment>;

export const BOOKING_ASSIGNMENTS_REGISTRY_KEY = 'wedding_booking_assignments_registry';

export function resolveCurrentAccountId(providedId?: string): string {
  if (providedId && providedId.trim()) return providedId.trim();
  const snap = sharedManagementSession.snapshot();
  if (snap.status === 'authenticated' && snap.actor.accountId) {
    return snap.actor.accountId;
  }
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('wedding_dev_account_id');
    if (stored) return stored;
  }
  return 'manager-default';
}

export function resolveCurrentAccountEmail(providedEmail?: string): string {
  if (providedEmail && providedEmail.trim()) return providedEmail.trim();
  const snap = sharedManagementSession.snapshot();
  if (snap.status === 'authenticated' && snap.actor.displayEmail) {
    return snap.actor.displayEmail;
  }
  return 'manager@wedding.local';
}

export function getBookingAssignments(): BookingAssignmentsRegistry {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(BOOKING_ASSIGNMENTS_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveBookingAssignments(registry: BookingAssignmentsRegistry): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BOOKING_ASSIGNMENTS_REGISTRY_KEY, JSON.stringify(registry));
  } catch {}
}

export function claimBookingAssignment(
  bookingId: string,
  accountId?: string,
  email?: string,
  hallName?: string,
): { success: boolean; existingAssignment?: BookingAssignment } {
  const currentId = resolveCurrentAccountId(accountId);
  const currentEmail = resolveCurrentAccountEmail(email);
  const registry = getBookingAssignments();
  const existing = registry[bookingId];

  if (existing && existing.assignedAccountId !== currentId) {
    return { success: false, existingAssignment: existing };
  }

  const hallSnapshot = hallName ?? existing?.hallNameSnapshot;
  registry[bookingId] = {
    bookingId,
    assignedAccountId: currentId,
    assignedEmail: currentEmail,
    assignedAt: new Date().toISOString(),
    ...(hallSnapshot !== undefined ? { hallNameSnapshot: hallSnapshot } : {}),
  };
  saveBookingAssignments(registry);
  return { success: true };
}

export function releaseBookingAssignment(
  bookingId: string,
  accountId?: string,
): { success: boolean; reason?: 'not_owner' | 'not_found' } {
  const currentId = resolveCurrentAccountId(accountId);
  const registry = getBookingAssignments();
  const existing = registry[bookingId];

  if (!existing) {
    return { success: false, reason: 'not_found' };
  }
  if (existing.assignedAccountId !== currentId) {
    return { success: false, reason: 'not_owner' };
  }

  delete registry[bookingId];
  saveBookingAssignments(registry);
  return { success: true };
}

export function getMyManagedBookingsKey(accountId?: string): string {
  const id = resolveCurrentAccountId(accountId);
  return `wedding_my_managed_bookings_${id}`;
}

export function getMyManagedBookingIds(accountId?: string): string[] {
  const currentId = resolveCurrentAccountId(accountId);
  const assignments = getBookingAssignments();

  try {
    if (typeof window !== 'undefined') {
      const legacyKey = getMyManagedBookingsKey(accountId);
      const raw = window.localStorage.getItem(legacyKey);
      if (raw) {
        const legacyIds = JSON.parse(raw);
        let changed = false;
        if (Array.isArray(legacyIds)) {
          for (const id of legacyIds) {
            if (typeof id === 'string' && !assignments[id]) {
              assignments[id] = {
                bookingId: id,
                assignedAccountId: currentId,
                assignedEmail: resolveCurrentAccountEmail(),
                assignedAt: new Date().toISOString(),
              };
              changed = true;
            }
          }
          if (changed) {
            saveBookingAssignments(assignments);
          }
        }
      }
    }
  } catch {}

  return Object.values(assignments)
    .filter((a) => a.assignedAccountId === currentId)
    .map((a) => a.bookingId);
}

export function saveMyManagedBookingIds(ids: string[], accountId?: string): void {
  const currentId = resolveCurrentAccountId(accountId);
  const currentEmail = resolveCurrentAccountEmail();
  const assignments = getBookingAssignments();
  const updated: BookingAssignmentsRegistry = { ...assignments };

  for (const [bId, item] of Object.entries(updated)) {
    if (item.assignedAccountId === currentId && !ids.includes(bId)) {
      delete updated[bId];
    }
  }
  for (const id of ids) {
    if (!updated[id]) {
      updated[id] = {
        bookingId: id,
        assignedAccountId: currentId,
        assignedEmail: currentEmail,
        assignedAt: new Date().toISOString(),
      };
    }
  }
  saveBookingAssignments(updated);
}

export function addMyManagedBookingId(id: string, accountId?: string, email?: string): void {
  claimBookingAssignment(id, accountId, email);
}

export function removeMyManagedBookingId(id: string, accountId?: string): void {
  releaseBookingAssignment(id, accountId);
}
