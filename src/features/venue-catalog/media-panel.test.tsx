import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../lib/api/client';
import type { CatalogGateway } from './catalog-api';
import { MediaPanel } from './media-panel';

const resourceId = '00000000-0000-4000-8000-000000000051';
const firstAssetId = '00000000-0000-4000-8000-000000000052';
const secondAssetId = '00000000-0000-4000-8000-000000000053';
const resource = {
  path: 'halls' as const,
  type: 'HALL' as const,
  id: resourceId,
  label: 'Sảnh · Hồng Ngọc',
  revision: 7,
  mutableOrder: true,
};
const assets = [
  {
    id: firstAssetId,
    resourceType: 'HALL' as const,
    resourceId,
    contentType: 'image/webp' as const,
    sizeBytes: 1024,
    alternativeText: 'Không gian sân khấu',
    displayOrder: 1,
    signedUrl: 'https://storage.example.test/first',
    signedUrlExpiresInSeconds: 300,
  },
  {
    id: secondAssetId,
    resourceType: 'HALL' as const,
    resourceId,
    contentType: 'image/png' as const,
    sizeBytes: 2048,
    alternativeText: 'Bàn tiệc mẫu',
    displayOrder: 2,
    signedUrl: 'https://storage.example.test/second',
    signedUrlExpiresInSeconds: 300,
  },
];

const authorize = <T,>(operation: (accessToken: string) => Promise<T>) =>
  operation('manager-token');

function gateway(overrides: Record<string, unknown> = {}): CatalogGateway {
  return {
    loadMediaResources: vi.fn(() => Promise.resolve([resource])),
    loadMedia: vi.fn(() => Promise.resolve(assets)),
    uploadMedia: vi.fn(() => Promise.resolve()),
    reorderMedia: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as unknown as CatalogGateway;
}

describe('VC-22 shared catalog media', () => {
  it('shows signed previews without storage internals and refreshes expiring URLs', async () => {
    const loadMedia = vi.fn(() => Promise.resolve(assets));
    render(<MediaPanel gateway={gateway({ loadMedia })} authorize={authorize} />);

    expect(await screen.findByAltText('Không gian sân khấu')).toHaveAttribute(
      'src',
      'https://storage.example.test/first',
    );
    expect(screen.getAllByText('URL ký số · 5 phút')).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/objectKey|checksumSha256/u);

    fireEvent.click(screen.getByRole('button', { name: 'Làm mới URL ký số' }));
    await waitFor(() => expect(loadMedia).toHaveBeenCalledTimes(2));
  });

  it('keeps resources distinct when different resource types share the same UUID', async () => {
    const restaurant = {
      ...resource,
      path: 'restaurant' as const,
      type: 'RESTAURANT' as const,
      label: 'Nhà hàng · Wedding Estate',
    };
    const loadMedia = vi.fn(() => Promise.resolve(assets));
    render(
      <MediaPanel
        gateway={gateway({
          loadMediaResources: vi.fn(() => Promise.resolve([resource, restaurant])),
          loadMedia,
        })}
        authorize={authorize}
      />,
    );

    const picker = await screen.findByLabelText('Tài nguyên danh mục');
    fireEvent.change(picker, { target: { value: `restaurant:${resourceId}` } });

    await waitFor(() =>
      expect(loadMedia).toHaveBeenLastCalledWith('manager-token', {
        path: 'restaurant',
        id: resourceId,
      }),
    );
  });

  it('uploads or replaces an allowlisted image with required alternative text', async () => {
    const uploadMedia = vi.fn(() => Promise.resolve());
    render(<MediaPanel gateway={gateway({ uploadMedia })} authorize={authorize} />);

    const form = await screen.findByRole('form', { name: 'Tải ảnh danh mục' });
    fireEvent.change(within(form).getByLabelText('Ảnh JPEG, PNG hoặc WebP'), {
      target: { files: [new File(['image'], 'hall.webp', { type: 'image/webp' })] },
    });
    fireEvent.change(within(form).getByLabelText('Văn bản thay thế'), {
      target: { value: 'Toàn cảnh sảnh tiệc' },
    });
    fireEvent.change(within(form).getByLabelText('Chế độ tải lên'), {
      target: { value: firstAssetId },
    });
    fireEvent.submit(form);

    await waitFor(() =>
      expect(uploadMedia).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({
          resourceType: 'HALL',
          resourceId,
          alternativeText: 'Toàn cảnh sảnh tiệc',
          oldAssetId: firstAssetId,
        }),
      ),
    );
  });

  it('rejects a non-image upload before calling the generated operation', async () => {
    const uploadMedia = vi.fn(() => Promise.resolve());
    render(<MediaPanel gateway={gateway({ uploadMedia })} authorize={authorize} />);

    const form = await screen.findByRole('form', { name: 'Tải ảnh danh mục' });
    fireEvent.change(within(form).getByLabelText('Ảnh JPEG, PNG hoặc WebP'), {
      target: { files: [new File(['plain text'], 'notes.txt', { type: 'text/plain' })] },
    });
    fireEvent.change(within(form).getByLabelText('Văn bản thay thế'), {
      target: { value: 'Tệp không hợp lệ' },
    });
    fireEvent.submit(form);

    expect(await within(form).findByRole('alert')).toHaveTextContent('Chỉ chấp nhận ảnh');
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it('reorders by labeled keyboard controls and presents provider errors as recoverable', async () => {
    const reorderMedia = vi.fn(() => Promise.resolve());
    const uploadMedia = vi.fn(() =>
      Promise.reject(
        new ApiClientError({
          kind: 'api',
          code: 'STORAGE_PROVIDER_UNAVAILABLE',
          message: 'provider failed',
          requestId: '00000000-0000-4000-8000-000000000099',
          status: 503,
        }),
      ),
    );
    render(<MediaPanel gateway={gateway({ reorderMedia, uploadMedia })} authorize={authorize} />);

    const gallery = await screen.findByRole('list', { name: 'Thứ tự ảnh danh mục' });
    fireEvent.click(within(gallery).getByRole('button', { name: 'Đưa ảnh 2 lên' }));
    await waitFor(() =>
      expect(reorderMedia).toHaveBeenCalledWith('manager-token', {
        path: 'halls',
        id: resourceId,
        revision: 7,
        assetIds: [secondAssetId, firstAssetId],
      }),
    );

    const form = screen.getByRole('form', { name: 'Tải ảnh danh mục' });
    fireEvent.change(within(form).getByLabelText('Ảnh JPEG, PNG hoặc WebP'), {
      target: { files: [new File(['image'], 'hall.png', { type: 'image/png' })] },
    });
    fireEvent.change(within(form).getByLabelText('Văn bản thay thế'), {
      target: { value: 'Sảnh tiệc' },
    });
    fireEvent.submit(form);

    expect(await screen.findByRole('alert')).toHaveTextContent('Nhà cung cấp lưu trữ');
    expect(within(form).getByRole('button', { name: 'Tải ảnh lên' })).toBeEnabled();
  });
});
