import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TimelineEditor } from './timeline-editor';

describe('immutable timeline editor', () => {
  it('copies published template offsets into independent editable milestones before saving', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const load = vi.fn().mockResolvedValue({
      timelines: [
        {
          id: 'template',
          lifecycle: 'ACTIVE',
          currentPublishedVersionId: 'version',
          versions: [
            {
              id: 'version',
              state: 'PUBLISHED',
              name: 'Tiệc vườn',
              versionNumber: 1,
              items: [
                {
                  id: 'catalog-item-2',
                  displayOrder: 1,
                  offsetMinutes: 60,
                  title: 'Khai tiệc',
                  description: null,
                },
                {
                  id: 'catalog-item-1',
                  displayOrder: 0,
                  offsetMinutes: 15,
                  title: 'Đón khách',
                  description: 'Tại vườn',
                },
              ],
            },
          ],
        },
      ],
    });
    render(
      <TimelineEditor
        disabled={false}
        initialItems={[]}
        onSave={onSave}
        templateSource={{ load, shift: { startTime: '17:30', endTime: '22:00' } }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tải mẫu kịch bản' }));
    await screen.findByRole('option', { name: 'Tiệc vườn · phiên bản 1' });
    fireEvent.change(screen.getByLabelText('Mẫu kịch bản đã công bố'), {
      target: { value: 'version' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dùng mẫu này' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Giờ bắt đầu mốc 1')).toHaveValue('17:45');
    expect(screen.getByLabelText('Giờ bắt đầu mốc 2')).toHaveValue('18:30');
    fireEvent.change(screen.getByLabelText('Nội dung mốc 1'), {
      target: { value: 'Đón khách VIP' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản mới' }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        [
          { order: 0, startTime: '17:45', title: 'Đón khách VIP', description: 'Tại vườn' },
          { order: 1, startTime: '18:30', title: 'Khai tiệc' },
        ],
        '',
      ),
    );
    expect(screen.getByRole('button', { name: 'Đổi mẫu kịch bản' })).toBeEnabled();
  });

  it('preserves existing IDs and content when adding and reordering a milestone', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TimelineEditor
        disabled={false}
        initialItems={[
          {
            itemId: 'existing-1',
            startTime: '18:00',
            title: 'Đón khách',
            description: 'Giữ ghi chú',
          },
          { itemId: 'existing-2', startTime: '19:00', title: 'Khai tiệc', description: null },
        ]}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mốc chương trình' }));
    fireEvent.change(screen.getByLabelText('Giờ bắt đầu mốc 3'), { target: { value: '20:00' } });
    fireEvent.change(screen.getByLabelText('Nội dung mốc 3'), { target: { value: 'Cảm ơn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đưa mốc 3 lên' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản mới' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        [
          {
            itemId: 'existing-1',
            order: 0,
            startTime: '18:00',
            title: 'Đón khách',
            description: 'Giữ ghi chú',
          },
          { order: 1, startTime: '20:00', title: 'Cảm ơn' },
          { itemId: 'existing-2', order: 2, startTime: '19:00', title: 'Khai tiệc' },
        ],
        '',
      ),
    );
    expect(screen.getByLabelText('Nội dung mốc 2')).toHaveValue('Cảm ơn');
  });
});
