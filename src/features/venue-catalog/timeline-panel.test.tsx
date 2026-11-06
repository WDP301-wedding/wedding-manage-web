import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../design-system/notifications';

import { ApiClientError } from '../../lib/api/client';
import type { CatalogGateway } from './catalog-api';
import { TimelinePanel } from './timeline-panel';

const templateId = '00000000-0000-4000-8000-000000000031';
const draftVersionId = '00000000-0000-4000-8000-000000000032';
const publishedVersionId = '00000000-0000-4000-8000-000000000033';

const timelineSnapshot = {
  timelines: [
    {
      id: templateId,
      lifecycle: 'ACTIVE' as const,
      displayOrder: 1,
      revision: 3,
      retiredAt: null,
      currentPublishedVersionId: publishedVersionId,
      draftVersionId,
      versions: [
        {
          id: publishedVersionId,
          versionNumber: 1,
          revision: 2,
          state: 'PUBLISHED' as const,
          name: 'Tiệc tối chuẩn',
          description: 'Kịch bản đã công bố',
          publishedAt: '2026-10-01T00:00:00.000Z',
          createdAt: '2026-09-30T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
          items: [
            {
              id: '00000000-0000-4000-8000-000000000034',
              title: 'Đón khách',
              description: null,
              offsetMinutes: 0,
              durationMinutes: 30,
              displayOrder: 1,
            },
          ],
        },
        {
          id: draftVersionId,
          versionNumber: null,
          revision: 4,
          state: 'DRAFT' as const,
          name: 'Tiệc tối điều chỉnh',
          description: 'Kịch bản đang soạn',
          publishedAt: null,
          createdAt: '2026-10-02T00:00:00.000Z',
          updatedAt: '2026-10-02T00:00:00.000Z',
          items: [
            {
              id: '00000000-0000-4000-8000-000000000035',
              title: 'Khai tiệc',
              description: 'MC giới thiệu',
              offsetMinutes: 30,
              durationMinutes: 10,
              displayOrder: 1,
            },
            {
              id: '00000000-0000-4000-8000-000000000036',
              title: 'Dùng tiệc',
              description: null,
              offsetMinutes: 40,
              durationMinutes: 90,
              displayOrder: 2,
            },
          ],
        },
      ],
    },
  ],
};

const authorize = <T,>(operation: (accessToken: string) => Promise<T>) =>
  operation('manager-token');

