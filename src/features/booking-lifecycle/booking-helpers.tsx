import type React from 'react';
import { ApiClientError } from '../../lib/api/client';
import type { ProposalView } from './booking-api';

export type InviteLogEntry = Readonly<{
  id: string;
  time: string;
  type: 'pending' | 'success' | 'error';
  message: string;
  consultationId?: string | undefined;
  invitationId?: string | undefined;
  details?: string | undefined;
}>;

export type BookingPrefill = Readonly<{
  displayName?: string | undefined;
  email?: string | undefined;
  note?: string | undefined;
  eventDate?: string | undefined;
  expectedGuests?: number | undefined;
  tableCount?: number | undefined;
}>;

export function PageState({
  children,
  title,
}: Readonly<{
  children?: React.ReactNode;
  title: string;
}>) {
  return (
    <main className="booking-state" id="booking-main">
      <p className="section-kicker"> Wedding Estate </p>
      <h1> {title} </h1>
      {children}
    </main>
  );
}

export function money(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}

export function errorMessage(error: unknown, shift?: ProposalView['proposal']['shift']): string {
  if (!(error instanceof ApiClientError))
    return 'Không thể hoàn tất yêu cầu. Dữ liệu đang nhập vẫn được giữ lại.';
  if (
    error.code === 'VALIDATION_ERROR' &&
    error.details?.some((detail) => detail.path === 'eventDate')
  )
    return 'Ngày tổ chức phải là ngày hợp lệ, từ ngày mốt trở đi (theo giờ Việt Nam). Hãy chọn lại ngày.';
  if (error.code === 'TIMELINE_ITEM_TIME_INVALID')
    return shift
      ? `Giờ bắt đầu mốc chương trình phải từ ${shift.startTime} đến trước ${shift.endTime}. Hãy sửa giờ rồi lưu lại. Nội dung đã nhập vẫn được giữ lại.`
      : 'Giờ bắt đầu mốc chương trình phải nằm trong ca tiệc đã chọn. Hãy sửa giờ rồi lưu lại.';
  const messages: Record<string, string> = {
    STALE_BOOKING_REVISION:
      'Hồ sơ đã thay đổi ở nơi khác hoặc mã hồ sơ tư vấn này đã được dùng để tạo tiệc rồi. Hãy bấm "Tạo hồ sơ tư vấn" ở Bước 01 để tạo mã mới cho cặp đôi.',
    SLOT_NOT_AVAILABLE: 'Khung giờ vừa được giữ bởi hồ sơ khác. Hãy chọn lịch khác.',
    DEPOSIT_INTENT_ACTIVE: 'Đang có giao dịch tiền cọc chưa kết thúc nên chưa thể thay đổi hồ sơ.',
    BOOKING_NOT_FOUND: 'Không tìm thấy hồ sơ hoặc tài khoản không có quyền xem.',
    NOT_FOUND: 'Không tìm thấy hồ sơ hoặc tài khoản không có quyền xem.',
    FORBIDDEN: 'Tài khoản không có quyền xem hồ sơ đặt tiệc này.',
    TIMELINE_APPROVAL_REQUIRES_ITEM:
      'Hãy thêm và lưu ít nhất một mốc chương trình trước khi phê duyệt.',
    TIMELINE_ITEM_COUNT_INVALID:
      'Kịch bản chỉ được có tối đa 100 mốc. Hãy xóa bớt mốc rồi lưu lại.',
    TIMELINE_ITEM_TEXT_INVALID:
      'Nội dung mỗi mốc cần từ 1–120 ký tự; ghi chú tối đa 2.000 ký tự. Hãy sửa nội dung rồi lưu lại.',
    TIMELINE_REVISION_SUPERSEDED:
      'Kịch bản đã có phiên bản mới. Hãy tải lại hồ sơ trước khi tiếp tục.',
  };
  return messages[error.code] ?? 'Yêu cầu chưa hoàn tất. Hãy kiểm tra dữ liệu và thử lại.';
}
