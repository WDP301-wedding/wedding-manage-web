import type { AxiosResponse } from 'axios';
import { axiosApiClient } from '../../lib/api/axios-client';
import type { operations } from '../../lib/api/generated/schema';
import type { ContractDraftBody } from '../../services/contract.service';

type Data<
  K extends
    'listPublicMenuPackages' | 'listSelectableRestaurantServices' | 'listSelectablePrintOfferings',
> = operations[K]['responses'][200]['content']['application/json']['data'];
export type DraftLine = ContractDraftBody['lines'][number];
export type CatalogChoice = DraftLine & { name: string; unit: string; unitPriceVnd: number };

async function pages<T>(path: string, signal: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  do {
    const response: AxiosResponse<{ data: { items: readonly T[]; nextCursor: string | null } }> =
      await axiosApiClient.get<{
        data: { items: readonly T[]; nextCursor: string | null };
      }>(path, { signal, params: { limit: 50, ...(cursor ? { cursor } : {}) } });
    items.push(...response.data.data.items);
    cursor = response.data.data.nextCursor;
    if (cursor && seen.has(cursor))
      throw new Error('Danh mục trả về con trỏ phân trang lặp. Vui lòng tải lại.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return items;
}
export async function loadContractChoices(signal: AbortSignal): Promise<CatalogChoice[]> {
  const [menus, services, prints] = await Promise.all([
    pages<Data<'listPublicMenuPackages'>['items'][number]>('/catalog/menu-packages', signal),
    pages<Data<'listSelectableRestaurantServices'>['items'][number]>('/catalog/services', signal),
    pages<Data<'listSelectablePrintOfferings'>['items'][number]>(
      '/catalog/print-offerings',
      signal,
    ),
  ]);
  return [
    ...menus.map((m) => ({
      category: 'MENU' as const,
      sourceId: m.id,
      sourceRevisionId: m.versionId,
      name: m.name,
      unit: 'bàn',
      unitPriceVnd: m.priceVndPerTable,
      quantity: 0,
    })),
    ...services
      .filter((s) => s.active)
      .map((s) => ({
        category: 'SERVICE' as const,
        sourceId: s.serviceId,
        sourceRevisionId: s.sourceRevisionId,
        name: s.name,
        unit: s.unit,
        unitPriceVnd: s.unitPriceVnd,
        quantity: 0,
      })),
    ...prints
      .filter((p) => p.active)
      .map((p) => ({
        category: 'PRINT' as const,
        sourceId: p.offeringId,
        sourceRevisionId: p.sourceRevisionId,
        name: p.name,
        unit: 'bản in',
        unitPriceVnd: p.unitPriceVnd,
        quantity: 0,
      })),
  ];
}