function gateway(overrides: Record<string, unknown> = {}): CatalogGateway {
  return {
    loadTimelines: vi.fn(() => Promise.resolve(timelineSnapshot)),
    createTimeline: vi.fn(() => Promise.resolve()),
    updateTimelineDraft: vi.fn(() => Promise.resolve()),
    publishTimeline: vi.fn(() => Promise.resolve()),
    cloneTimeline: vi.fn(() => Promise.resolve()),
    changeTimelineLifecycle: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as unknown as CatalogGateway;
}

describe('VC-20 timeline template editor', () => {
  it('edits and reorders draft items with labeled keyboard controls', async () => {
    const updateTimelineDraft = vi.fn(() => Promise.resolve());
    render(<TimelinePanel gateway={gateway({ updateTimelineDraft })} authorize={authorize} />, {
      wrapper: NotificationProvider,
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp tục bản nháp' }));
    const editor = await screen.findByRole('form', { name: 'Bản nháp Tiệc tối điều chỉnh' });
    fireEvent.click(within(editor).getByRole('button', { name: 'Đưa Dùng tiệc lên' }));
    fireEvent.change(within(editor).getByLabelText('Tiêu đề mục 1'), {
      target: { value: 'Dùng tiệc chính' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Lưu kịch bản nháp' }));

    await waitFor(() =>
      expect(updateTimelineDraft).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({
          versionId: draftVersionId,
          expectedRevision: 4,
          items: [
            expect.objectContaining({ title: 'Dùng tiệc chính', displayOrder: 1 }),
            expect.objectContaining({ title: 'Khai tiệc', displayOrder: 2 }),
          ],
        }),
      ),
    );
  });

  it('keeps published history read-only and clones it only when no draft exists', async () => {
    const cloneTimeline = vi.fn(() => Promise.resolve());
    const publishedOnly = {
      timelines: [
        {
          ...timelineSnapshot.timelines[0],
          draftVersionId: null,
          versions: [timelineSnapshot.timelines[0]?.versions[0]],
        },
      ],
    };
    render(
      <TimelinePanel
        gateway={gateway({
          cloneTimeline,
          loadTimelines: vi.fn(() => Promise.resolve(publishedOnly)),
        })}
        authorize={authorize}
      />,
      { wrapper: NotificationProvider },
    );

    const table = await screen.findByRole('table', { name: 'Danh sách kịch bản tiệc' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    fireEvent.click(within(table).getByRole('button', { name: 'Chi tiết' }));
    const details = screen.getByRole('dialog');
    expect(within(details).getByText('Bản đang công bố · v1')).toBeVisible();
    expect(within(details).queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(within(details).getByRole('button', { name: 'Đóng hộp thoại' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo phiên bản mới' }));
    expect(cloneTimeline).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(cloneTimeline).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo phiên bản mới' }));
    fireEvent.change(screen.getByLabelText('Tên bản nháp'), {
      target: { value: 'Bản chỉnh sửa' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản nháp' }));

    await waitFor(() =>
      expect(cloneTimeline).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({ templateId, sourceVersionId: publishedVersionId }),
      ),
    );
  });

  it('shows recoverable guidance when a stale publish loses the race', async () => {
    const publishTimeline = vi.fn(() =>
      Promise.reject(
        new ApiClientError({
          kind: 'api',
          code: 'CATALOG_REVISION_CONFLICT',
          message: 'stale',
          requestId: '00000000-0000-4000-8000-000000000099',
          status: 409,
        }),
      ),
    );
    render(<TimelinePanel gateway={gateway({ publishTimeline })} authorize={authorize} />, {
      wrapper: NotificationProvider,
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp tục bản nháp' }));
    const editor = await screen.findByRole('form', { name: 'Bản nháp Tiệc tối điều chỉnh' });
    fireEvent.click(within(editor).getByRole('button', { name: 'Lưu và công bố' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Danh mục vừa thay đổi. Hãy tải lại trước khi lưu.',
    );
    expect(within(editor).getByRole('button', { name: 'Lưu và công bố' })).toBeEnabled();
  });
  it('shows published information in one row and isolates draft and historical details', async () => {
    const current = timelineSnapshot.timelines[0]!;
    const old = {
      ...current.versions[0]!,
      id: 'historical-version',
      versionNumber: 0,
      state: 'SUPERSEDED' as const,
      description: 'Mô tả phiên bản cũ',
      items: [{ ...current.versions[0]!.items[0]!, title: 'Nghi thức cũ' }],
    };
    const api = gateway({
      loadTimelines: vi.fn(() =>
        Promise.resolve({ timelines: [{ ...current, versions: [...current.versions, old] }] }),
      ),
    });
    render(<TimelinePanel gateway={api} authorize={authorize} />, {
      wrapper: NotificationProvider,
    });
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('1 mục chương trình')).toBeVisible();
    expect(within(table).queryByText('2 mục chương trình')).not.toBeInTheDocument();
    expect(within(table).getByText('Có bản nháp')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Chi tiết' }));
    expect(
      within(screen.getByRole('region', { name: 'Bản nháp' })).getByText('Kịch bản đang soạn'),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Chi tiết phiên bản 0' }));
    const history = screen.getByRole('region', { name: 'Chi tiết phiên bản 0' });
    expect(within(history).getByText('Mô tả phiên bản cũ')).toBeVisible();
    expect(within(history).getByText('Nghi thức cũ')).toBeVisible();
    expect(within(history).queryByRole('textbox')).not.toBeInTheDocument();
    expect(api.cloneTimeline).not.toHaveBeenCalled();
  });

  it('saves edits before publishing and retains the confirmed revision after a failed publication', async () => {
    const api = gateway({
      publishTimeline: vi
        .fn()
        .mockRejectedValueOnce(new Error('temporary'))
        .mockResolvedValueOnce(undefined),
    });
    render(<TimelinePanel gateway={api} authorize={authorize} />, {
      wrapper: NotificationProvider,
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp tục bản nháp' }));
    fireEvent.change(screen.getByLabelText('Tên bản nháp'), {
      target: { value: 'Đã sửa trước công bố' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và công bố' }));
    await waitFor(() => expect(api.publishTimeline).toHaveBeenCalledTimes(1));
    expect(api.updateTimelineDraft).toHaveBeenNthCalledWith(
      1,
      'manager-token',
      expect.objectContaining({ name: 'Đã sửa trước công bố', expectedRevision: 4 }),
    );
    expect(api.publishTimeline).toHaveBeenNthCalledWith(1, 'manager-token', {
      versionId: draftVersionId,
      expectedRevision: 5,
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Lưu và công bố' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và công bố' }));
    await waitFor(() => expect(api.publishTimeline).toHaveBeenCalledTimes(2));
    expect(api.updateTimelineDraft).toHaveBeenNthCalledWith(
      2,
      'manager-token',
      expect.objectContaining({ expectedRevision: 5 }),
    );
    expect(api.publishTimeline).toHaveBeenNthCalledWith(2, 'manager-token', {
      versionId: draftVersionId,
      expectedRevision: 6,
    });
  });
  it('retries an uncertain clone with the same version id and command key', async () => {
    const record = timelineSnapshot.timelines[0]!;
    const api = gateway({
      loadTimelines: vi.fn(() =>
        Promise.resolve({
          timelines: [{ ...record, draftVersionId: null, versions: [record.versions[0]!] }],
        }),
      ),
      cloneTimeline: vi
        .fn()
        .mockRejectedValueOnce(new Error('lost reply'))
        .mockResolvedValueOnce(undefined),
    });
    render(<TimelinePanel gateway={api} authorize={authorize} />, {
      wrapper: NotificationProvider,
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo phiên bản mới' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản nháp' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Lưu kịch bản nháp' })).toBeEnabled(),
    );
    expect(api.updateTimelineDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản nháp' }));
    await waitFor(() => expect(api.updateTimelineDraft).toHaveBeenCalled());
    const calls = vi.mocked(api.cloneTimeline).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1]![1]).toEqual(calls[0]![1]);
    expect(calls[0]![1].idempotencyKey).toEqual(expect.any(String));
    expect(api.updateTimelineDraft).toHaveBeenCalledWith(
      'manager-token',
      expect.objectContaining({ versionId: calls[0]![1].versionId, expectedRevision: 1 }),
    );
  });
});
