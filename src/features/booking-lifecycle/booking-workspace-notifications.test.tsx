import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { notify, NotificationProvider } from '../../design-system/notifications';
import type { ManagementBookingGateway, ProposalView } from './booking-api';
import { BookingWorkspaceTabManage } from './booking-workspace-tab-manage';
import type { useContractPanel } from './use-contract-panel';

vi.mock('../realtime/use-live-refresh', () => ({ useLiveRefresh: () => undefined }));
const contractMocks = vi.hoisted(() => ({
  getContracts: vi.fn(),
  approveContract: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/contract.service', () => ({ contractService: contractMocks }));
// Keep contract actions real; isolate the surrounding timeline/catalog UI.
vi.mock('./proposal-panel', () => ({
  ProposalPanel: ({ contractState }: { contractState: ReturnType<typeof useContractPanel> }) => (
    <button disabled={!contractState.currentRevision} onClick={contractState.handleApprove}>
      Duyệt hợp đồng
    </button>
  ),
}));

describe('booking workspace notifications', () => {
  it('keeps automatic refresh silent after a contract approval', async () => {
    contractMocks.getContracts.mockResolvedValue({
      bookingId: 'booking-fixture',
      bookingRevision: 1,
      currentRevisionId: 'contract-fixture',
      revisions: [{ revisionId: 'contract-fixture', approvals: [] }],
    });
    const refresh = vi.fn((message?: string) => {
      if (message) notify.success(message);
      return Promise.resolve();
    });
    render(
      <BookingWorkspaceTabManage
        active
        disabled={false}
        bookingId="booking-fixture"
        error={null}
        proposal={
          {
            bookingId: 'booking-fixture',
            revision: 1,
            phase: 'DRAFT',
            timeline: null,
          } as ProposalView
        }
        consultation={null}
        prefill={{}}
        inviteLogs={[]}
        switchTab={vi.fn()}
        sendWorkspaceInvite={() => Promise.resolve()}
        setInviteLogs={vi.fn()}
        run={(_label, operation) => operation()}
        authorize={(operation) => operation('local-fixture')}
        gateway={{} as ManagementBookingGateway}
        refresh={refresh}
      />,
      { wrapper: NotificationProvider },
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Duyệt hợp đồng' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt hợp đồng' }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Đã ghi nhận phê duyệt hợp đồng');
    expect(contractMocks.approveContract).toHaveBeenCalledTimes(1);
  });
});
