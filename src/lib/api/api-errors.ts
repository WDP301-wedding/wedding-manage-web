import { ApiClientError } from './client';
import { ApiServiceError } from './axios-client';

/**
 * Chuyển lỗi API thành câu tiếng Việt chuẩn cho người dùng nghiệp vụ nhà hàng.
 *
 * Nguyên tắc thiết kế (Hỷ Yến API Specification):
 * 1. Xử lý dựa trên `error.code`, không phụ thuộc vào `message` tiếng Anh của backend.
 * 2. Luôn kèm `requestId` để quản lý/nhân viên đối soát log hệ thống khi có sự cố.
 * 3. Hỗ trợ ghi đè `overrides` theo từng màn hình cụ thể.
 * 4. Lỗi 422 Validation Error hiển thị chi tiết trường sai sót để người dùng sửa ngay.
 */
const codeMessages: Record<string, string> = {
  CUSTOMER_SELECTION_REQUIRED: 'Cần khách lưu và gửi lựa chọn trước khi lập hợp đồng.',
  CUSTOMER_SELECTION_LOCKED:
    'Lựa chọn đã gửi hoặc hợp đồng đã được nhà hàng soạn. Bạn không thể tự sửa; vui lòng liên hệ nhà hàng.',
  TIMELINE_APPROVAL_WITHDRAWAL_REQUIRED:
    'Kịch bản đã được hai bên duyệt. Rút phê duyệt trước khi chuẩn bị phiên bản mới.',
  // Xác thực & Phân quyền
  AUTHENTICATION_REQUIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  UNAUTHORIZED: 'Bạn chưa đăng nhập hoặc phiên làm việc đã kết thúc.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này ở vai trò hiện tại.',
  IDEMPOTENCY_KEY_REUSED:
    'Thao tác bị trùng khoá Idempotency với yêu cầu trước đó. Vui lòng tải lại trang.',
  REQUEST_IN_PROGRESS: 'Yêu cầu trước đang được xử lý trên máy chủ. Vui lòng đợi trong giây lát.',
  VALIDATION_FAILED: 'Dữ liệu nhập chưa hợp lệ. Vui lòng kiểm tra lại các trường thông tin.',
  VALIDATION_ERROR: 'Dữ liệu không đáp ứng quy chuẩn. Vui lòng kiểm tra lại các trường thông tin.',

  // Tư vấn & Đặt chỗ
  CONSULTATION_REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu tư vấn.',
  CONSULTATION_ALREADY_CONVERTED: 'Yêu cầu tư vấn này đã được chuyển thành booking trước đó.',
  BOOKING_NOT_FOUND: 'Không tìm thấy hồ sơ tiệc trong hệ thống.',
  BOOKING_SLOT_UNAVAILABLE: 'Sảnh và ca này đã có tiệc xác nhận hoặc đang được giữ chỗ.',
  SLOT_UNAVAILABLE: 'Khung giờ này đã kín lịch. Vui lòng chọn ngày, ca hoặc sảnh khác.',
  BOOKING_CANCELLED: 'Tiệc này đã bị huỷ.',
  BOOKING_COMPLETED: 'Tiệc này đã hoàn tất tổ chức và quyết toán.',

  // Thoả thuận, Hợp đồng & Cọc
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
  DEPOSIT_INTENT_ACTIVE:
    'Đang có giao dịch đặt cọc chờ xử lý. Vui lòng kiểm tra lại sổ cái thanh toán.',
  PAYMENT_ATTEMPT_ACTIVE:
    'Đang có giao dịch chưa rõ kết quả. Vui lòng đối soát trước khi thao tác.',
  CONTRACT_PRINT_SOURCE_ALLOCATED:
    'Mẫu in này đã được gửi vào xưởng in nên không thể đổi hoặc huỷ.',
  CONTRACT_PRINT_QUANTITY_ALLOCATED: 'Không thể giảm số lượng in đã đưa vào quy trình sản xuất.',
  SETTLED_CONTRACT_REQUIRED:
    'Tiệc này chưa có hợp đồng thương mại gốc. Vui lòng lập và duyệt hợp đồng chính thức trước khi thao tác phụ lục.',
  APPENDIX_APPROVAL_REQUIRED: 'Phụ lục hợp đồng cần sự phê duyệt đồng thuận từ cả hai bên.',

  // Thanh toán, Sổ cái & Hoá đơn
  EVENT_NOT_ENDED:
    'Tiệc chưa kết thúc; chỉ được chốt chi phí phát sinh và hoá đơn sau khi tan tiệc.',
  INVOICE_FINALIZED: 'Hoá đơn quyết toán cuối đã được chốt và khoá sổ.',
  STALE_BILLING_REVISION:
    'Dữ liệu công nợ vừa thay đổi. Vui lòng tải lại trang trước khi ghi nhận tiền.',
  REFUND_NOT_ALLOWED: 'Khoản thanh toán này không đủ điều kiện hoàn trả hoặc vượt hạn mức.',
  INCIDENTAL_EXPENSE_NOT_FOUND: 'Không tìm thấy dòng chi phí phát sinh này.',
  FINAL_INVOICE_EXISTS: 'Tiệc đã có hoá đơn quyết toán được lập.',
  FINAL_INVOICE_NOT_FOUND: 'Chưa có hoá đơn cuối cho tiệc này.',

  // Đơn in ấn & Thiệp
  PRINT_ORDER_NOT_FOUND: 'Không tìm thấy đơn in thiệp trong hệ thống.',
  PRINT_ORDER_STATUS_INVALID: 'Trạng thái đơn in hiện tại không cho phép thực hiện thao tác này.',
  PRINT_ORDER_REVISION_STALE: 'Đơn in vừa được cập nhật ở nơi khác. Vui lòng tải lại danh sách.',

  // Khách, Sơ đồ & Sảnh
  GUEST_GROUP_IN_USE: 'Nhóm khách còn người được xếp bàn. Vui lòng bỏ xếp bàn trước khi thao tác.',
  GUEST_LIST_CURSOR_STALE: 'Danh sách khách vừa thay đổi. Đang tải lại dữ liệu.',
  INVITATION_CREDENTIAL_ALREADY_ISSUED:
    'Liên kết mời đã được cấp. Hãy chọn “Cấp lại liên kết” nếu cần gửi mới.',
  SEATING_PLAN_EXISTS: 'Tiệc đã có sơ đồ bàn.',
  SEATING_REVISION_STALE: 'Sơ đồ vừa được cập nhật. Vui lòng tải lại phiên bản mới.',
  HEADCOUNT_OUTSIDE_LAYOUT_RANGE:
    'Số lượng khách nằm ngoài phạm vi bố trí của mẫu sơ đồ. Hãy chọn mẫu khác hoặc duyệt ngoại lệ.',
  LAYOUT_RETIRED: 'Mẫu sơ đồ này đã ngừng sử dụng.',
  TABLE_NOT_IN_LAYOUT: 'Bàn tiệc không tồn tại trong sơ đồ hiện tại.',
  GUEST_GROUP_UNAVAILABLE: 'Nhóm khách không khả dụng hoặc đã bị lưu trữ.',

  // Check-in & Nhân sự
  NAMED_GUEST_LIST_REQUIRED: 'Cần có ít nhất một khách có tên để kích hoạt check-in theo tên.',
  CHECK_IN_CONFIGURATION_STALE: 'Cấu hình đón tiếp check-in vừa được thay đổi. Vui lòng làm mới.',
  CHECK_IN_MODE_LOCKED: 'Đã có khách điểm danh nên không thể thay đổi chế độ check-in.',
  CHECK_IN_NOT_OPEN: 'Bàn check-in chưa đến giờ mở hoặc chưa được quản lý kích hoạt.',
  GUEST_NOT_FOUND: 'Không tìm thấy thông tin khách mời trong danh sách tiệc.',
  GUEST_ALREADY_CHECKED_IN: 'Khách này đã được điểm danh trước đó.',
  CHECK_IN_UNDO_EXPIRED: 'Đã quá thời gian cho phép hoàn tác điểm danh (5 giây).',
  STAFF_ACCOUNT_NOT_FOUND: 'Không tìm thấy tài khoản nhân sự.',
  STAFF_ALREADY_ASSIGNED: 'Nhân viên này đã được phân công vào ca tiệc.',
  ASSIGNMENT_NOT_FOUND: 'Không tìm thấy lịch phân công nhân viên.',

  // Catalog
  HALL_NOT_FOUND: 'Không tìm thấy sảnh tiệc.',
  DISH_NOT_FOUND: 'Không tìm thấy món ăn.',
  MENU_PACKAGE_NOT_FOUND: 'Không tìm thấy gói thực đơn.',
  VERSION_NOT_FOUND: 'Không tìm thấy phiên bản tài liệu/danh mục.',
  VERSION_ALREADY_PUBLISHED: 'Phiên bản này đã được xuất bản chính thức, không thể ghi đè.',
  LAYOUT_TEMPLATE_NOT_FOUND: 'Không tìm thấy mẫu sơ đồ bàn.',
  TIMELINE_TEMPLATE_NOT_FOUND: 'Không tìm thấy mẫu kịch bản tiệc.',
  MEDIA_CUTOFF_REACHED: 'Đã quá hạn đăng tải hình ảnh cho tiệc.',
  NOTIFICATION_REVISION_STALE: 'Hộp thư thông báo vừa được cập nhật. Vui lòng làm mới.',
};

