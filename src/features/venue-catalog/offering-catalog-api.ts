import type { operations } from '../../lib/api/generated/schema';

export type OfferingKind = 'incidentals' | 'services';
type Incidental =
  operations['listManagedIncidentalOfferings']['responses'][200]['content']['application/json']['data']['items'][number];
type Service =
  operations['listManagedRestaurantServices']['responses'][200]['content']['application/json']['data']['items'][number];
export type OfferingResponse = Incidental | Service;
export type OfferingDraft = Pick<Service, 'name' | 'description' | 'unit' | 'unitPriceVnd'> & {
  chargingRule: string;
};
export type OfferingItem = OfferingDraft & { id: string; revision: number; active: boolean };
export const emptyOffering: OfferingDraft = {
  name: '',
  description: '',
  unit: '',
  unitPriceVnd: 0,
  chargingRule: '',
};
export const offeringCatalogs = {
  incidentals: {
    path: '/management/incidental-offerings',
    title: 'Danh mục chi phí phát sinh',
    description:
      'Booking mới lưu bảng giá khi tạo và đưa vào hợp đồng. Sửa giá, ngừng hoặc khôi phục chỉ áp dụng cho booking tạo sau đó.',
    hint: 'Gợi ý: bia theo loại, nước ngọt, nước suối, đá viên, khăn lạnh, ly/chén vỡ, phục vụ quá giờ. Ghi rõ quy cách và cách tính.',
    nameLabel: 'Tên hạng mục',
    filterLabel: 'Lọc trạng thái hạng mục',
    addLabel: 'Thêm hạng mục',
    saveLabel: 'Lưu hạng mục',
  },
  services: {
    path: '/management/services',
    title: 'Dịch vụ nhà hàng',
    description:
      'Quản lý dịch vụ để chọn vào hợp đồng. Sửa giá, ngừng hoặc khôi phục áp dụng cho lựa chọn mới; hợp đồng và phụ lục đã chốt giữ nguyên.',
    hint: 'Gợi ý: MC, múa lân, ban nhạc, ca sĩ. Ghi rõ nội dung dịch vụ và đơn vị tính như buổi, tiết mục hoặc gói.',
    nameLabel: 'Tên dịch vụ',
    filterLabel: 'Lọc trạng thái dịch vụ',
    addLabel: 'Thêm dịch vụ',
    saveLabel: 'Lưu dịch vụ',
  },
} as const;
export function offeringItem(item: OfferingResponse): OfferingItem {
  return {
    id: 'offeringId' in item ? item.offeringId : item.serviceId,
    revision: item.revision,
    active: item.active,
    name: item.name,
    description: item.description,
    unit: item.unit,
    unitPriceVnd: item.unitPriceVnd,
    chargingRule: 'chargingRule' in item ? item.chargingRule : '',
  };
}
export function offeringBody(kind: OfferingKind, draft: OfferingDraft, active: boolean) {
  return {
    name: draft.name.trim().normalize('NFC'),
    description: draft.description.trim().normalize('NFC'),
    unit: draft.unit.trim().normalize('NFC'),
    unitPriceVnd: draft.unitPriceVnd,
    active,
    ...(kind === 'incidentals' ? { chargingRule: draft.chargingRule.trim().normalize('NFC') } : {}),
  };
}
