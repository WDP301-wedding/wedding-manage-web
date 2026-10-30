import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotificationProvider } from '../../design-system/notifications';
import type { CatalogTimeline } from '../venue-catalog/catalog-api';
import { TimelineTemplatePicker } from './timeline-template-picker';

const shift = { startTime: '17:30', endTime: '22:00' };

function template(offsetMinutes = 15): CatalogTimeline {
  return {
    id: 'template',
    lifecycle: 'ACTIVE',
    currentPublishedVersionId: 'published',
    draftVersionId: 'draft',
    displayOrder: 0,
    retiredAt: null,
    revision: 1,
    versions: [
      {
        id: 'published',
        state: 'PUBLISHED',
        name: 'Tiệc vườn',
        versionNumber: 1,
        description: '',
        revision: 1,
        createdAt: '2026-10-08T00:00:00Z',
        updatedAt: '2026-10-08T00:00:00Z',
        publishedAt: '2026-10-08T00:00:00Z',
        items: [
          {
            id: 'source-item',
            title: 'Đón khách',
            description: null,
            offsetMinutes,
            durationMinutes: null,
            displayOrder: 0,
          },
        ],
      },
      {
        id: 'draft',
        state: 'DRAFT',
        name: 'Bản nháp',
        versionNumber: null,
        description: '',
        revision: 1,
        createdAt: '2026-10-08T00:00:00Z',
        updatedAt: '2026-10-08T00:00:00Z',
        publishedAt: null,
        items: [],
      },
    ],
  };
}

describe('timeline template picker', () => {
  it('offers only the current published version of active templates and copies without catalog IDs', async () => {
    const current = template();
    const load = vi.fn().mockResolvedValue({
      timelines: [
        current,
        { ...current, id: 'retired', lifecycle: 'RETIRED' },
        { ...current, id: 'draft-only', currentPublishedVersionId: 'draft' },
      ],
    });
    const onCopy = vi.fn();
    render(<TimelineTemplatePicker disabled={false} source={{ load, shift }} onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tải mẫu kịch bản' }));
    await screen.findByRole('option', { name: 'Tiệc vườn · phiên bản 1' });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Dùng mẫu này' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Mẫu kịch bản đã công bố'), {
      target: { value: 'published' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dùng mẫu này' }));
    expect(onCopy).toHaveBeenCalledWith([{ order: 0, startTime: '17:45', title: 'Đón khách' }]);
    expect(current.versions[0]?.items[0]?.id).toBe('source-item');
  });

  it('shows loading, clears a failed load on retry, and handles an empty catalog', async () => {
    let rejectLoad!: (error: Error) => void;
    const load = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectLoad = reject;
          }),
      )
      .mockResolvedValueOnce({ timelines: [] });
    render(<TimelineTemplatePicker disabled={false} source={{ load, shift }} onCopy={vi.fn()} />, {
      wrapper: NotificationProvider,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tải mẫu kịch bản' }));
    expect(screen.getByText('Đang tải mẫu kịch bản…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải mẫu kịch bản' })).toBeDisabled();
    rejectLoad(new Error('offline'));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Tải mẫu kịch bản' }));
    await screen.findByText('Chưa có mẫu kịch bản đang công bố.');
    // Lỗi cũ là toast tự tắt sau 8 giây; lần thử lại thành công không phát thêm lỗi.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it.each([-1, 270])('refuses offset %s outside the selected shift', async (offset) => {
    const onCopy = vi.fn();
    render(
      <TimelineTemplatePicker
        disabled={false}
        source={{ load: vi.fn().mockResolvedValue({ timelines: [template(offset)] }), shift }}
        onCopy={onCopy}
      />,
      { wrapper: NotificationProvider },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tải mẫu kịch bản' }));
    await screen.findByRole('combobox');
    fireEvent.change(screen.getByLabelText('Mẫu kịch bản đã công bố'), {
      target: { value: 'published' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dùng mẫu này' }));
    expect(screen.getByRole('alert')).toHaveTextContent('ngoài ca tiệc');
    expect(onCopy).not.toHaveBeenCalled();
  });

  it('cannot load templates when the booking editor is disabled', () => {
    const load = vi.fn();
    render(<TimelineTemplatePicker disabled source={{ load, shift }} onCopy={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tải mẫu kịch bản' }));
    expect(load).not.toHaveBeenCalled();
  });
});
