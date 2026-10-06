import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CatalogGateway } from './catalog-api';
import { LayoutPanel } from './layout-panel';

const templateId = '00000000-0000-4000-8000-000000000041';
const versionId = '00000000-0000-4000-8000-000000000042';
const hallId = '00000000-0000-4000-8000-000000000043';
const tableId = '00000000-0000-4000-8000-000000000044';
const secondTableId = '00000000-0000-4000-8000-000000000045';

const snapshot = {
  halls: [
    {
      id: hallId,
      name: 'Sảnh Hồng Ngọc',
      description: '',
      maxGuests: 120,
      displayOrder: 1,
      lifecycle: 'ACTIVE' as const,
      retiredAt: null,
      revision: 2,
    },
  ],
  layouts: [
    {
      id: templateId,
      hallId,
      displayOrder: 1,
      lifecycle: 'ACTIVE' as const,
      retiredAt: null,
      revision: 3,
      currentPublishedVersionId: null,
      draftVersionId: versionId,
      tables: [
        { id: tableId, retiredAt: null },
        { id: secondTableId, retiredAt: null },
      ],
      versions: [
        {
          id: versionId,
          versionNumber: null,
          revision: 4,
          state: 'DRAFT' as const,
          name: 'Bố trí tiệc ấm cúng',
          description: 'Bản nháp',
          minGuests: 10,
          maxGuests: 20,
          totalSeatCapacity: 20,
          publishedAt: null,
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
          tables: [
            {
              tableId,
              label: 'Bàn 01',
              shape: 'ROUND' as const,
              seatCapacity: 10,
              x: 500,
              y: 500,
              width: 1000,
              height: 1000,
              rotationDegrees: 0,
              displayOrder: 1,
            },
            {
              tableId: secondTableId,
              label: 'Bàn 02',
              shape: 'RECTANGLE' as const,
              seatCapacity: 10,
              x: 2000,
              y: 500,
              width: 1200,
              height: 800,
              rotationDegrees: 0,
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
    loadLayouts: vi.fn(() => Promise.resolve(snapshot)),
    createLayout: vi.fn(() => Promise.resolve()),
    updateLayoutDraft: vi.fn(() => Promise.resolve()),
    publishLayout: vi.fn(() => Promise.resolve()),
    cloneLayout: vi.fn(() => Promise.resolve()),
    changeLayoutLifecycle: vi.fn(() => Promise.resolve()),
    registerLayoutTable: vi.fn(() => Promise.resolve()),
    retireLayoutTable: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as unknown as CatalogGateway;
}

describe('VC-21 layout template editor', () => {
  it('shows capacity and canvas constraints and preserves a table UUID during numeric edits', async () => {
    const updateLayoutDraft = vi.fn(() => Promise.resolve());
    render(<LayoutPanel gateway={gateway({ updateLayoutDraft })} authorize={authorize} />);

    expect(await screen.findByText('Canvas 10.000 × 10.000')).toBeVisible();
    expect(screen.getByText('20 / 120 ghế')).toBeVisible();
    expect(screen.getByText('Khoảng khách 10–20')).toBeVisible();

    const editor = screen.getByRole('form', { name: 'Bản nháp Bố trí tiệc ấm cúng' });
    fireEvent.change(within(editor).getByLabelText('Tọa độ X Bàn 01'), {
      target: { value: '700' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Lưu bố trí nháp' }));

    await waitFor(() =>
      expect(updateLayoutDraft).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({
          versionId,
          expectedRevision: 4,
          tables: expect.arrayContaining([expect.objectContaining({ tableId, x: 700 })]),
        }),
      ),
    );
  });

  it('blocks geometry outside the canvas and totals above hall capacity before calling the API', async () => {
    const updateLayoutDraft = vi.fn(() => Promise.resolve());
    render(<LayoutPanel gateway={gateway({ updateLayoutDraft })} authorize={authorize} />);

    const editor = await screen.findByRole('form', { name: 'Bản nháp Bố trí tiệc ấm cúng' });
    fireEvent.change(within(editor).getByLabelText('Tọa độ X Bàn 01'), {
      target: { value: '9501' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Lưu bố trí nháp' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('vượt biên canvas');
    expect(updateLayoutDraft).not.toHaveBeenCalled();

    fireEvent.change(within(editor).getByLabelText('Tọa độ X Bàn 01'), {
      target: { value: '500' },
    });
    fireEvent.change(within(editor).getByLabelText('Số ghế Bàn 01'), {
      target: { value: '70' },
    });
    fireEvent.change(within(editor).getByLabelText('Số ghế Bàn 02'), {
      target: { value: '70' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Lưu bố trí nháp' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('sức chứa sảnh'));
    expect(updateLayoutDraft).not.toHaveBeenCalled();
  });

  it('removes geometry and permanently retires its stable table identity on save', async () => {
    const updateLayoutDraft = vi.fn(() => Promise.resolve());
    const retireLayoutTable = vi.fn(() => Promise.resolve());
    render(
      <LayoutPanel
        gateway={gateway({ retireLayoutTable, updateLayoutDraft })}
        authorize={authorize}
      />,
    );

    const editor = await screen.findByRole('form', { name: 'Bản nháp Bố trí tiệc ấm cúng' });
    fireEvent.click(within(editor).getByRole('button', { name: 'Bỏ và ngừng vĩnh viễn Bàn 01' }));
    fireEvent.change(within(editor).getByLabelText('Khách tối đa'), {
      target: { value: '10' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Lưu bố trí nháp' }));

    await waitFor(() =>
      expect(updateLayoutDraft).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({
          versionId,
          tables: [expect.objectContaining({ tableId: secondTableId, displayOrder: 1 })],
        }),
      ),
    );
    expect(retireLayoutTable).toHaveBeenCalledWith('manager-token', { templateId, tableId });
  });
});
