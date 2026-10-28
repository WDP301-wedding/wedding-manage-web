'use client';

import { useState } from 'react';
import { ApiClientError } from '../../lib/api/client';
import type { Authorize, ManagementBookingGateway, ProposalView } from './booking-api';
import { errorMessage, type InviteLogEntry } from './booking-helpers';
import { notify } from '../../design-system/notifications';

export interface UseWorkspaceInviteOptions {
  authorize: Authorize;
  gateway: ManagementBookingGateway;
  consultation: { id: string; revision: number } | null;
  proposal: ProposalView | null;
  setPending: (p: string | null) => void;
  setMessage: (m: string | null) => void;
  setError: (e: string | null) => void;
}

export function useWorkspaceInvite({
  authorize,
  gateway,
  consultation,
  proposal,
  setPending,
  setMessage,
  setError,
}: UseWorkspaceInviteOptions) {
  const [inviteLogs, setInviteLogs] = useState<readonly InviteLogEntry[]>([]);

  const sendWorkspaceInvite = async () => {
    const targetConsultationId = consultation?.id ?? proposal?.consultationId;
    const targetRevision = consultation?.revision ?? 1;
    if (!targetConsultationId) return;
    const now = new Date().toLocaleTimeString('vi-VN');
    const logId = crypto.randomUUID();

    setInviteLogs((prev) => [
      {
        id: logId,
        time: now,
        type: 'pending',
        message: 'Đang gửi yêu cầu mời cộng tác tới máy chủ...',
        consultationId: targetConsultationId,
      },
      ...prev,
    ]);

    setPending('invite');
    setMessage(null);
    setError(null);
    try {
      const res = await authorize((token) =>
        gateway.invite(token, {
          consultationId: targetConsultationId,
          expectedRevision: targetRevision,
        }),
      );
      const successMsg = 'Đã yêu cầu gửi lời mời không gian cộng tác.';
      setMessage(successMsg);
      notify.success(successMsg);
      const invitationId = (res as { invitationId?: string } | undefined)?.invitationId;
      const isReplayed = (res as { replayed?: boolean } | undefined)?.replayed;
      setInviteLogs((prev) =>
        prev.map((item) =>
          item.id === logId
            ? {
                ...item,
                type: 'success',
                message: 'Đã gửi lời mời thành công tới email của cặp đôi.',
                invitationId: invitationId ?? 'Đã phát hành (ISSUED)',
                details: isReplayed
                  ? 'Yêu cầu lặp lại (replayed) - lời mời đã được phát hành trước đó.'
                  : undefined,
              }
            : item,
        ),
      );
    } catch (caught) {
      const errText = errorMessage(caught, proposal?.proposal.shift);
      setError(errText);
      notify.error(caught, { message: errText });
      setInviteLogs((prev) =>
        prev.map((item) =>
          item.id === logId
            ? {
                ...item,
                type: 'error',
                message: `Gửi lời mời thất bại: ${errText}`,
                details:
                  caught instanceof ApiClientError
                    ? `HTTP ${caught.status ?? 'N/A'} (${caught.code}): ${caught.message}`
                    : caught instanceof Error
                      ? caught.message
                      : String(caught),
              }
            : item,
        ),
      );
    } finally {
      setPending(null);
    }
  };

  return {
    inviteLogs,
    setInviteLogs,
    sendWorkspaceInvite,
  };
}
