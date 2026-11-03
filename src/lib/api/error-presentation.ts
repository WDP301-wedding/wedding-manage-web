import { codeMessages } from './error-messages.vi';

export type ErrorFacts = Readonly<{
  code?: string | undefined;
  message?: string | undefined;
  status?: number | undefined;
  kind?: string | undefined;
}>;
export type FriendlyError = Readonly<{
  message: string;
  requestId: string | null;
  code: string | null;
  status?: number | undefined;
}>;
const variants: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  BOOKING_CANCELLATION_NOT_ALLOWED: {
    'Cancellation is closed after the event starts.':
      'Không thể hủy tiệc vì đã đến hoặc qua giờ bắt đầu tiệc.',
    'The booking phase cannot be cancelled.': 'Không thể hủy tiệc ở trạng thái hiện tại.',
  },
};
const statuses: Readonly<Record<number, string>> = {
  400: 'Yêu cầu chưa hợp lệ. Hãy kiểm tra lại thông tin đã nhập.',
  401: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu hoặc bạn không có quyền truy cập.',
  409: 'Thao tác chưa đáp ứng điều kiện hiện tại. Hãy kiểm tra lại hồ sơ trước khi tiếp tục.',
  422: 'Dữ liệu chưa hợp lệ. Hãy kiểm tra các trường được đánh dấu.',
  429: 'Bạn đã gửi quá nhiều yêu cầu. Hãy chờ rồi thử lại.',
  500: 'Máy chủ gặp sự cố xử lý. Vui lòng liên hệ nhà hàng kèm mã hỗ trợ.',
  502: 'Máy chủ tạm thời không phản hồi hợp lệ. Vui lòng thử lại sau.',
  503: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.',
  504: 'Máy chủ phản hồi quá lâu. Hãy kiểm tra trạng thái trước khi thử lại thao tác.',
};
export function vietnameseMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim().normalize('NFC');
  if (
    !text ||
    text.length > 800 ||
    /<[^>]*>|(?:DOCTYPE|TypeError|SyntaxError|PrismaClient|ZodError)/i.test(text)
  )
    return undefined;
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/iu.test(text)
    ? text
    : undefined;
}
function knownMessage(key: string | undefined): string | undefined {
  return key && Object.hasOwn(codeMessages, key) ? codeMessages[key] : undefined;
}
export function apiErrorMessage(
  facts: ErrorFacts,
  overrides: Readonly<Record<string, string>> = {},
): string {
  const { code, message, status, kind } = facts;
  if (kind === 'network') return knownMessage('NETWORK_ERROR')!;
  if (kind === 'timeout') return knownMessage('REQUEST_TIMEOUT')!;
  if (kind === 'malformed-response')
    return (status ? statuses[status] : undefined) ?? knownMessage('MALFORMED_RESPONSE')!;
  if (kind === 'aborted') return knownMessage('REQUEST_ABORTED')!;
  const supplied = vietnameseMessage(message);
  if (supplied) return supplied;
  const choices = code && Object.hasOwn(variants, code) ? variants[code] : undefined;
  const precise =
    choices && message && Object.hasOwn(choices, message) ? choices[message] : undefined;
  return (
    precise ??
    (code ? (vietnameseMessage(overrides[code]) ?? knownMessage(code)) : undefined) ??
    (message ? knownMessage(message) : undefined) ??
    (status ? statuses[status] : undefined) ??
    'Không thể hoàn tất thao tác. Hãy kiểm tra trạng thái và liên hệ nhà hàng kèm mã hỗ trợ nếu cần.'
  );
}
function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}
function statusOf(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 400 && value <= 599
    ? value
    : undefined;
}
const fieldLabels: Readonly<Record<string, string>> = {
  eventDate: 'Ngày tổ chức',
  preferredDate: 'Ngày mong muốn',
  displayName: 'Họ tên',
  brideName: 'Tên cô dâu',
  groomName: 'Tên chú rể',
  email: 'Email',
  phone: 'Số điện thoại',
  password: 'Mật khẩu',
  currentPassword: 'Mật khẩu hiện tại',
  newPassword: 'Mật khẩu mới',
  otp: 'Mã xác thực',
  headcount: 'Số khách',
  planningHeadcount: 'Số khách dự kiến',
  expectedGuests: 'Số khách dự kiến',
  tableCount: 'Số bàn',
  hallId: 'Sảnh tiệc',
  shiftCode: 'Ca tiệc',
  quantity: 'Số lượng',
  unitPriceVnd: 'Đơn giá',
  amountVnd: 'Số tiền',
  reason: 'Lý do',
  name: 'Tên',
  note: 'Ghi chú',
  lines: 'Hạng mục',
  items: 'Nội dung',
  startTime: 'Giờ bắt đầu',
  endTime: 'Giờ kết thúc',
};
export function presentError(
  input: unknown,
  overrides: Readonly<Record<string, string>> = {},
): FriendlyError {
  let value: unknown = input,
    status: number | undefined,
    requestId: string | null = null;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 5; depth++) {
    if (seen.has(value)) break;
    seen.add(value);
    const current = record(value);
    if (!current) break;
    const response = record(current.response);
    status = statusOf(current.status) ?? statusOf(response?.status) ?? status;
    if (typeof current.requestId === 'string' && current.requestId.length <= 120)
      requestId = current.requestId;
    const envelope =
      record(record(response?.data)?.error) ??
      record(current.error) ??
      record(record(current.data)?.error);
    if (envelope) {
      value = envelope;
      continue;
    }
    if (typeof current.code === 'string' && !current.code.startsWith('ERR_')) break;
    if (record(current.cause)) {
      value = current.cause;
      continue;
    }
    break;
  }
  const error = record(value);
  const candidate =
    typeof error?.code === 'string'
      ? error.code
      : typeof value === 'string' && knownMessage(value)
        ? value
        : null;
  const code = candidate && /^[A-Z][A-Z0-9_]{1,99}$/.test(candidate) ? candidate : null;
  const message =
    typeof error?.backendMessage === 'string'
      ? error.backendMessage
      : typeof error?.message === 'string'
        ? error.message
        : typeof value === 'string'
          ? value
          : undefined;
  const kind = typeof error?.kind === 'string' ? error.kind : undefined;
  let text = apiErrorMessage({ code: code ?? undefined, message, status, kind }, overrides);
  if (status === 422 && Array.isArray(error?.details)) {
    const fields = [
      ...new Set(
        error.details.flatMap((detail: unknown) => {
          const path = record(detail)?.path;
          if (typeof path !== 'string') return [];
          return path
            .replaceAll('[', '.')
            .replaceAll(']', '.')
            .split('.')
            .flatMap((part) => (fieldLabels[part] ? [fieldLabels[part]] : []));
        }),
      ),
    ].slice(0, 5);
    if (fields.length) text += ' Kiểm tra: ' + fields.join(', ') + '.';
  }
  return { message: text, requestId, code, status };
}

/** Localize validation hints without changing paths/codes used by form logic. */
export function localizeErrorDetails<
  T extends { readonly path: string; readonly code: string; readonly message: string },
>(details: readonly T[] | undefined): readonly T[] | undefined {
  const reasons: Readonly<Record<string, string>> = {
    too_small: 'Giá trị quá ngắn hoặc nhỏ hơn mức cho phép.',
    too_big: 'Giá trị quá dài hoặc lớn hơn mức cho phép.',
    invalid_format: 'Thông tin không đúng định dạng.',
    invalid_type: 'Kiểu dữ liệu chưa hợp lệ.',
    invalid_value: 'Giá trị chưa hợp lệ.',
    unrecognized_keys: 'Có thông tin không được phép gửi lên.',
    custom: 'Thông tin chưa đáp ứng điều kiện yêu cầu.',
  };
  return details?.map((detail) => ({
    ...detail,
    message:
      vietnameseMessage(detail.message) ??
      reasons[detail.code] ??
      'Giá trị chưa hợp lệ. Hãy kiểm tra lại thông tin.',
  }));
}
