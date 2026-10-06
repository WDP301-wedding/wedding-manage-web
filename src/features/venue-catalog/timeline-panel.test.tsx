import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
    render(<TimelinePanel gateway={gateway({ updateTimelineDraft })} authorize={authorize} />);

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
    );

    const history = await screen.findByRole('region', { name: 'Lịch sử Tiệc tối chuẩn' });
    expect(within(history).getByText('Đã công bố · v1')).toBeVisible();
    expect(within(history).queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(within(history).getByRole('button', { name: 'Nhân bản phiên bản 1' }));

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
    render(<TimelinePanel gateway={gateway({ publishTimeline })} authorize={authorize} />);

    const editor = await screen.findByRole('form', { name: 'Bản nháp Tiệc tối điều chỉnh' });
    fireEvent.click(within(editor).getByRole('button', { name: 'Công bố kịch bản' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tải lại lịch sử');
    expect(within(editor).getByRole('button', { name: 'Công bố kịch bản' })).toBeEnabled();
  });
});
