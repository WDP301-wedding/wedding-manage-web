export type TableCapacity = Readonly<{
  guestsPerTable: 10;
  minimumTables: number;
  maximumTables: number;
  issue: string | null;
}>;
export type CommercialCapacity = Readonly<{
  commercialSource?: 'APPENDIX' | 'CONTRACT' | 'PROPOSAL';
  capacity?: TableCapacity;
}>;
export function tableCapacityMessage(
  headcount: number,
  tables: number,
  maximumTables?: number,
  hallMaxGuests = 10000,
): string | null {
  if (headcount > hallMaxGuests) return `Số khách vượt sức chứa ${hallMaxGuests} khách của sảnh.`;
  if (headcount > tables * 10)
    return `${headcount} khách cần tối thiểu ${Math.ceil(headcount / 10)} bàn (tối đa 10 người/bàn). Đang chọn ${tables} bàn.`;
  if (maximumTables === 0) return 'Sảnh chưa có sơ đồ đã xuất bản để bố trí bàn.';
  if (maximumTables !== undefined && tables > maximumTables)
    return `Đang chọn ${tables} bàn, vượt giới hạn ${maximumTables} bàn của sơ đồ sảnh.`;
  return null;
}
