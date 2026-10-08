import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TimelineEditor } from './timeline-editor';

describe('immutable timeline editor', () => {
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
