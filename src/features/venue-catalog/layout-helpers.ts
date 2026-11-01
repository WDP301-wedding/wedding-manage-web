import { ApiClientError } from '../../lib/api/client';

export function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function integer(data: FormData, name: string): number {
  return Number.parseInt(text(data, name), 10);
}

export function layoutErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 409) return 'Bố trí đã thay đổi. Hãy tải lại lịch sử trước khi thử lại.';
    if (error.status === 422)
      return (
        error.details?.map(({ message }) => message).join(' ') || 'Dữ liệu bố trí chưa hợp lệ.'
      );
    if (error.status === 403 || error.status === 404) return 'Máy chủ từ chối thao tác bố trí này.';
  }
  return 'Không thể hoàn tất thao tác bố trí.';
}
