/** Shared Vietnamese presentation catalog. Match API codes; never infer business state from HTTP status alone. */
export const codeMessages: Readonly<Record<string, string>> = {
  PRINT_CONTRACT_COPIES_AVAILABLE:
    'Hợp đồng đã có số thiệp chưa in với quy cách này. Hãy dùng phần in theo hợp đồng bên dưới để tránh trả tiền lần hai.',
  PRINT_PRICE_INVALID: 'Quy cách in chưa có giá hợp lệ. Vui lòng liên hệ nhà hàng.',
  PRINT_POST_DEPOSIT_ONLY:
    'Thiệp in được đặt riêng sau đặt cọc. Hãy bỏ hạng mục in khỏi lựa chọn hợp đồng ban đầu.',
  PRINT_APPENDIX_PENDING:
    'Tiệc đang có phụ lục chờ xử lý. Hãy hoàn tất hoặc rút yêu cầu đang chờ rồi xem lại giá in.',
  PRINT_PURCHASE_USE_APPROVAL:
    'Đơn này đã có xác nhận chi phí. Nhà hàng cần duyệt đơn và phụ lục cùng nhau.',
  PRINTABLE_SEATING_REQUIRES_REVIEW:
    'Sơ đồ bàn chưa được xác nhận hoặc cần kiểm tra lại. Hãy hoàn tất sơ đồ ở Nhóm & sơ đồ.',
  PRINT_QUOTE_STALE: 'Nội dung hoặc giá đã thay đổi. Hãy xem lại bản in và giá trước khi xác nhận.',
  PRINT_QUOTE_EXPIRED: 'Giá in đã hết hiệu lực. Hãy lấy bản xem trước và giá mới.',
  CONTRACT_PRINT_TEMPLATE_CONFLICT:
    'Quy cách in không phù hợp với mẫu thiệp đã lưu. Hãy chọn quy cách tương ứng.',
  SETTLED_CONTRACT_REQUIRED:
    'Cần hợp đồng đã được hai bên phê duyệt và đặt cọc thành công trước khi thực hiện thao tác này.',
  LEGACY_COMMERCIAL_CONVERSION_BLOCKED:
    'Tiệc theo thỏa thuận cũ đã có chứng từ hoặc giao dịch cọc. Nhà hàng cần đối soát trước khi thay đổi mô hình hợp đồng.',
  FINANCIAL_REVIEW_REQUIRED:
    'Hồ sơ có chứng từ tài chính cần nhà hàng đối soát trước khi mở lại lựa chọn.',
  DEPOSIT_IN_PROGRESS:
    'Đang có giao dịch đặt cọc chưa hoàn tất. Xem trạng thái tại Thanh toán & công nợ.',
  PAYMENT_OUTCOME_UNKNOWN:
    'Chưa xác định được kết quả giao dịch cọc. Kiểm tra thanh toán trước khi thay đổi nội dung.',
  DEPOSIT_SETTLED:
    'Tiệc đã có thanh toán được xác nhận. Không thể sửa lựa chọn ban đầu; xem thỏa thuận hiện hành và phụ lục.',
  BOOKING_NOT_EDITABLE:
    'Hồ sơ không ở bước chỉnh sửa lựa chọn. Liên hệ nhà hàng để kiểm tra tiến trình hiện tại.',
  BOOKING_CLOSED: 'Tiệc đã kết thúc hoặc bị hủy. Không thể sửa lựa chọn ban đầu.',
  CUSTOMER_SELECTION_SUBMITTED:
    'Lựa chọn đã được gửi nhà hàng. Liên hệ nhà hàng nếu cần điều chỉnh.',
  CONTRACT_DRAFT_EXISTS:
    'Nhà hàng đã soạn hợp đồng. Kiểm tra nội dung hợp đồng hiện tại thay vì sửa lựa chọn ban đầu.',
  CONTRACT_APPROVED:
    'Nội dung đã được chốt theo tiến trình tiệc. Xem hợp đồng hoặc liên hệ nhà hàng.',
  CONSULTATION_REQUEST_NOT_FOUND: 'Không tìm thấy yêu cầu tư vấn.',
  CONSULTATION_REQUEST_NOT_OPEN: 'Yêu cầu tư vấn đã đóng hoặc đã được xử lý.',
  CONSULTATION_ALREADY_EXISTS: 'Yêu cầu tư vấn đã tồn tại.',
  CONSULTATION_ALREADY_CONVERTED: 'Yêu cầu tư vấn này đã được chuyển thành booking trước đó.',
  CONSULTATION_HALL_UNAVAILABLE:
    'Sảnh tiệc vừa ngừng phục vụ hoặc đã kín lịch. Vui lòng đổi lựa chọn khác.',
  CONSULTATION_MENU_UNAVAILABLE: 'Gói thực đơn vừa ngừng phục vụ. Vui lòng đổi lựa chọn khác.',
  BOOKING_NOT_FOUND: 'Không tìm thấy hồ sơ đặt tiệc.',
  BOOKING_SLOT_UNAVAILABLE: 'Sảnh và ca này đã có tiệc xác nhận hoặc đang được giữ chỗ.',
  SLOT_UNAVAILABLE: 'Khung giờ này đã kín lịch. Vui lòng chọn ngày, ca hoặc sảnh khác.',
  SLOT_NOT_AVAILABLE: 'Khung giờ này không khả dụng. Vui lòng chọn ngày hoặc ca khác.',
  BOOKING_CANCELLED: 'Tiệc này đã bị huỷ.',
  BOOKING_COMPLETED: 'Tiệc này đã hoàn tất tổ chức và quyết toán.',
  BOOKING_NOT_PAYABLE: 'Hồ sơ tiệc chưa đủ điều kiện thanh toán hoặc đã hoàn tất quyết toán.',
  INVALID_BOOKING_TRANSITION: 'Không thể chuyển trạng thái hồ sơ tiệc theo yêu cầu.',
  STALE_BOOKING_REVISION: 'Hồ sơ tiệc vừa được cập nhật ở nơi khác. Vui lòng tải lại.',
  STALE_CONSULTATION_REVISION: 'Hồ sơ tư vấn vừa được cập nhật ở nơi khác. Vui lòng tải lại.',
  CUSTOMER_SELECTION_REQUIRED: 'Cần khách lưu và gửi lựa chọn trước khi lập hợp đồng.',
  CUSTOMER_SELECTION_LOCKED:
    'Lựa chọn đã gửi hoặc hợp đồng đã được nhà hàng soạn. Bạn không thể tự sửa; vui lòng liên hệ nhà hàng.',
  TIMELINE_APPROVAL_WITHDRAWAL_REQUIRED:
    'Kịch bản đã được hai bên duyệt. Rút phê duyệt trước khi chuẩn bị phiên bản mới.',
  TIMELINE_APPROVAL_REQUIRES_ITEM: 'Hãy thêm và lưu ít nhất một mốc trước khi phê duyệt kịch bản.',
  TIMELINE_WITHDRAWAL_NOT_ALLOWED: 'Không thể rút phê duyệt kịch bản ở giai đoạn hiện tại.',
  TIMELINE_REVISION_SUPERSEDED: 'Kịch bản đã có phiên bản mới hơn. Vui lòng tải lại.',
  TIMELINE_ITEM_COUNT_INVALID: 'Kịch bản chỉ hỗ trợ tối đa 100 mốc thời gian.',
  TIMELINE_ITEM_TEXT_INVALID: 'Nội dung mốc thời gian phải từ 1–120 ký tự.',
  TIMELINE_ITEM_TIME_INVALID: 'Giờ bắt đầu mỗi mốc không hợp lệ theo khung giờ của tiệc.',
  TIMELINE_TIME_OUT_OF_RANGE: 'Giờ bắt đầu mỗi mốc phải nằm trong khung giờ của tiệc.',
  TIMELINE_ORDER_INVALID: 'Thứ tự các mốc thời gian không hợp lệ. Vui lòng kiểm tra lại.',
  AUTHENTICATION_REQUIRED: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
  SESSION_EXPIRED: 'Phiên làm việc đã hết hạn. Hãy đăng nhập lại.',
  IDEMPOTENCY_KEY_REUSED:
    'Yêu cầu bị trùng với một thao tác trước có nội dung khác. Hãy tải lại trang.',
  REQUEST_IN_PROGRESS: 'Yêu cầu trước đang được xử lý. Hãy đợi vài giây rồi thử lại.',
  VALIDATION_FAILED: 'Dữ liệu chưa hợp lệ. Hãy kiểm tra lại các trường.',
  VALIDATION_ERROR: 'Dữ liệu chưa hợp lệ. Hãy kiểm tra lại các trường.',
  MALFORMED_JSON: 'Dữ liệu gửi lên không đúng định dạng.',
  PAYLOAD_TOO_LARGE: 'Tệp tải lên vượt quá dung lượng cho phép.',
  SERVICE_UNAVAILABLE: 'Dịch vụ tạm thời bận hoặc bảo trì. Vui lòng thử lại sau.',
  INTERNAL_ERROR: 'Máy chủ gặp sự cố xử lý. Vui lòng thử lại sau ít phút.',
  COUPLE_NAMES_INCOMPLETE: 'Cần nhập đủ tên cô dâu và chú rể trước khi gửi duyệt hợp đồng.',
  COMMERCIAL_PRICE_REVISION_STALE:
    'Giá trong danh mục vừa thay đổi. Hãy tải lại và chọn lại món, dịch vụ hoặc mẫu in.',
  OFFERING_NOT_SELECTABLE: 'Một lựa chọn không còn được bán. Hãy chọn lại.',
  CONTRACT_REVISION_STALE:
    'Hợp đồng vừa được cập nhật ở nơi khác. Hãy tải lại để xem bản mới nhất.',
  COMMERCIAL_PREDECESSOR_STALE: 'Thoả thuận đã có bản mới hơn. Hãy tải lại trước khi tiếp tục.',
  CONTRACT_APPROVAL_REQUIRED: 'Hợp đồng cần được cả hai bên duyệt trước.',
  CONTRACT_DISTINCT_APPROVERS_REQUIRED: 'Mỗi bên chỉ duyệt một lần; cần bên còn lại duyệt.',
  CONTRACT_NOT_EDITABLE: 'Hợp đồng không còn sửa được ở trạng thái hiện tại.',
  CONTRACT_CAPACITY_EXCEEDED: 'Số bàn hoặc số khách vượt sức chứa của sảnh.',
  COMMERCIAL_AMOUNT_OVERFLOW: 'Tổng tiền vượt giới hạn cho phép. Hãy giảm số lượng.',
  DEPOSIT_INTENT_ACTIVE:
    'Đang có giao dịch đặt cọc chưa rõ kết quả. Hãy kiểm tra trạng thái thanh toán.',
  PAYMENT_ATTEMPT_ACTIVE: 'Đang có giao dịch chưa rõ kết quả. Hãy kiểm tra trạng thái thanh toán.',
  PAYMENT_QUERY_COOLDOWN:
    'Cổng thanh toán chưa cho phép kiểm tra lại giao dịch. Hãy chờ theo thời gian hiển thị.',
  PAYMENT_PROVIDER_UNAVAILABLE:
    'Chưa kết nối được VNPay để xác minh kết quả. Hãy kiểm tra lại sau; chưa tạo giao dịch mới khi kết quả còn chưa rõ.',
  CONTRACT_PRINT_SOURCE_ALLOCATED: 'Mẫu in này đã được đưa vào sản xuất nên không thể bỏ hoặc đổi.',
  CONTRACT_PRINT_QUANTITY_ALLOCATED: 'Không thể giảm số lượng in đã đưa vào sản xuất.',
  EVENT_NOT_ENDED: 'Tiệc chưa kết thúc.',
  INVOICE_FINALIZED: 'Hoá đơn quyết toán đã được chốt. Không thể thay đổi thoả thuận.',
  INVOICE_FINALIZATION_REQUIRED: 'Cần chốt hoá đơn quyết toán trước khi hoàn tất thủ tục.',
  INVOICE_NOT_ELIGIBLE: 'Chỉ được lập quyết toán sau khi đánh dấu tiệc đã tổ chức xong.',
  BALANCE_NOT_ELIGIBLE: 'Chỉ được thu phần còn lại sau khi đánh dấu tiệc đã tổ chức xong.',
  BILLING_RECORD_NOT_FOUND: 'Không tìm thấy hồ sơ thanh toán.',
  BILLING_ACCESS_DENIED: 'Phiên đăng nhập hoặc quyền xem hồ sơ không còn hợp lệ.',
  BILLING_REFUND_LIMIT_EXCEEDED: 'Khoản hoàn vượt hạn mức đã duyệt hoặc số tiền còn được hoàn.',
  BILLING_REFUND_APPROVAL_REQUIRED: 'Yêu cầu hoàn tiền cần có sự phê duyệt trước.',
  BILLING_REFUND_NOT_APPROVED: 'Chưa có quyết định hoàn tiền hợp lệ cho khoản thanh toán này.',
  BILLING_BALANCE_LIMIT_EXCEEDED: 'Số tiền giao dịch vượt quá hạn mức thanh toán.',
  BILLING_AMOUNT_INVALID: 'Số tiền thanh toán không hợp lệ.',
  BILLING_TOTAL_OVERFLOW: 'Tổng số tiền thanh toán vượt quá giới hạn hệ thống.',
  BILLING_LEDGER_INCONSISTENT: 'Sổ cái thanh toán chưa nhất quán. Vui lòng đối soát lại.',
  DEPOSIT_NOT_ELIGIBLE:
    'Hồ sơ chưa đủ điều kiện nhận cọc. Hãy kiểm tra lịch giữ chỗ và kịch bản đã duyệt.',
  DEPOSIT_NOT_SETTLED: 'Tiền cọc chưa được xác nhận hoàn tất.',
  PAYMENT_EVIDENCE_CONFLICT: 'Số tiền hoặc chứng từ không khớp với thỏa thuận cọc của hồ sơ tiệc.',
  REFUND_NOT_ALLOWED: 'Khoản thanh toán này không đủ điều kiện hoàn trả hoặc vượt hạn mức.',
  INCIDENTAL_EXPENSE_NOT_FOUND: 'Không tìm thấy dòng chi phí phát sinh này.',
  FINAL_INVOICE_EXISTS: 'Tiệc đã có hoá đơn quyết toán được lập.',
  FINAL_INVOICE_NOT_FOUND: 'Chưa có hoá đơn cuối cho tiệc này.',
  STALE_BILLING_REVISION: 'Số dư vừa thay đổi. Hãy tải lại trước khi thanh toán.',
  APPENDIX_NOT_EDITABLE: 'Tiệc đã ở giai đoạn kết thúc hoặc tất toán. Không thể lập thêm phụ lục.',
  FINANCIAL_SOURCE_CONFLICT: 'Hồ sơ thương mại đã được cố định theo chứng từ kế toán.',
  APPENDIX_APPROVAL_REQUIRED: 'Phụ lục trước đó cần được hai bên phê duyệt đầy đủ.',
  COMMERCIAL_SELECTION_INVALID: 'Danh mục dịch vụ trong thoả thuận không hợp lệ.',
  PRINT_ORDER_NOT_FOUND: 'Không tìm thấy đơn in thiệp trong hệ thống.',
  PRINT_ORDER_STATUS_INVALID: 'Trạng thái đơn in hiện tại không cho phép thực hiện thao tác này.',
  PRINT_ORDER_REVISION_STALE: 'Đơn in vừa được cập nhật ở nơi khác. Vui lòng tải lại danh sách.',
  INVITATION_PUBLICATION_STALE: 'Bản phát hành thiệp đã thay đổi. Vui lòng tải lại trang.',
  HALL_NOT_FOUND: 'Không tìm thấy sảnh tiệc.',
  DISH_NOT_FOUND: 'Không tìm thấy món ăn.',
  MENU_PACKAGE_NOT_FOUND: 'Không tìm thấy gói thực đơn.',
  LAYOUT_TEMPLATE_NOT_FOUND: 'Không tìm thấy mẫu sơ đồ bàn.',
  CATALOG_HALL_CAPACITY_CONFLICT:
    'Sức chứa sảnh tiệc không hợp lệ hoặc xung đột với cấu hình hiện tại.',
  GUEST_GROUP_IN_USE: 'Nhóm còn khách đang hoạt động. Hãy chuyển hoặc lưu trữ các khách đó trước.',
  GUEST_GROUP_NAME_CONFLICT: 'Đã có nhóm khác cùng tên. Hãy đặt tên khác.',
  GUEST_GROUP_QUOTA_EXCEEDED: 'Tiệc đã có tối đa 100 nhóm đang dùng. Hãy lưu trữ bớt nhóm trước.',
  GUEST_LIST_QUOTA_EXCEEDED: 'Danh sách đã đạt giới hạn 10.000 khách đang mời.',
  GUEST_NOT_FOUND: 'Không tìm thấy khách này — có thể đã được lưu trữ ở nơi khác. Hãy tải lại.',
  GUEST_REVISION_STALE:
    'Thông tin khách vừa được sửa ở nơi khác. Hãy tải lại để xem bản mới rồi sửa lại.',
  GUEST_GROUP_REVISION_STALE:
    'Nhóm vừa được sửa ở nơi khác. Hãy tải lại để xem bản mới rồi thao tác lại.',
  GUEST_PLAN_REVISION_STALE: 'Số khách dự kiến vừa được cập nhật ở nơi khác. Hãy tải lại.',
  HEADCOUNT_SOURCE_CONFLICT: 'Số khách dự kiến không khớp với phiên bản kế hoạch đã ghi nhận.',
  GUEST_IMPORT_PREVIEW_STALE:
    'Bản xem trước file đã cũ (danh sách vừa đổi hoặc quá hạn). Hãy chọn lại file để xem trước.',
  GUEST_IMPORT_ROW_CONFLICT:
    'Có dòng trong file trùng mã với khách đã nhập trước. Bật “Cho phép cập nhật khách đã nhập” hoặc đổi mã.',
  GUEST_LIST_CURSOR_STALE: 'Danh sách vừa thay đổi. Đang tải lại từ đầu.',
  INVITATION_CREDENTIAL_ALREADY_ISSUED:
    'Liên kết đã được cấp trong yêu cầu trước. Hãy dùng “Cấp lại liên kết” để tạo liên kết mới.',
  SEATING_PLAN_EXISTS: 'Tiệc đã có sơ đồ bàn.',
  SEATING_REVISION_STALE: 'Sơ đồ vừa được cập nhật. Hãy tải lại.',
  EXCEPTION_EXCEEDS_PHYSICAL_CAPACITY:
    'Số khách dự kiến vượt số ghế của sơ đồ hoặc sức chứa của sảnh. Hãy chọn mẫu đủ chỗ hoặc liên hệ nhà hàng; không thể duyệt ngoại lệ vượt sức chứa thực tế.',
  HEADCOUNT_OUTSIDE_LAYOUT_RANGE:
    'Số khách dự kiến nằm ngoài khoảng của mẫu sơ đồ. Chọn mẫu khác hoặc nhờ nhà hàng duyệt ngoại lệ.',
  LAYOUT_RETIRED: 'Mẫu sơ đồ đã ngừng sử dụng. Hãy chọn mẫu khác.',
  TABLE_NOT_IN_LAYOUT: 'Bàn không thuộc mẫu sơ đồ hiện tại.',
  GUEST_GROUP_UNAVAILABLE: 'Nhóm khách đã bị lưu trữ hoặc không còn tồn tại.',
  NAMED_GUEST_LIST_REQUIRED: 'Cần ít nhất một khách có tên trước khi bật check-in theo tên.',
  CHECK_IN_CONFIGURATION_STALE: 'Cấu hình check-in vừa thay đổi. Hãy tải lại.',
  CHECK_IN_MODE_LOCKED: 'Đã có bản ghi check-in nên không thể tắt chế độ này.',
  MEDIA_CUTOFF_REACHED:
    'Đã qua thời hạn chỉnh sửa hình ảnh của tiệc. Vui lòng liên hệ nhà hàng nếu cần thay đổi.',
  MEDIA_DECODER_BUSY: 'Máy chủ đang xử lý nhiều ảnh. Hãy đợi vài giây rồi tải lên lại.',
  AI_GENERATION_PENDING: 'Ảnh AI trước vẫn đang được tạo. Hãy đợi xong rồi thử lại.',
  PRINT_ASSET_LIMIT:
    'Tổng dung lượng ảnh trên thiệp vượt giới hạn in. Hãy bớt ảnh hoặc dùng ảnh nhẹ hơn.',
  PRINT_CONTENT_OVERFLOW: 'Nội dung quá dài so với khổ in. Hãy rút gọn chữ trên thiệp/sơ đồ.',
  PRINTABLE_DIGEST_CONFLICT:
    'Bản thiết kế vừa thay đổi trong lúc tạo file in. Hãy tạo lại file in.',
  PRINTABLE_SEATING_DIGEST_CONFLICT:
    'Sơ đồ bàn đã có bản xác nhận mới hơn. Hãy tải lại rồi tạo file in theo bản mới.',
  CONTRACT_PRINT_SOURCE_CONFLICT:
    'Mẫu/giá in không còn khớp với hợp đồng. Hãy tải lại và chọn đúng mẫu in trong hợp đồng.',
  NOTIFICATION_REVISION_STALE: 'Thông báo vừa thay đổi. Hãy tải lại.',
  UNAUTHORIZED: 'Bạn chưa đăng nhập hoặc phiên làm việc đã kết thúc.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này ở vai trò hiện tại.',
  CHECK_IN_NOT_OPEN: 'Bàn check-in chưa đến giờ mở hoặc chưa được quản lý kích hoạt.',
  CHECK_IN_WINDOW_CLOSED:
    'Bàn check-in chỉ mở trong khung giờ của tiệc. Ngoài giờ, quản lý check-in và ghi lý do.',
  MANAGER_OVERRIDE_REQUIRED: 'Tài khoản quản lý cần ghi lý do cho thao tác check-in này.',
  FEATURE_RETIRED:
    'Chức năng danh sách khách và check-in đã ngừng sử dụng. Hãy tải lại hoặc cập nhật ứng dụng.',
  EVENT_ASSIGNMENT_REQUIRED:
    'Bạn chưa được phân công hoặc phân công đã được thu hồi. Vui lòng liên hệ Manager.',
  STAFF_WORK_REVISION_STALE:
    'Nội dung tác nghiệp đã có phiên bản mới. Đóng phần sửa và mở lại dữ liệu hiện tại.',
  STAFF_WORK_ACTION_FORBIDDEN:
    'Bạn chưa được phân công thực hiện thao tác này. Liên hệ Manager để điều phối.',
  STAFF_HANDOVER_ACK_REQUIRED:
    'Người nhận bàn giao phải khác người gửi và xác nhận đã nhận bàn giao.',
  CHECK_IN_DISABLED: 'Tiệc này chưa bật check-in theo tên khách.',
  GUEST_ALREADY_CHECKED_IN: 'Khách này đã được điểm danh trước đó.',
  CHECK_IN_UNDO_EXPIRED: 'Đã quá thời gian cho phép hoàn tác điểm danh.',
  STAFF_ACCOUNT_NOT_FOUND: 'Không tìm thấy tài khoản nhân sự.',
  STAFF_ALREADY_ASSIGNED: 'Nhân viên này đã được phân công vào ca tiệc.',
  ASSIGNMENT_NOT_FOUND: 'Không tìm thấy lịch phân công nhân viên.',
  VERSION_NOT_FOUND: 'Không tìm thấy phiên bản tài liệu/danh mục.',
  VERSION_ALREADY_PUBLISHED: 'Phiên bản này đã được xuất bản chính thức, không thể ghi đè.',
  TIMELINE_TEMPLATE_NOT_FOUND: 'Không tìm thấy mẫu kịch bản tiệc.',
  CURRENT_PASSWORD_INVALID: 'Mật khẩu hiện tại chưa đúng.',
  PASSWORD_INVALID: 'Mật khẩu không hợp lệ.',
  EMAIL_NOT_CONFIGURED: 'Dịch vụ email đang gặp sự cố nên chưa gửi được mã OTP. Hãy thử lại sau.',
  OTP_EMAIL_DELIVERY_FAILED:
    'Dịch vụ email đang gặp sự cố nên chưa gửi được mã OTP. Hãy thử lại sau.',
  RATE_LIMITED: 'Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau.',
  SESSION_REVOKED: 'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu chưa đúng.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu hoặc dữ liệu đã bị xóa.',
  CONFLICT: 'Dữ liệu đã bị thay đổi bởi phiên làm việc khác. Vui lòng tải lại.',
  STALE_RECORD_REVISION:
    'Dữ liệu trên máy chủ đã thay đổi bởi phiên làm việc khác. Vui lòng tải lại.',
  REQUEST_FAILED: 'Yêu cầu không thành công. Vui lòng thử lại sau.',
  NETWORK_ERROR:
    'Không kết nối được máy chủ. Hãy kiểm tra mạng và trạng thái thao tác trước khi thử lại.',
  REQUEST_TIMEOUT: 'Máy chủ phản hồi quá lâu. Hãy kiểm tra trạng thái trước khi gửi lại thao tác.',
  BOOKING_HEADCOUNT_INVALID: 'Số lượng khách không hợp lệ.',
  BOOKING_TABLE_COUNT_INVALID: 'Số lượng bàn không hợp lệ.',
  BOOKING_MENU_SELECTION_INVALID: 'Lựa chọn thực đơn cho tiệc chưa hợp lệ.',
  BOOKING_COMMERCIAL_VALUE_INVALID: 'Tổng giá trị tiệc không hợp lệ.',
  BOOKING_COMPLETION_NOT_DUE: 'Chưa đến thời điểm được phép hoàn tất tiệc.',
  CUSTOMER_SELECTION_STALE: 'Lựa chọn của khách vừa thay đổi. Vui lòng tải lại.',
  GUEST_PLAN_CAPACITY_EXCEEDED: 'Số lượng khách dự kiến vượt quá sức chứa tối đa của sảnh.',
  CATALOG_DRAFT_CONFLICT: 'Bản nháp danh mục đang có xung đột phiên bản.',
  CATALOG_DISH_REFERENCE_CONFLICT: 'Món ăn đang được sử dụng trong gói thực đơn, không thể xoá.',
  CATALOG_LIFECYCLE_CONFLICT: 'Trạng thái danh mục không cho phép thực hiện thao tác này.',
  CATALOG_PUBLISH_CONFLICT: 'Không thể xuất bản danh mục do xung đột phiên bản.',
  BOOKING_CANCELLATION_NOT_ALLOWED:
    'Không thể hủy tiệc ở trạng thái hiện tại hoặc khi tiệc đã bắt đầu.',
  BOOKING_ALREADY_EXISTS: 'Hồ sơ tư vấn này đã có tiệc. Hãy mở tiệc hiện có để tiếp tục.',
  BOOKING_EVENT_DATE_INVALID: 'Ngày tổ chức không hợp lệ. Hãy kiểm tra và chọn lại.',
  BOOKING_SLOT_INVALID: 'Sảnh, ngày hoặc ca tiệc không hợp lệ.',
  BOOKING_SLOT_MISMATCH: 'Thông tin ca tiệc không khớp với hồ sơ giữ chỗ.',
  CANCELLATION_REQUEST_CONFLICT: 'Yêu cầu hủy đã thay đổi hoặc không còn đủ điều kiện xử lý.',
  AI_DESIGN_DAILY_LIMIT: 'Đã đạt giới hạn tạo thiết kế AI trong ngày.',
  AI_DESIGN_DISABLED: 'Chức năng thiết kế thiệp AI hiện chưa được bật.',
  AI_DESIGN_OUTCOME_UNKNOWN:
    'Chưa xác định được kết quả tạo thiết kế. Kiểm tra yêu cầu hiện có trước khi tạo lại.',
  AI_GENERATION_RECONCILIATION_STALE:
    'Trạng thái tạo ảnh đã thay đổi. Hãy tải lại trước khi đối soát.',
  AI_IMAGE_INVALID_OUTPUT: 'Dịch vụ AI trả về ảnh không hợp lệ. Chưa thể sử dụng kết quả này.',
  AI_IMAGE_PROVIDER_DISABLED: 'Dịch vụ tạo ảnh AI hiện chưa sẵn sàng.',
  AI_IMAGE_SAFETY_REFUSAL:
    'Dịch vụ AI từ chối nội dung này. Hãy điều chỉnh mô tả hoặc ảnh đầu vào.',
  AI_JOB_INTERRUPTED: 'Tác vụ tạo ảnh bị gián đoạn. Hãy kiểm tra trạng thái trước khi thử lại.',
  AI_JOB_LEASE_LOST: 'Tác vụ tạo ảnh đã chuyển quyền xử lý. Hãy tải lại trạng thái.',
  AI_JOB_RECONCILIATION_STALE: 'Tác vụ tạo ảnh vừa thay đổi. Hãy tải lại trước khi tiếp tục.',
  AI_JOB_RECOVERY_UNAVAILABLE:
    'Chưa thể khôi phục tác vụ tạo ảnh này. Hãy liên hệ nhà hàng để kiểm tra.',
  ANALYTICS_AMOUNT_OVERFLOW: 'Số tiền trong báo cáo vượt giới hạn xử lý.',
  ANALYTICS_CURSOR_STALE: 'Dữ liệu báo cáo vừa thay đổi. Hãy tải lại từ trang đầu.',
  ANALYTICS_NOT_READY: 'Báo cáo đang được cập nhật. Vui lòng thử lại sau.',
  ANALYTICS_QUERY_TOO_BROAD: 'Phạm vi báo cáo quá lớn. Hãy thu hẹp thời gian hoặc bộ lọc.',
  ANALYTICS_REBUILD_FAILED: 'Chưa thể dựng lại báo cáo. Bản báo cáo đã có được giữ nguyên.',
  ANALYTICS_REFRESH_CONFLICT: 'Báo cáo đang được cập nhật bởi một lượt xử lý khác. Hãy tải lại.',
  ANALYTICS_REFRESH_FAILED: 'Chưa thể cập nhật báo cáo. Vui lòng thử lại sau.',
  COMMERCIAL_APPROVAL_CONFLICT:
    'Bạn đã phê duyệt phiên bản này hoặc không phải bên được phép phê duyệt.',
  CONSULTATION_NOT_FOUND: 'Không tìm thấy hồ sơ tư vấn hoặc bạn không có quyền truy cập.',
  CONTRACT_FULFILLMENT_REQUIRED:
    'Hợp đồng chưa đáp ứng đủ điều kiện thực hiện. Hãy kiểm tra các hạng mục đã cam kết.',
  CONTRACT_PRINT_REPLACEMENT_REQUIRES_NEW_ORDER:
    'Việc thay thế thiệp cần được xử lý bằng một đơn in mới.',
  CORS_ORIGIN_DENIED: 'Địa chỉ trang web này chưa được máy chủ cho phép kết nối.',
  EXPENSE_APPROVAL_REQUIRED:
    'Chi phí phát sinh hoặc điều chỉnh cần được hai bên duyệt trước khi chốt hóa đơn và tất toán.',
  EXPENSE_REOPEN_REQUIRED: 'Bảng phát sinh đã được gửi. Hãy mở lại với lý do trước khi chỉnh sửa.',
  EXPENSE_REVIEW_STALE: 'Bản phát sinh đã thay đổi. Hãy tải lại và duyệt đúng phiên bản hiện hành.',
  EXPENSE_REVIEW_NOT_EDITABLE:
    'Không thể mở lại bản phát sinh này. Hãy tải lại trạng thái mới nhất.',
  EXPENSE_DECLARATION_INVALID:
    'Chỉ xác nhận không phát sinh khi bảng trống; bảng có hạng mục phải gửi Couple duyệt.',
  INCIDENTAL_OFFERING_NOT_AGREED:
    'Hạng mục này không nằm trong bảng giá đã thỏa thuận của booking.',
  INCIDENTAL_OTHER_REASON_REQUIRED:
    'Khoản khác cần mô tả cụ thể và lý do; hạng mục có trong bảng giá phải được chọn từ danh mục.',
  EXPENSE_APPROVAL_NOT_APPLICABLE: 'Booking này giữ quy trình phát sinh theo thỏa thuận trước đây.',
  INCIDENTAL_CATALOG_LIMIT: 'Danh mục đã đạt giới hạn 200 hạng mục.',
  EXPENSE_REVISION_STALE:
    'Chi phí phát sinh vừa thay đổi. Hãy tải lại trước khi lưu hoặc chốt hóa đơn.',
  GUEST_DELIVERY_UNAVAILABLE: 'Chức năng gửi thiệp cho khách hiện chưa sẵn sàng.',
  GUEST_INVITATION_REVISION_STALE: 'Thiệp mời của khách đã có phiên bản mới. Hãy tải lại.',
  IDEMPOTENCY_KEY_REQUIRED: 'Yêu cầu thiếu mã bảo vệ thao tác trùng. Hãy tải lại trang và thử lại.',
  INVALID_IDEMPOTENCY_KEY: 'Mã bảo vệ thao tác không hợp lệ. Hãy tải lại trang.',
  INVALID_OR_EXPIRED_TOKEN: 'Liên kết hoặc mã xác thực không hợp lệ hay đã hết hạn.',
  INVALID_TRANSACTION_SCOPE:
    'Phiên xử lý dữ liệu không còn hợp lệ. Hãy tải lại và kiểm tra trạng thái thao tác.',
  INVITATION_DESIGN_STALE: 'Thiết kế thiệp vừa thay đổi. Hãy tải lại bản mới nhất.',
  INVITATION_LINK_UNAVAILABLE:
    'Liên kết thiệp chưa được xuất bản, đã bị thu hồi hoặc không còn khả dụng.',
  INVITATION_TEMPLATE_STALE: 'Mẫu thiệp vừa được cập nhật. Hãy tải lại trước khi chọn.',
  INVITATION_AUTOMATION_FORBIDDEN: 'Bạn không có quyền thực hiện thao tác gửi thiệp này.',
  INVITATION_INTENT_CONFLICT:
    'Yêu cầu thiệp không khớp với thao tác đã ghi nhận. Hãy kiểm tra lại trạng thái.',
  INVITATION_PUBLICATION_HEAD_INVALID:
    'Phiên bản thiệp đã xuất bản chưa hợp lệ. Hãy liên hệ nhà hàng để kiểm tra.',
  INVOICE_EVIDENCE_CONFLICT: 'Chứng từ hóa đơn không khớp với dữ liệu tài chính đã ghi nhận.',
  INVOICE_REVISION_STALE: 'Hóa đơn vừa có phiên bản mới. Hãy tải lại trước khi điều chỉnh.',
  INVOICE_STORAGE_NOT_READY:
    'Máy chủ chưa cập nhật đầy đủ cấu trúc hóa đơn. Vui lòng liên hệ bộ phận quản trị.',
  MEDIA_REVISION_STALE: 'Thông tin hình ảnh vừa thay đổi. Hãy tải lại.',
  MEDIA_POLICY_STALE: 'Chính sách hình ảnh vừa được cập nhật. Hãy tải lại trước khi tiếp tục.',
  MEDIA_QUOTA_EXCEEDED:
    'Đã vượt hạn mức lưu trữ hình ảnh của tiệc. Hãy kiểm tra dung lượng và các ảnh hiện có.',
  METRICS_UNAUTHORIZED: 'Bạn không có quyền xem số liệu vận hành này.',
  PASSWORD_OTP_REQUIRED: 'Cần nhập mã xác thực trước khi thay đổi mật khẩu.',
  PAYMENT_PROVIDER_AMOUNT_UNSUPPORTED:
    'Số tiền giao dịch nằm ngoài giới hạn mà cổng thanh toán hỗ trợ.',
  PAYMENT_ATTEMPT_TRANSITION_INVALID: 'Không thể chuyển giao dịch sang trạng thái được yêu cầu.',
  PRINTABLE_TIMELINE_NOT_EFFECTIVE: 'Kịch bản tiệc chưa có hiệu lực để đưa vào bản in.',
  PRINT_CUSTOMER_CONSENT_INVALID:
    'Xác nhận chi phí in không còn khớp với phiên bản hoặc mức giá hiện tại.',
  PRINT_ORDERS_PENDING: 'Còn đơn in chờ xử lý. Hãy hoàn tất trước khi chốt hóa đơn.',
  PRINT_CANCELLATION_NOT_ALLOWED: 'Đơn in không còn đủ điều kiện hủy ở trạng thái hiện tại.',
  PRINT_CANCELLATION_PENDING: 'Đơn in đang có yêu cầu hủy chờ xử lý.',
  PRINT_ORDER_STATE_INVALID: 'Trạng thái đơn in hiện tại không cho phép thao tác này.',
  PRINT_REPLACEMENT_PENDING: 'Đơn in đang có yêu cầu thay thế chờ xử lý.',
  PROVIDER_ERROR: 'Dịch vụ liên kết gặp lỗi. Hãy kiểm tra trạng thái thao tác trước khi thử lại.',
  PROVIDER_TIMEOUT: 'Dịch vụ liên kết phản hồi quá lâu. Hãy kiểm tra trạng thái trước khi gửi lại.',
  PROVIDER_UNAVAILABLE: 'Dịch vụ liên kết tạm thời chưa sẵn sàng. Vui lòng thử lại sau.',
  RATE_LIMIT_EXCEEDED: 'Bạn đã gửi quá nhiều yêu cầu. Hãy chờ rồi thử lại.',
  RATE_LIMIT_UNAVAILABLE: 'Chưa thể kiểm tra giới hạn thao tác. Vui lòng thử lại sau.',
  RECEIVABLE_ADJUSTMENT_CONFLICT:
    'Khoản điều chỉnh công nợ không khớp với chứng từ đã được phê duyệt.',
  CATALOG_DUPLICATE_IDENTITY: 'Thông tin danh mục bị trùng với mục đã có.',
  CATALOG_HALL_NAME_CONFLICT: 'Tên sảnh này đã được sử dụng. Hãy chọn tên khác.',
  CATALOG_INTEGER_OUT_OF_BOUNDS: 'Số lượng nằm ngoài giới hạn cho phép.',
  CATALOG_INTEGER_OUT_OF_RANGE: 'Số lượng nằm ngoài giới hạn cho phép.',
  CATALOG_INVALID_DISPLAY_ORDER: 'Thứ tự hiển thị không hợp lệ.',
  CATALOG_INVALID_LIFECYCLE_TRANSITION: 'Không thể đổi trạng thái danh mục theo yêu cầu.',
  CATALOG_INVALID_SHIFT_TIME: 'Giờ của ca tiệc không hợp lệ.',
  CATALOG_INVALID_SHIFT_WINDOW: 'Khoảng thời gian ca tiệc không hợp lệ hoặc bị chồng lấn.',
  CATALOG_INVALID_VERSION_TRANSITION: 'Phiên bản hiện tại không cho phép thao tác này.',
  CATALOG_ITEM_COUNT_OUT_OF_BOUNDS: 'Số hạng mục nằm ngoài giới hạn cho phép.',
  CATALOG_MEDIA_LIMIT_REACHED: 'Đã đạt giới hạn hình ảnh của danh mục.',
  CATALOG_MEDIA_OWNERSHIP_CONFLICT: 'Hình ảnh không thuộc đúng hạng mục danh mục này.',
  CATALOG_MENU_EMPTY: 'Thực đơn cần có ít nhất một món trước khi tiếp tục.',
  CATALOG_RESTORE_CONFLICT: 'Chưa thể khôi phục mục danh mục vì thông tin đang bị xung đột.',
  CATALOG_REVISION_CONFLICT: 'Danh mục vừa thay đổi. Hãy tải lại trước khi lưu.',
  CATALOG_TABLE_IDENTITY_CONFLICT: 'Bàn bị trùng mã hoặc không khớp với mẫu sơ đồ.',
  CATALOG_TABLE_OUT_OF_BOUNDS: 'Vị trí bàn nằm ngoài phạm vi sơ đồ.',
  CATALOG_TABLE_OWNERSHIP_CONFLICT: 'Bàn không thuộc mẫu sơ đồ đang chỉnh sửa.',
  CATALOG_TABLE_RETIRED: 'Bàn này đã ngừng sử dụng.',
  CATALOG_TABLE_SHAPE_INVALID: 'Hình dạng hoặc kích thước bàn không hợp lệ.',
  CATALOG_TEXT_OUT_OF_BOUNDS: 'Nội dung quá ngắn hoặc vượt độ dài cho phép.',
  CATALOG_TEXT_OUT_OF_RANGE: 'Nội dung không nằm trong độ dài cho phép.',
  CHECK_IN_CORRECTION_CONFLICT:
    'Bản ghi điểm danh đã thay đổi hoặc không còn được phép điều chỉnh.',
  SEATING_PLAN_REPLACED: 'Sơ đồ bàn đã được thay bằng phiên bản mới. Hãy tải lại.',
  STAFF_ASSIGNMENT_QUOTA_EXCEEDED: 'Số nhân sự phân công đã vượt giới hạn của ca tiệc.',
  STAFF_ASSIGNMENT_STALE: 'Phân công nhân sự vừa thay đổi. Hãy tải lại.',
  TIMELINE_ITEM_ID_DUPLICATE: 'Kịch bản có mốc chương trình bị trùng.',
  TIMELINE_ITEM_ORDER_INVALID: 'Thứ tự các mốc chương trình chưa hợp lệ.',
  TIMELINE_NOT_MUTUALLY_APPROVED: 'Kịch bản chưa được cả hai bên phê duyệt cùng phiên bản.',
  NOTIFICATION_BATCH_INVALID: 'Danh sách gửi thông báo không hợp lệ. Hãy kiểm tra lại người nhận.',
  NOTIFICATION_CREDENTIAL_REISSUE_REQUIRED: 'Liên kết thiệp cần được cấp lại trước khi gửi.',
  NOTIFICATION_EVENT_BOOKING_UNAVAILABLE: 'Hồ sơ tiệc của thông báo không còn khả dụng.',
  NOTIFICATION_EVENT_SCOPE_INVALID: 'Thông báo không thuộc đúng hồ sơ tiệc hoặc phạm vi được phép.',
  NOTIFICATION_LEASE_STALE: 'Thông báo đã chuyển sang lượt xử lý khác. Hãy tải lại trạng thái.',
  NOTIFICATION_REQUEUE_NOT_ELIGIBLE: 'Thông báo hiện không đủ điều kiện gửi lại.',
  NOTIFICATION_SOURCE_CONFLICT: 'Nguồn thông báo không khớp với dữ liệu hiện tại.',
  CONNECTION_LIMIT_EXCEEDED:
    'Đã đạt giới hạn kết nối của tài khoản. Hãy đóng các tab không dùng rồi thử lại.',
  TOKEN_EXPIRED: 'Phiên xác thực đã hết hạn. Hãy đăng nhập lại.',
  TOKEN_IN_QUERY_PROHIBITED: 'Thông tin xác thực được gửi không đúng cách. Hãy tải lại trang.',
  AUTHENTICATION_FAILED: 'Chưa thể xác thực phiên làm việc. Hãy đăng nhập lại.',
  ANDROID_INSTALLATION_LIMIT: 'Tài khoản đã đạt giới hạn thiết bị đăng nhập.',
  ANDROID_TOKEN_IN_USE: 'Thiết bị này đang được liên kết với một tài khoản khác.',
  MALFORMED_RESPONSE: 'Máy chủ trả về dữ liệu chưa hợp lệ. Vui lòng thử lại sau.',
  REQUEST_ABORTED: 'Yêu cầu đã dừng. Bạn có thể thử lại khi sẵn sàng.',
};
