'use client';

import { useState } from 'react';
import type { ProposalView } from '@/src/features/booking-lifecycle/api/booking-api';
import {
  settlementStatus,
  type SettlementStatus,
} from '@/src/features/payments-billing/utils/settlement-status';
import { useLiveRefresh } from '@/src/features/realtime/hooks/use-live-refresh';
import { billingService } from '@/src/services/billing/billing.service';

export function useBookingSettlementStatus(
  proposal: Pick<ProposalView, 'bookingId' | 'phase' | 'revision'> | null,
): SettlementStatus {
  const bookingId = proposal?.phase === 'COMPLETED' ? proposal.bookingId : null;
  const scope = bookingId ? `booking-settlement:${bookingId}:${proposal?.revision}` : 'no-settlement';
  const [snapshot, setSnapshot] = useState<{ scope: string; status: SettlementStatus } | null>(null);

  useLiveRefresh(
    async (isCurrent) => {
      if (!bookingId) return;
      let status: SettlementStatus = 'unknown';
      try {
        const [billing, invoices] = await Promise.all([
          billingService.getBillingSummary(bookingId, { limit: 1 }),
          billingService.getFinalInvoices(bookingId),
        ]);
        if (billing?.bookingId === bookingId) status = settlementStatus(billing, invoices);
      } catch {
        // Keep settlement unverified until both financial reads succeed.
      }
      if (isCurrent()) setSnapshot({ scope, status });
    },
    {
      scope,
      bookingId,
      enabled: bookingId !== null,
      initial: true,
      types: ['billing.updated', 'booking.updated', 'contract.updated', 'deposit.received'],
    },
  );

  return snapshot?.scope === scope ? snapshot.status : 'unknown';
}
