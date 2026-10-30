import type { NotificationItem, NotificationOptions, NotificationType } from './notification-types';

type NotificationListener = (notification: NotificationItem) => void;
type DismissListener = (id: string) => void;
type ClearListener = () => void;

const KNOWN_CODE_TRANSLATIONS: Record<string, string> = {
  CURRENT_PASSWORD_INVALID: 'Mật khẩu hiện tại chưa đúng.',
  PASSWORD_INVALID: 'Mật khẩu không hợp lệ.',
  EMAIL_NOT_CONFIGURED: 'Dịch vụ email đang gặp sự cố nên chưa gửi được mã OTP. Hãy thử lại sau.',
  OTP_EMAIL_DELIVERY_FAILED:
    'Dịch vụ email đang gặp sự cố nên chưa gửi được mã OTP. Hãy thử lại sau.',
  RATE_LIMITED: 'Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau.',
  UNAUTHORIZED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Tài khoản của bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu hoặc dữ liệu đã bị xóa.',
  CONFLICT: 'Dữ liệu đã bị thay đổi bởi phiên làm việc khác. Vui lòng tải lại.',
  STALE_RECORD_REVISION:
    'Dữ liệu trên máy chủ đã thay đổi bởi phiên làm việc khác. Vui lòng tải lại.',
  STALE_BILLING_REVISION: 'Số dư đã thay đổi. Hãy làm mới và kiểm tra lại trước khi xác nhận.',
  BOOKING_NOT_FOUND: 'Không tìm thấy hồ sơ đặt tiệc.',
  BILLING_RECORD_NOT_FOUND: 'Không tìm thấy hồ sơ thanh toán.',
  BILLING_ACCESS_DENIED: 'Phiên đăng nhập hoặc quyền xem hồ sơ không còn hợp lệ.',
  REQUEST_FAILED: 'Yêu cầu không thành công. Vui lòng thử lại sau.',
  NETWORK_ERROR: 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền.',
  SESSION_EXPIRED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
};

function isMachineCodeOrEnglishStatus(str: string): boolean {
  const trimmed = str.trim();
  return (
    /^[A-Z0-9_-]+$/.test(trimmed) ||
    /^Request failed with status code \d+$/i.test(trimmed) ||
    trimmed === 'Network Error' ||
    trimmed === 'Request failed' ||
    trimmed === 'provider message'
  );
}

class NotificationService {
  private readonly listeners = new Set<NotificationListener>();
  private readonly dismissListeners = new Set<DismissListener>();
  private readonly clearListeners = new Set<ClearListener>();

  public subscribe(
    onNotify: NotificationListener,
    onDismiss: DismissListener,
    onClear: ClearListener,
  ): () => void {
    this.listeners.add(onNotify);
    this.dismissListeners.add(onDismiss);
    this.clearListeners.add(onClear);

    return () => {
      this.listeners.delete(onNotify);
      this.dismissListeners.delete(onDismiss);
      this.clearListeners.delete(onClear);
    };
  }

  public show(type: NotificationType, message: string, options?: NotificationOptions): string {
    const id = 'notif_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now();
    const durationMs = options?.durationMs ?? (type === 'error' ? 8000 : 5000);

    const item: NotificationItem = {
      id,
      type,
      message,
      title: options?.title,
      requestId: options?.requestId,
      durationMs,
      createdAt: Date.now(),
    };

    for (const listener of this.listeners) {
      listener(item);
    }

    return id;
  }

  public success(message: string, options?: NotificationOptions): string {
    return this.show('success', message, { title: 'Thao tác thành công', ...options });
  }

  public warning(message: string, options?: NotificationOptions): string {
    return this.show('warning', message, { title: 'Cảnh báo', ...options });
  }

  public info(message: string, options?: NotificationOptions): string {
    return this.show('info', message, { title: 'Thông báo', ...options });
  }

  public error(errorOrMessage: unknown, options?: NotificationOptions): string {
    const parsed = this.parseError(errorOrMessage, options);
    return this.show('error', parsed.message, {
      title: parsed.title,
      requestId: parsed.requestId,
      ...options,
    });
  }

