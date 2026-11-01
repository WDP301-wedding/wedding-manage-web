import { ApiClientError } from '../../lib/api/client';

/** Câu báo lỗi tiếng Việt cho đăng nhập/đăng xuất theo loại lỗi máy chủ trả về. */
export function identityErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.kind === 'network' || error.kind === 'timeout') {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.';
    }
    if (error.status === 400 || error.code === 'VALIDATION_ERROR' || error.status === 422) {
      if (error.details && error.details.length > 0) {
        return (
          error.details
            .map((d) => d.message)
            .filter(Boolean)
            .join(' ') || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.'
        );
      }
      return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
    }
    if (error.status === 401 || error.code === 'AUTHENTICATION_REQUIRED') {
      return 'Thông tin đăng nhập không hợp lệ hoặc phiên đã hết hạn.';
    }
    if (error.status === 403 || error.status === 404) {
      return 'Máy chủ không cho phép thao tác này.';
    }
    if (error.status === 409) {
      return 'Dữ liệu có xung đột. Vui lòng làm mới trang.';
    }
    if (error.status === 429) {
      return 'Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.';
    }
    if (error.status && error.status >= 500) {
      return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    }
    if (error.message && error.message !== 'The request is invalid.') {
      return error.message;
    }
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}
