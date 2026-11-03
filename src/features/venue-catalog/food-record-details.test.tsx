import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { CatalogMenu } from './catalog-api';
import { FoodRecordDetails } from './food-record-details';

it('shows the exact historical menu price, description and dish version rather than current dish facts', () => {
  const historical = {
    id: 'menu-v1',
    versionNumber: 1,
    revision: 1,
    state: 'SUPERSEDED' as const,
    name: 'Gói tiệc',
    description: 'Mô tả gói cũ',
    priceVndPerTable: 3000000,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    publishedAt: '2026-10-01T00:00:00.000Z',
    items: [
      {
        dishId: 'dish',
        dishVersionId: 'dish-v1',
        dishVersionNumber: 1,
        name: 'Món công thức cũ',
        description: 'Mô tả món cũ',
        categoryLabel: 'Món chính',
        priceVnd: 100000,
        displayOrder: 1,
      },
    ],
  };
  const record: CatalogMenu = {
    id: 'menu',
    lifecycle: 'ACTIVE',
    revision: 2,
    displayOrder: 1,
    retiredAt: null,
    currentPublishedVersionId: 'menu-v2',
    draftVersionId: null,
    versions: [
      historical,
      {
        ...historical,
        id: 'menu-v2',
        state: 'PUBLISHED',
        versionNumber: 2,
        description: 'Mô tả gói mới',
        priceVndPerTable: 4000000,
        items: [
          {
            ...historical.items[0]!,
            dishVersionId: 'dish-v2',
            dishVersionNumber: 2,
            name: 'Món công thức mới',
            description: 'Mô tả món mới',
          },
        ],
      },
    ],
  };
  render(<FoodRecordDetails record={record} />);
  expect(screen.getByRole('region', { name: 'Bản đang công bố' })).toHaveTextContent('4.000.000');
  fireEvent.click(screen.getByRole('button', { name: 'Chi tiết phiên bản 1' }));
  const history = screen.getByRole('region', { name: 'Chi tiết phiên bản 1' });
  expect(history).toHaveTextContent('3.000.000');
  expect(history).toHaveTextContent('Mô tả gói cũ');
  expect(history).toHaveTextContent('Mô tả món cũ');
  expect(history).toHaveTextContent('phiên bản 1');
  expect(within(history).queryByText('Món công thức mới')).not.toBeInTheDocument();
  expect(within(history).queryByRole('textbox')).not.toBeInTheDocument();
});
