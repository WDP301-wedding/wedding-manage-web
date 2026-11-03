import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  contractService,
  type AppendixRevisionItem,
  type AppendixListData,
} from '../../services/contract.service';
import { AppendixDetailView } from './appendix-detail-view';
import { AppendixPrintAdjustment } from './appendix-print-adjustment';
import { useAppendixPanel } from './use-appendix-panel';

const menu = {
  category: 'MENU' as const,
  sourceId: 'menu',
  sourceRevisionId: 'menu-v1',
  name: 'Thực đơn',
  description: '',
  unit: 'table',
  quantity: 20,
  unitPriceVnd: 2000000,
  lineTotalVnd: 40000000,
};
const printA = {
  category: 'PRINT' as const,
  sourceId: 'source-a',
  sourceRevisionId: 'quote',
  name: 'Thiệp đỏ',
  description: '',
  unit: 'copy',
  quantity: 100,
  unitPriceVnd: 5000,
  lineTotalVnd: 500000,
};
const printB = {
  ...printA,
  sourceId: 'source-b',
  name: 'Thiệp xanh',
  quantity: 50,
  lineTotalVnd: 250000,
};
const appendix: AppendixRevisionItem = {
  revisionId: 'appendix',
  revisionNumber: 1,
  state: 'AWAITING_APPROVAL',
  documentDigest: 'digest',
  createdAt: '2026-11-04T00:00:00Z',
  submittedAt: '2026-11-04T00:00:00Z',
  approvedAt: null,
  document: {
    bookingId: 'booking',
    contractRevisionId: 'contract',
    predecessorRevisionId: 'contract',
    brideName: 'Lan',
    groomName: 'Nam',
    reason: 'Đặt in nhiều mẫu',
    beforeLines: [menu],
    afterLines: [menu, printA, printB],
    beforeTotalVnd: 40000000,
    afterTotalVnd: 40750000,
    deltaVnd: 750000,
    tableCount: 20,
  },
  approvals: [
    {
      party: 'COUPLE',
      actorAccountId: 'couple',
      documentDigest: 'digest',
      occurredAt: '2026-11-04T00:00:00Z',
    },
  ],
  printRequests: [
    {
      requestId: 'request',
      bookingRevision: 10,
      bookingId: 'booking',
      appendixRevisionId: 'appendix',
      state: 'AWAITING_APPROVAL',
      orderId: null,
      document: {
        predecessorRevisionId: 'contract',
        totalVnd: 750000,
        lines: [printA, printB].map((line, index) => ({
          designId: `design-${index}`,
          designRevisionId: `design-rev-${index}`,
          title: line.name,
          quantity: line.quantity,
          printableRevisionId: `printable-${index}`,
          contentDigest: 'digest',
          line,
        })),
      },
    },
  ],
};

afterEach(() => vi.restoreAllMocks());

describe('appendix print approval and adjustment', () => {
  it('allows Manager to approve the appendix before an order exists and previews each design', async () => {
    const approve = vi.fn().mockResolvedValue(undefined);
    render(
      <AppendixDetailView
        activeAppendix={appendix}
        disabled={false}
        loading={false}
        managerApproved={false}
        coupleApproved
        appendixStateLabels={{ AWAITING_APPROVAL: 'Chờ nhà hàng' }}
        handleApproveAppendix={approve}
        handleSubmitAppendix={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button', { name: /Xem bản in:/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt phụ lục' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt phụ lục' }));
    await waitFor(() => expect(approve).toHaveBeenCalledExactlyOnceWith('appendix'));
    expect(screen.queryByRole('button', { name: /Duyệt đơn in|báo giá/i })).not.toBeInTheDocument();
  });

  it('creates an adjustment from per-design quantities with explicit zero for removal', async () => {
    const save = vi.fn().mockResolvedValue(true);
    render(<AppendixPrintAdjustment appendix={appendix} disabled={false} onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: /Điều chỉnh số lượng in/ }));
    expect(screen.getByRole('button', { name: 'Lưu phụ lục điều chỉnh' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Số lượng: Thiệp đỏ'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Số lượng: Thiệp xanh'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phụ lục điều chỉnh' }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        quantities: { 'source-a': 120, 'source-b': 0 },
        reason: 'Điều chỉnh số lượng in thiệp',
      }),
    );
  });

  it('preserves menus and exact predecessor, sends no client prices, and reuses uncertain adjustment intent', async () => {
    const data: AppendixListData = {
      bookingId: 'booking',
      bookingRevision: 7,
      currentRevisionId: 'appendix',
      effectiveRevisionId: 'appendix',
      effectiveTotalVnd: 40750000,
      revisions: [{ ...appendix, state: 'APPROVED' }],
      nextCursor: null,
    };
    vi.spyOn(contractService, 'getAppendices').mockResolvedValue(data);
    const create = vi
      .spyOn(contractService, 'createAppendix')
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAppendixPanel({ bookingId: 'booking', bookingRevision: 7, onRefresh: vi.fn() }),
    );
    await waitFor(() => expect(result.current.canAdjustPrint).toBe(true));
    const input = { quantities: { 'source-a': 120, 'source-b': 0 }, reason: 'Giảm số thiệp xanh' };
    await act(() => result.current.handleAdjustPrint(input));
    const firstKey = create.mock.calls[0]![2];
    await act(() => result.current.handleAdjustPrint(input));
    expect(create).toHaveBeenLastCalledWith(
      'booking',
      {
        expectedRevision: 7,
        predecessorRevisionId: 'appendix',
        reason: input.reason,
        lines: [
          { category: 'MENU', sourceId: 'menu', sourceRevisionId: 'menu-v1', quantity: 20 },
          { category: 'PRINT', sourceId: 'source-a', sourceRevisionId: 'quote', quantity: 120 },
        ],
      },
      firstKey,
    );
  });
});