const statusMessages: Record<number, string> = {
  400: 'Dữ liệu gửi lên không đúng định dạng.',
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn chưa có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu trên hệ thống.',
  409: 'Dữ liệu vừa được cập nhật bởi người dùng khác. Vui lòng tải lại trang.',
  422: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các mục báo đỏ.',
  429: 'Thao tác quá nhanh. Vui lòng đợi trong giây lát.',
  500: 'Máy chủ gặp sự cố nội bộ. Vui lòng liên hệ bộ phận kỹ thuật.',
  503: 'Dịch vụ tạm thời bận hoặc bảo trì. Vui lòng thử lại sau.',
};

export interface FriendlyError {
  readonly message: string;
  readonly requestId: string | null;
  readonly code: string | null;
  readonly status?: number | undefined;
}

export function describeApiError(
  error: unknown,
  overrides: Record<string, string> = {},
): FriendlyError {
  if (error instanceof ApiClientError) {
    if (error.kind === 'network' || error.kind === 'timeout') {
      return {
        message:
          'Không kết nối được tới máy chủ. Vui lòng kiểm tra mạng (thao tác sẽ không bị ghi đè lặp lại).',
        requestId: error.requestId,
        code: error.code,
        status: error.status,
      };
    }

    const message =
      overrides[error.code] ??
      codeMessages[error.code] ??
      (error.status !== undefined ? statusMessages[error.status] : undefined) ??
      error.message ??
      'Máy chủ từ chối yêu cầu.';

    const fieldHints =
      error.status === 422 && error.details?.length
        ? ' (' + error.details.map((d) => d.path || d.code).join(', ') + ')'
        : '';

    return {
      message: message + fieldHints,
      requestId: error.requestId,
      code: error.code,
      status: error.status,
    };
  }

  if (error instanceof ApiServiceError) {
    const message =
      overrides[error.code] ??
      codeMessages[error.code] ??
      (error.status !== undefined ? statusMessages[error.status] : undefined) ??
      error.message ??
      'Yêu cầu dịch vụ thất bại.';

    const fieldHints =
      error.status === 422 && error.details?.length
        ? ' (' + error.details.map((d) => d.path || d.code).join(', ') + ')'
        : '';

    return {
      message: message + fieldHints,
      requestId: error.requestId,
      code: error.code,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || 'Đã có lỗi không mong muốn xảy ra.',
      requestId: null,
      code: null,
    };
  }

  return {
    message: typeof error === 'string' ? error : 'Đã có lỗi không mong muốn.',
    requestId: null,
    code: null,
  };
}

export function isConflict(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.status === 409;
  }
  if (error instanceof ApiServiceError) {
    return error.status === 409;
  }
  return false;
}
