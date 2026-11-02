import type { NotificationItem, NotificationOptions, NotificationType } from './notification-types';

type NotificationListener = (notification: NotificationItem) => void;
type DismissListener = (id: string) => void;
type ClearListener = () => void;

const KNOWN_CODE_TRANSLATIONS: Record<string, string> = {
  // Xác thực & Tài khoản
  CURRENT_PASSWORD_INVALID: 'Mật khẩu hiện tại chưa đúng.',
  PASSWORD_INVALID: 'Mật khẩu không hợp lệ.',
  EMAIL_NOT_CONFIGURED: 'Dịch vụ email đang gặp sự cố nên chưa gửi được mã OTP. Hãy thử lại sau.',
  OTP_EMAIL_DELIVERY_FAILED:
    'Dịch vụ email đang gặp sự cố nên chưa gửi được mã OTP. Hãy thử lại sau.',
  RATE_LIMITED: 'Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau.',
  UNAUTHORIZED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Tài khoản của bạn không có quyền thực hiện thao tác này.',
  AUTHENTICATION_REQUIRED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  SESSION_EXPIRED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  SESSION_REVOKED: 'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.',
  INVALID_CREDENTIALS: 'Thông tin đăng nhập chưa chính xác.',

  // Chung
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu hoặc dữ liệu đã bị xóa.',
  CONFLICT: 'Dữ liệu đã bị thay đổi bởi phiên làm việc khác. Vui lòng tải lại.',
  STALE_RECORD_REVISION:
    'Dữ liệu trên máy chủ đã thay đổi bởi phiên làm việc khác. Vui lòng tải lại.',
  REQUEST_FAILED: 'Yêu cầu không thành công. Vui lòng thử lại sau.',
  NETWORK_ERROR: 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền.',
  REQUEST_TIMEOUT: 'Yêu cầu vượt quá thời gian chờ. Vui lòng thử lại.',
  IDEMPOTENCY_KEY_REUSED:
    'Thao tác bị trùng khoá với yêu cầu trước đó. Vui lòng tải lại trang.',
  REQUEST_IN_PROGRESS: 'Yêu cầu trước đang được xử lý trên máy chủ. Vui lòng đợi trong giây lát.',
  VALIDATION_FAILED: 'Dữ liệu nhập chưa hợp lệ. Vui lòng kiểm tra lại các trường thông tin.',
  VALIDATION_ERROR: 'Dữ liệu không đáp ứng quy chuẩn. Vui lòng kiểm tra lại các trường thông tin.',
  MALFORMED_JSON: 'Dữ liệu gửi lên máy chủ không đúng định dạng.',
  PAYLOAD_TOO_LARGE: 'Tệp tải lên vượt quá dung lượng cho phép.',
  SERVICE_UNAVAILABLE: 'Dịch vụ tạm thời bận hoặc đang bảo trì. Vui lòng thử lại sau.',
  INTERNAL_ERROR: 'Máy chủ gặp sự cố xử lý nội bộ. Vui lòng thử lại sau ít phút.',

  // Tư vấn & Đặt tiệc
  CONSULTATION_REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu tư vấn.',
  CONSULTATION_REQUEST_NOT_OPEN: 'Yêu cầu tư vấn đã đóng hoặc đã được xử lý.',
  CONSULTATION_ALREADY_EXISTS: 'Yêu cầu tư vấn đã tồn tại.',
  CONSULTATION_ALREADY_CONVERTED: 'Yêu cầu tư vấn này đã được chuyển thành booking trước đó.',
  BOOKING_NOT_FOUND: 'Không tìm thấy hồ sơ đặt tiệc.',
  BOOKING_SLOT_UNAVAILABLE: 'Sảnh và ca này đã có tiệc xác nhận hoặc đang được giữ chỗ.',
  SLOT_UNAVAILABLE: 'Khung giờ này đã kín lịch. Vui lòng chọn ngày, ca hoặc sảnh khác.',
  SLOT_NOT_AVAILABLE: 'Khung giờ này không khả dụng. Vui lòng chọn ngày hoặc ca khác.',
  BOOKING_CANCELLED: 'Tiệc này đã bị huỷ.',
  BOOKING_COMPLETED: 'Tiệc này đã hoàn tất tổ chức và quyết toán.',
  BOOKING_NOT_PAYABLE: 'Hồ sơ tiệc chưa đủ điều kiện thanh toán hoặc đã hoàn tất quyết toán.',
  BOOKING_HEADCOUNT_INVALID: 'Số lượng khách không hợp lệ.',
  BOOKING_TABLE_COUNT_INVALID: 'Số lượng bàn không hợp lệ.',
  BOOKING_MENU_SELECTION_INVALID: 'Lựa chọn thực đơn cho tiệc chưa hợp lệ.',
  BOOKING_COMMERCIAL_VALUE_INVALID: 'Tổng giá trị tiệc không hợp lệ.',
  BOOKING_COMPLETION_NOT_DUE: 'Tiệc chưa diễn ra nên chưa thể hoàn tất.',
  INVALID_BOOKING_TRANSITION: 'Không thể chuyển trạng thái hồ sơ tiệc theo yêu cầu.',
  STALE_BOOKING_REVISION: 'Hồ sơ tiệc vừa được cập nhật ở nơi khác. Vui lòng tải lại.',
  STALE_CONSULTATION_REVISION: 'Hồ sơ tư vấn vừa được cập nhật ở nơi khác. Vui lòng tải lại.',

  // Hợp đồng, Thoả thuận & Phụ lục
  CUSTOMER_SELECTION_REQUIRED: 'Cần khách lưu và gửi lựa chọn trước khi lập hợp đồng.',
  CUSTOMER_SELECTION_LOCKED:
    'Lựa chọn đã gửi hoặc hợp đồng đã được nhà hàng soạn. Không thể tự sửa trực tiếp.',
  CUSTOMER_SELECTION_STALE: 'Lựa chọn của khách vừa thay đổi. Vui lòng tải lại.',
  COUPLE_NAMES_INCOMPLETE: 'Cần nhập đủ tên cô dâu và chú rể trước khi gửi duyệt hợp đồng.',
  COMMERCIAL_PRICE_REVISION_STALE:
    'Giá trong danh mục vừa được cập nhật. Vui lòng tải lại và chọn lại món, dịch vụ hoặc mẫu in.',
  OFFERING_NOT_SELECTABLE:
    'Một hạng mục đã ngừng kinh doanh hoặc không khả dụng. Vui lòng chọn lại.',
  CONTRACT_REVISION_STALE:
    'Hợp đồng vừa được cập nhật bởi bên còn lại. Vui lòng tải lại để xem phiên bản mới nhất.',
  COMMERCIAL_PREDECESSOR_STALE:
    'Thoả thuận đã có phiên bản kế thừa mới hơn. Vui lòng làm mới trang.',
  CONTRACT_APPROVAL_REQUIRED: 'Hợp đồng cần sự xác nhận đồng thuận của cả nhà hàng và cặp đôi.',
  CONTRACT_DISTINCT_APPROVERS_REQUIRED:
    'Mỗi bên chỉ duyệt một lần; cần bên đối tác thực hiện phê duyệt.',
  CONTRACT_NOT_EDITABLE:
    'Hợp đồng đã chốt hoặc đã cọc, không thể sửa trực tiếp mà cần lập phụ lục.',
  CONTRACT_CAPACITY_EXCEEDED: 'Số bàn hoặc số khách vượt quá sức chứa tối đa của sảnh tiệc.',
  COMMERCIAL_AMOUNT_OVERFLOW: 'Tổng tiền tiệc vượt quá giới hạn hệ thống. Vui lòng kiểm tra lại.',
  CONTRACT_PRINT_SOURCE_ALLOCATED:
    'Mẫu in này đã được gửi vào xưởng in nên không thể đổi hoặc huỷ.',
  CONTRACT_PRINT_QUANTITY_ALLOCATED: 'Không thể giảm số lượng in đã đưa vào quy trình sản xuất.',
  CONTRACT_PRINT_TEMPLATE_CONFLICT:
    'Quy cách in không phù hợp với mẫu thiệp đã lưu trong hợp đồng.',
  CONTRACT_PRINT_SOURCE_CONFLICT:
    'Mẫu hoặc giá in không khớp với hợp đồng tiệc.',
  SETTLED_CONTRACT_REQUIRED:
    'Tiệc này chưa có hợp đồng thương mại gốc đã cọc. Vui lòng lập và duyệt hợp đồng chính thức trước khi thao tác phụ lục.',
  APPENDIX_APPROVAL_REQUIRED: 'Phụ lục hợp đồng cần sự phê duyệt đồng thuận từ cả hai bên.',
  APPENDIX_NOT_EDITABLE: 'Tiệc đã ở giai đoạn kết thúc hoặc tất toán. Không thể lập thêm phụ lục.',

  // Thanh toán, Sổ cái & Hoá đơn
  BILLING_RECORD_NOT_FOUND: 'Không tìm thấy hồ sơ thanh toán.',
  BILLING_ACCESS_DENIED: 'Phiên đăng nhập hoặc quyền xem hồ sơ không còn hợp lệ.',
  STALE_BILLING_REVISION: 'Số dư đã thay đổi. Hãy làm mới và kiểm tra lại trước khi xác nhận.',
  DEPOSIT_INTENT_ACTIVE: 'Đang có giao dịch đặt cọc chờ xử lý. Vui lòng kiểm tra lại sổ cái thanh toán.',
  PAYMENT_ATTEMPT_ACTIVE: 'Đang có giao dịch chưa rõ kết quả. Vui lòng đối soát trước khi thao tác.',
  DEPOSIT_NOT_ELIGIBLE: 'Hồ sơ chưa đủ điều kiện nhận cọc. Hãy kiểm tra lịch giữ chỗ và kịch bản đã duyệt.',
  DEPOSIT_NOT_SETTLED: 'Tiền cọc chưa được xác nhận hoàn tất.',
  PAYMENT_EVIDENCE_CONFLICT: 'Số tiền hoặc chứng từ không khớp với thỏa thuận cọc của hồ sơ tiệc.',
  PAYMENT_OUTCOME_UNKNOWN: 'Giao dịch chưa rõ kết quả. Vui lòng kiểm tra trạng thái thanh toán.',
  PAYMENT_QUERY_COOLDOWN: 'Cổng thanh toán yêu cầu chờ trước khi tra cứu lại giao dịch.',
  PAYMENT_PROVIDER_UNAVAILABLE: 'Chưa kết nối được cổng thanh toán để xác minh kết quả.',
  EVENT_NOT_ENDED: 'Tiệc chưa kết thúc; chỉ được chốt chi phí phát sinh và hoá đơn sau khi tan tiệc.',
  INVOICE_FINALIZED: 'Hoá đơn quyết toán cuối đã được chốt và khoá sổ.',
  INVOICE_FINALIZATION_REQUIRED: 'Cần chốt hoá đơn quyết toán trước khi hoàn tất thủ tục.',
  INVOICE_NOT_ELIGIBLE: 'Hồ sơ tiệc chưa đủ điều kiện lập hoá đơn quyết toán.',
  BALANCE_NOT_ELIGIBLE: 'Chưa đủ điều kiện thanh toán số dư còn lại.',
  BILLING_REFUND_LIMIT_EXCEEDED: 'Khoản hoàn vượt hạn mức đã duyệt hoặc số tiền còn được hoàn.',
  BILLING_REFUND_APPROVAL_REQUIRED: 'Yêu cầu hoàn tiền cần có sự phê duyệt trước.',
  BILLING_REFUND_NOT_APPROVED: 'Chưa có quyết định hoàn tiền hợp lệ cho khoản thanh toán này.',
  BILLING_BALANCE_LIMIT_EXCEEDED: 'Số tiền giao dịch vượt quá hạn mức thanh toán.',
  BILLING_AMOUNT_INVALID: 'Số tiền thanh toán không hợp lệ.',
  BILLING_TOTAL_OVERFLOW: 'Tổng số tiền thanh toán vượt quá giới hạn hệ thống.',
  BILLING_LEDGER_INCONSISTENT: 'Sổ cái thanh toán chưa nhất quán. Vui lòng đối soát lại.',
  REFUND_NOT_ALLOWED: 'Khoản thanh toán này không đủ điều kiện hoàn trả hoặc vượt hạn mức.',
  INCIDENTAL_EXPENSE_NOT_FOUND: 'Không tìm thấy dòng chi phí phát sinh này.',
  FINAL_INVOICE_EXISTS: 'Tiệc đã có hoá đơn quyết toán được lập.',
  FINAL_INVOICE_NOT_FOUND: 'Chưa có hoá đơn cuối cho tiệc này.',

  // Kịch bản (Timeline)
  TIMELINE_APPROVAL_WITHDRAWAL_REQUIRED:
    'Kịch bản đã được hai bên duyệt. Rút phê duyệt trước khi chuẩn bị phiên bản mới.',
  TIMELINE_APPROVAL_REQUIRES_ITEM:
    'Hãy thêm và lưu ít nhất một mốc trước khi phê duyệt kịch bản.',
  TIMELINE_WITHDRAWAL_NOT_ALLOWED:
    'Không thể rút phê duyệt kịch bản ở giai đoạn hiện tại.',
  TIMELINE_REVISION_SUPERSEDED:
    'Kịch bản đã có phiên bản mới hơn. Vui lòng tải lại.',
  TIMELINE_TEMPLATE_NOT_FOUND: 'Không tìm thấy mẫu kịch bản tiệc.',

  // Đơn in ấn & Thiệp
  PRINT_ORDER_NOT_FOUND: 'Không tìm thấy đơn in thiệp trong hệ thống.',
  PRINT_ORDER_STATUS_INVALID: 'Trạng thái đơn in hiện tại không cho phép thực hiện thao tác này.',
  PRINT_ORDER_REVISION_STALE: 'Đơn in vừa được cập nhật ở nơi khác. Vui lòng tải lại danh sách.',
  PRINT_ASSET_LIMIT: 'Tổng dung lượng ảnh trên thiết kế vượt quá giới hạn in ấn.',
  PRINT_CONTENT_OVERFLOW: 'Nội dung quá dài so với kích thước khổ in cho phép.',
  PRINTABLE_DIGEST_CONFLICT: 'Bản thiết kế vừa thay đổi trong lúc tạo file in. Hãy tạo lại file in.',

  // Khách & Sơ đồ bàn
  GUEST_GROUP_IN_USE: 'Nhóm khách còn người được xếp bàn. Vui lòng bỏ xếp bàn trước khi thao tác.',
  GUEST_LIST_CURSOR_STALE: 'Danh sách khách vừa thay đổi. Đang tải lại dữ liệu.',
  INVITATION_CREDENTIAL_ALREADY_ISSUED:
    'Liên kết mời đã được cấp. Hãy chọn “Cấp lại liên kết” nếu cần gửi mới.',
  SEATING_PLAN_EXISTS: 'Tiệc đã có sơ đồ bàn.',
  SEATING_REVISION_STALE: 'Sơ đồ vừa được cập nhật. Vui lòng tải lại phiên bản mới.',
  HEADCOUNT_OUTSIDE_LAYOUT_RANGE:
    'Số lượng khách nằm ngoài phạm vi bố trí của mẫu sơ đồ. Hãy chọn mẫu khác hoặc duyệt ngoại lệ.',
  GUEST_PLAN_CAPACITY_EXCEEDED:
    'Số lượng khách dự kiến vượt quá sức chứa tối đa của sảnh.',
  LAYOUT_RETIRED: 'Mẫu sơ đồ này đã ngừng sử dụng.',
  TABLE_NOT_IN_LAYOUT: 'Bàn tiệc không tồn tại trong sơ đồ hiện tại.',
  GUEST_GROUP_UNAVAILABLE: 'Nhóm khách không khả dụng hoặc đã bị lưu trữ.',

  // Check-in & Nhân sự
  NAMED_GUEST_LIST_REQUIRED: 'Cần có ít nhất một khách có tên để kích hoạt check-in theo tên.',
  CHECK_IN_CONFIGURATION_STALE: 'Cấu hình đón tiếp check-in vừa được thay đổi. Vui lòng làm mới.',
  CHECK_IN_MODE_LOCKED: 'Đã có khách điểm danh nên không thể thay đổi chế độ check-in.',
  CHECK_IN_NOT_OPEN: 'Bàn check-in chưa đến giờ mở hoặc chưa được quản lý kích hoạt.',
  CHECK_IN_WINDOW_CLOSED:
    'Bàn check-in chỉ mở trong khung giờ của tiệc. Ngoài giờ, quản lý check-in và ghi lý do.',
  MANAGER_OVERRIDE_REQUIRED: 'Tài khoản quản lý cần ghi lý do cho thao tác check-in này.',
  EVENT_ASSIGNMENT_REQUIRED: 'Bạn chưa được phân công vào tiệc này nên chưa mở được bàn check-in.',
  CHECK_IN_DISABLED: 'Tiệc này chưa bật check-in theo tên khách.',
  GUEST_NOT_FOUND: 'Không tìm thấy thông tin khách mời trong danh sách tiệc.',
  GUEST_ALREADY_CHECKED_IN: 'Khách này đã được điểm danh trước đó.',
  CHECK_IN_UNDO_EXPIRED: 'Đã quá thời gian cho phép hoàn tác điểm danh (5 giây).',
  STAFF_ACCOUNT_NOT_FOUND: 'Không tìm thấy tài khoản nhân sự.',
  STAFF_ALREADY_ASSIGNED: 'Nhân viên này đã được phân công vào ca tiệc.',
  ASSIGNMENT_NOT_FOUND: 'Không tìm thấy lịch phân công nhân viên.',

  // Danh mục (Catalog)
  HALL_NOT_FOUND: 'Không tìm thấy sảnh tiệc.',
  DISH_NOT_FOUND: 'Không tìm thấy món ăn.',
  MENU_PACKAGE_NOT_FOUND: 'Không tìm thấy gói thực đơn.',
  VERSION_NOT_FOUND: 'Không tìm thấy phiên bản tài liệu/danh mục.',
  VERSION_ALREADY_PUBLISHED: 'Phiên bản này đã được xuất bản chính thức, không thể ghi đè.',
  LAYOUT_TEMPLATE_NOT_FOUND: 'Không tìm thấy mẫu sơ đồ bàn.',
  MEDIA_CUTOFF_REACHED: 'Đã quá hạn đăng tải hình ảnh cho tiệc.',
  NOTIFICATION_REVISION_STALE: 'Hộp thư thông báo vừa được cập nhật. Vui lòng làm mới.',
  CATALOG_HALL_CAPACITY_CONFLICT: 'Sức chứa sảnh tiệc không hợp lệ hoặc xung đột với cấu hình hiện tại.',
  CATALOG_DRAFT_CONFLICT: 'Bản nháp danh mục đang có xung đột phiên bản.',
  CATALOG_DISH_REFERENCE_CONFLICT: 'Món ăn đang được sử dụng trong gói thực đơn, không thể xoá.',
  CATALOG_LIFECYCLE_CONFLICT: 'Trạng thái danh mục không cho phép thực hiện thao tác này.',
  CATALOG_PUBLISH_CONFLICT: 'Không thể xuất bản danh mục do xung đột phiên bản.',
};

