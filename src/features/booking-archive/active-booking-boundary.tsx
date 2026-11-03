'use client';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { archiveRead, navigationSchema } from './archive-api';
import { ArchivedBookingError } from '../../lib/api/booking-navigation';
import { useLiveRefresh } from '../realtime/use-live-refresh';
type Selection = { id: string | null; archive: boolean };
// Isolate the search-param observer: public page content retains server rendering.
function BookingSelectionObserver({
  onChange,
}: Readonly<{ onChange: (selection: Selection) => void }>) {
  const pathname = usePathname(),
    params = useSearchParams(),
    id = params.get('bookingId');
  useEffect(() => {
    onChange({ id, archive: pathname === '/cancelled-bookings' });
  }, [id, pathname, onChange]);
  return null;
}
export function ActiveBookingBoundary({ children }: Readonly<{ children: ReactNode }>) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const id = selection?.id ?? null,
    enabled = Boolean(id && /^[0-9a-f-]{36}$/i.test(id) && !selection?.archive);
  const [checked, setChecked] = useState<string | null>(null),
    [closed, setClosed] = useState<string | null>(null);
  useLiveRefresh(
    async (isCurrent) => {
      if (!id) return;
      try {
        const state = await archiveRead(`/bookings/${id}/navigation`, navigationSchema);
        if (isCurrent()) {
          if (state.phase === 'CANCELLED') setClosed(id);
          else setChecked(id);
        }
      } catch (error) {
        if (isCurrent()) {
          if (error instanceof ArchivedBookingError) setClosed(id);
          else setChecked(id);
        }
      }
    },
    {
      scope: `navigation:${id}`,
      bookingId: id,
      enabled,
      initial: true,
      types: ['booking.updated'],
    },
  );
  return (
    <>
      <Suspense fallback={null}>
        <BookingSelectionObserver onChange={setSelection} />
      </Suspense>
      {enabled && (checked !== id || closed === id) ? (
        <p role="status" className="p-6 text-sm">
          Đang mở hồ sơ tiệc…
        </p>
      ) : (
        children
      )}
    </>
  );
}