  public dismiss(id: string): void {
    for (const listener of this.dismissListeners) {
      listener(id);
    }
  }

  public clearAll(): void {
    for (const listener of this.clearListeners) {
      listener();
    }
  }

  private parseError(
    err: unknown,
    options?: NotificationOptions,
  ): { title: string; message: string; requestId?: string | undefined } {
    let title = options?.title ?? 'Đã xảy ra lỗi';
    let message =
      options?.message ??
      options?.fallbackMessage ??
      'Không thể hoàn tất thao tác. Vui lòng thử lại sau.';
    let requestId = options?.requestId;

    if (options?.message) {
      if (err && typeof err === 'object') {
        const e = err as Record<string, unknown>;
        if (typeof e.requestId === 'string') {
          requestId = e.requestId;
        }
      }
      return { title, message: options.message, requestId };
    }

    if (typeof err === 'string' && err.trim().length > 0) {
      return { title, message: err, requestId };
    }

    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;

      if (typeof e.requestId === 'string') {
        requestId = e.requestId;
      }

      const status = typeof e.status === 'number' ? e.status : undefined;
      const code = typeof e.code === 'string' ? e.code : undefined;
      const rawMsg = typeof e.message === 'string' ? e.message : undefined;

      if (status === 429 || code === 'RATE_LIMITED') {
        title = 'Giới hạn thao tác (429)';
        message =
          'Đã vượt quá số lần gửi lời mời cho phép trong 24 giờ. Vui lòng chờ trước khi gửi lại hoặc kiểm tra email đã nhận.';
        return { title, message, requestId };
      }

      if (status === 401 || code === 'UNAUTHORIZED') {
        title = 'Hết phiên đăng nhập (401)';
        message =
          options?.fallbackMessage ??
          'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';
        return { title, message, requestId };
      }

      if (status === 403 || code === 'FORBIDDEN') {
        title = 'Từ chối quyền truy cập (403)';
        message =
          options?.fallbackMessage ??
          'Tài khoản của bạn không có quyền thực hiện thao tác này.';
        return { title, message, requestId };
      }

      if (status === 404 || code === 'NOT_FOUND') {
        title = 'Không tìm thấy dữ liệu (404)';
        message =
          options?.fallbackMessage ??
          (rawMsg && !isMachineCodeOrEnglishStatus(rawMsg)
            ? rawMsg
            : 'Dữ liệu yêu cầu không tồn tại hoặc đã bị xóa.');
        return { title, message, requestId };
      }

      if (status === 409 || code?.includes('STALE') || code === 'CONFLICT') {
        title = 'Xung đột dữ liệu (409)';
        message =
          options?.fallbackMessage ??
          (rawMsg && !isMachineCodeOrEnglishStatus(rawMsg)
            ? rawMsg
            : 'Dữ liệu trên máy chủ đã thay đổi bởi phiên làm việc khác. Vui lòng tải lại.');
        return { title, message, requestId };
      }

      if (status && status >= 500) {
        title = `Lỗi máy chủ (${status})`;
        message =
          options?.fallbackMessage ??
          'Máy chủ gặp sự cố xử lý hoặc đang bảo trì. Vui lòng thử lại sau ít phút.';
        return { title, message, requestId };
      }

      const translatedCode = code ? KNOWN_CODE_TRANSLATIONS[code] : undefined;
      const translatedMsg = rawMsg ? KNOWN_CODE_TRANSLATIONS[rawMsg] : undefined;

      if (options?.fallbackMessage) {
        message = options.fallbackMessage;
      } else if (translatedCode) {
        message = translatedCode;
      } else if (translatedMsg) {
        message = translatedMsg;
      } else if (rawMsg && !isMachineCodeOrEnglishStatus(rawMsg)) {
        message = rawMsg;
      }
    } else if (err instanceof Error) {
      const translated = KNOWN_CODE_TRANSLATIONS[err.message];
      if (options?.fallbackMessage) {
        message = options.fallbackMessage;
      } else if (translated) {
        message = translated;
      } else if (!isMachineCodeOrEnglishStatus(err.message)) {
        message = err.message;
      }
    }

    return { title, message, requestId };
  }
}

export const notify = new NotificationService();