function hasVietnamese(str: string): boolean {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(str);
}

function isMachineCodeOrEnglishStatus(str: string): boolean {
  const trimmed = str.trim();
  return (
    /^[A-Z0-9_-]+$/.test(trimmed) ||
    /^Request failed with status code \d+$/i.test(trimmed) ||
    trimmed === 'Network Error' ||
    trimmed === 'Request failed' ||
    trimmed === 'provider message' ||
    trimmed === 'Failed to fetch' ||
    trimmed === 'Load failed' ||
    (!hasVietnamese(trimmed) && /^[A-Za-z0-9\s.,!?:;'"()_-]+$/.test(trimmed))
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
      const details = Array.isArray(e.details)
        ? (e.details as Array<{ path?: string; code?: string; message?: string }>)
        : undefined;
      const fieldHints =
        details && details.length > 0
          ? ' (' + details.map((d) => d.path || d.code || d.message).join(', ') + ')'
          : '';

      const translatedCode = code ? KNOWN_CODE_TRANSLATIONS[code] : undefined;
      const translatedMsg = rawMsg ? KNOWN_CODE_TRANSLATIONS[rawMsg] : undefined;

      if (status === 429 || code === 'RATE_LIMITED') {
        title = 'Giới hạn thao tác (429)';
        message =
          options?.fallbackMessage ??
          translatedCode ??
          'Đã vượt quá số lần gửi lời mời cho phép trong 24 giờ. Vui lòng chờ trước khi gửi lại hoặc kiểm tra email đã nhận.';
        return { title, message, requestId };
      }

      if (status === 401 || code === 'UNAUTHORIZED' || code === 'AUTHENTICATION_REQUIRED') {
        title = 'Hết phiên đăng nhập (401)';
        message =
          options?.fallbackMessage ??
          translatedCode ??
          'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';
        return { title, message, requestId };
      }

      if (status === 403 || code === 'FORBIDDEN') {
        title = 'Từ chối quyền truy cập (403)';
        message =
          options?.fallbackMessage ??
          translatedCode ??
          'Tài khoản của bạn không có quyền thực hiện thao tác này.';
        return { title, message, requestId };
      }

      if (status === 404 || code === 'NOT_FOUND') {
        title = 'Không tìm thấy dữ liệu (404)';
        message =
          options?.fallbackMessage ??
          translatedCode ??
          (rawMsg && !isMachineCodeOrEnglishStatus(rawMsg)
            ? rawMsg
            : 'Dữ liệu yêu cầu không tồn tại hoặc đã bị xóa.');
        return { title, message, requestId };
      }

      if (status === 422 || code === 'VALIDATION_ERROR' || code === 'VALIDATION_FAILED') {
        title = 'Dữ liệu chưa hợp lệ (422)';
        message =
          options?.fallbackMessage ??
          ((translatedCode ??
            (rawMsg && !isMachineCodeOrEnglishStatus(rawMsg)
              ? rawMsg
              : 'Dữ liệu nhập chưa hợp lệ. Vui lòng kiểm tra lại các trường thông tin.')) +
            fieldHints);
        return { title, message, requestId };
      }

      if (status === 409 || code?.includes('STALE') || code === 'CONFLICT') {
        title = 'Xung đột dữ liệu (409)';
        message =
          options?.fallbackMessage ??
          translatedCode ??
          (rawMsg && !isMachineCodeOrEnglishStatus(rawMsg)
            ? rawMsg
            : 'Dữ liệu trên máy chủ đã thay đổi bởi phiên làm việc khác. Vui lòng tải lại.');
        return { title, message, requestId };
      }

      if (status && status >= 500) {
        title = `Lỗi máy chủ (${status})`;
        message =
          options?.fallbackMessage ??
          translatedCode ??
          'Máy chủ gặp sự cố xử lý hoặc đang bảo trì. Vui lòng thử lại sau ít phút.';
        return { title, message, requestId };
      }

      if (options?.fallbackMessage) {
        message = options.fallbackMessage;
      } else if (translatedCode) {
        message = translatedCode + fieldHints;
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
      } else {
        message = 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại đường truyền.';
      }
    }

    return { title, message, requestId };
  }
}

export const notify = new NotificationService();
