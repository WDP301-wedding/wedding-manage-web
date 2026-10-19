# Báo cáo Đánh giá & Nâng cấp Hiệu năng / Giảm Độ phức tạp — wedding-manage-web
**Ngày lập**: 19/10/2026  
**Mã đợt nâng cấp**: `APP_MANAGE_PERFORMANCE_REFACTOR_20261019`  
**Phạm vi**: `wedding-manage-web` (Web Management Portal)

---

## 1. Tổng quan & Phương pháp Tiếp cận

Đợt rà soát và tái cấu trúc này tập trung vào việc loại bỏ các request API dư thừa, xử lý đúng vòng đời cache/invalidation, ngăn chặn cascade re-render trong cây component quản lý danh mục và điều phối tiệc, xử lý race condition do chuyển đổi booking nhanh, và tối ưu hóa việc sắp xếp/lọc dữ liệu lớn ở client-side mà không làm thay đổi hợp đồng API, schema hay UI/layout hiện tại.

Tuân thủ nghiêm ngặt quy định:
- **Cấm chạy test**: Không chạy unit, integration, E2E hay typography tests.
- **Không tự bịa số liệu đo**: Mọi đánh giá hiệu năng đều dựa trên phân tích cấu trúc tĩnh (static code analysis & call graph tracing). Không claim các chỉ số ms/p95 chưa được đo trên môi trường runtime thực.
- **Bảo toàn tính nhất quán**: Giữ nguyên API contract, HTTP status handling, optimistic revision fences, và Vietnamese typography sans-serif tokens.

---

## 2. Bảng Trạng thái Chi tiết Các Findings (8 - 14)

| Finding | Mô tả & Hiện trạng thực tế | Phân loại | Giải pháp & Trạng thái |
| :--- | :--- | :--- | :--- |
| **8** | `catalog-api.ts` cache dùng chữ ký accessToken cắt 16 ký tự đầu/cuối gây va chạm khi token refresh. Cache không có cơ chế giới hạn dung lượng (LRU), không chặn late response sau khi invalidate, `.finally` xóa request in-flight có thể xóa nhầm request mới. | **Confirmed** | **Fixed**: Tách module chuyên biệt `src/features/venue-catalog/catalog-cache.ts`. Tạo canonical key chuẩn hóa không chứa token; giới hạn dung lượng LRU (200 mục); generation fencing bảo vệ cache không nhận kết quả từ request phát sinh trước thời điểm invalidate; đồ thị phụ thuộc invalidation tự động (`/halls` kéo theo halls, layout, media; `/dishes` kéo theo dishes, menu packages); tích hợp `clearCatalogCache()` vào `session.clear()`. |
| **9** | `ManagementBookingWorkspace` mount `BookingCreatePanel` trong section ẩn ngay khi mở tiệc đang xử lý (`activeTab === 'manage'`) và truyền `autoLoadCatalog` từ route, dẫn đến request tải toàn bộ danh mục tạo tiệc dù người dùng chỉ mở tiệc có sẵn. | **Confirmed** | **Fixed**: Triển khai lazy-mount theo dõi `visitedTabs` (`new Set(['consultation'])`). `BookingCreatePanel` chỉ được mount và kích hoạt tải danh mục khi tab `'booking'` được người dùng kích hoạt lần đầu. Khi chuyển sang tab khác, trạng thái draft và form vẫn được bảo toàn nguyên vẹn trong DOM. |
| **10** | `VenueCatalogPage` truyền hàm inline `authorize={(op) => catalogSession.authorize(op)}`, khiến `authorize` nhận reference mới ở mỗi lần render, kéo theo toàn bộ `useCallback(..., [authorize])` ở các panel con (`MediaPanel`, `DishMenuPanel`, `TimelinePanel`, `LayoutPanel`) re-instantiate và kích hoạt lại `queueMicrotask(load)`. | **Confirmed** | **Fixed**: Khai báo hàm `authorizeCatalogSession` ổn định ở module scope. Hàm này gọi trực tiếp `catalogSession.authorize(op)` bên trong nên luôn lấy access token tươi mới (fresh token) mà không closure token cũ, đồng thời giữ reference ổn định tuyệt đối qua mọi lần parent render. |
| **11** | `MediaPanel` có effect gia hạn signed URL với điều kiện `remainingSeconds <= 30` gọi `loadAssets(selected)` ngay lập tức (`return;`). Nếu server trả signed URL có TTL <= 30s, vòng lặp re-render + fetch vô hạn (hotloop) sẽ xảy ra. Ngoài ra, hàm `run` sau khi upload/reorder gọi `load()` kéo theo 6 request tải lại toàn bộ resource danh mục. | **Confirmed** | **Fixed**: <br>1. Thêm `inFlightRenewRef` ngăn renewal trùng lặp.<br>2. Bọc độ trễ tối thiểu `delaySeconds = Math.max(15, remainingSeconds - 30)` loại bỏ triệt để 0ms hotloop.<br>3. Tạm dừng renew khi tab ẩn (`document.hidden`) và tự động gia hạn khi tab active trở lại qua sự kiện `visibilitychange`.<br>4. Trong `run`, thay thế `await load(...)` bằng `await loadAssets(selected)` để chỉ tải lại media của tài nguyên đang chọn, tiết kiệm 6 request danh mục không liên quan. |
| **12** | Fast-switching giữa các `bookingId` có thể gây race condition (request của booking cũ trả về sau ghi đè state booking mới). Trong `IncidentalsPanel.loadData`, `Promise.allSettled` không bao giờ reject nên khối `catch` không bắt được lỗi; nếu một nhánh thất bại, panel hiển thị rỗng giả mạo (fake empty). | **Confirmed** | **Fixed**: <br>1. Thêm `activeBookingIdRef` và generation check trong cả `ContractPanel` và `IncidentalsPanel`; hủy áp dụng state nếu `bookingId` đã thay đổi.<br>2. Khi `bookingId` thay đổi, chủ động reset state dữ liệu cũ.<br>3. Trong `IncidentalsPanel`, duyệt kết quả của từng promise trong `allSettled`, bóc tách `reason` qua `describeApiError` và hiển thị thông báo lỗi chi tiết cho từng phân hệ (Phát sinh / Hoá đơn). |
| **13** | `DashboardBookingsSection` (480 dòng) thực thi filter, search, sort và `new Date().getTime()` (O(N log N) lần tạo đối tượng Date trong comparator) ở mỗi lần re-render component. | **Confirmed** | **Fixed**: <br>1. Memoize `myBookings` theo `[bookings, isMine]`.<br>2. Chuẩn hóa search query một lần duy nhất (`normalizedQuery`).<br>3. Memoize `currentTabBookings` và `filteredBookings`.<br>4. Trong `sortedBookings`: đối với trường `eventDate`, trích xuất trước mốc thời gian dạng epoch timestamp vào `Map<string, number>`, loại bỏ việc khởi tạo `new Date()` trong vòng lặp so sánh.<br>5. Memoize `paginatedBookings` và ổn định các action callback (`setBookingTab`, `handleSortChange`, `handleQuickSortChange`). |
| **14** | Cấu trúc trách nhiệm các file lớn (`BookingWorkspace`, `CatalogAPI`, `IncidentalsPanel`, `ContractPanel`): cần gom module rõ ràng, giữ backward compatibility cho public exports, không đặt ngưỡng số dòng máy móc. | **Confirmed** | **Fixed**: Tách biệt logic cache sang `catalog-cache.ts` độc lập và re-export đầy đủ các method/types từ `catalog-api.ts`. Đảm bảo các component con và test harness không bị break import. |

---

## 3. Chi tiết Các Thay đổi Module & Kiến trúc

### 3.1. Phân tách Cache Catalog (`src/features/venue-catalog/catalog-cache.ts`)
- **Tách khỏi `catalog-api.ts`**: Toàn bộ logic lưu cache, dedup request in-flight, invalidation theo cây phụ thuộc và dọn dẹp bộ nhớ được cô lập trong `catalog-cache.ts`.
- **Cơ chế Canonical Cache Key**: Khóa cache được tạo từ endpoint và tham số query sắp xếp theo thứ tự bảng chữ cái (`endpoint?key1=val1&key2=val2`). Không nhúng token người dùng vào khóa cache, tránh rò rỉ token và ngăn phân mảnh cache sau mỗi lần token refresh.
- **Giới hạn bộ nhớ (LRU Bounded)**: Bounded tối đa 200 bản ghi, tự động loại bỏ bản ghi cũ nhất khi đầy.
- **Generation Fencing & Promise Identity**: Mỗi lần gọi `invalidateCatalogResource` hoặc `clearCatalogCache`, biến `currentGeneration` tăng lên. Các request in-flight đang thực thi dở dang nếu hoàn tất sau thời điểm invalidation sẽ tự động bị hủy lưu vào cache, ngăn dữ liệu cũ ghi đè dữ liệu mới.
- **Dọn dẹp phiên (Session Disposal)**: Khi người dùng đăng xuất hoặc session bị xóa (`session.clear()`), hàm `clearCatalogCache()` được kích hoạt ngay lập tức.

### 3.2. Lazy Mounting Tab trong Booking Workspace (`booking-workspace.tsx`)
- Tạo state `visitedTabs` với tab khởi tạo tương ứng tham số URL (`consultation`, `manage`, hoặc `booking`).
- `BookingCreatePanel` chỉ được mount vào DOM khi người dùng chủ động chuyển sang tab "Khảo sát sảnh & Đặt tiệc".
- Khi chuyển đổi qua lại giữa các tab, panel vẫn duy trì trong DOM (ẩn qua CSS display), giúp bảo toàn toàn bộ dữ liệu người dùng đang nhập dở (draft input, selections).
- Khi người dùng mở một tiệc đang xử lý có sẵn (`/operations/bookings?bookingId=...`), không có bất kỳ request danh mục đặt tiệc nào được gửi lên server.

### 3.3. Bảo vệ Timer Gia hạn Media URL (`media-panel.tsx`)
- **Ngăn chặn Hotloop**: Tính toán thời gian còn lại `remainingSeconds = minimumTtl - elapsedSeconds`. Đặt ngưỡng tối thiểu `Math.max(15, remainingSeconds - 30)` để đảm bảo ngay cả khi server trả về URL có TTL cực ngắn, khoảng cách giữa các lần yêu cầu gia hạn luôn tối thiểu là 15 giây.
- **Background Pause**: Nếu tài liệu đang ở trạng thái ẩn (`document.hidden`), hẹn giờ bị tạm dừng và lắng nghe sự kiện `visibilitychange` để kích hoạt gia hạn ngay khi người dùng quay lại tab làm việc.
- **Cô lập Phạm vi Làm mới**: Trong hàm `run` (khi upload ảnh hoặc sắp xếp lại thứ tự ảnh), gọi trực tiếp `loadAssets(selected)` thay vì `load(...)`, loại bỏ việc tải lại không cần thiết 6 endpoint danh mục nhà hàng, sảnh, món, thực đơn, kịch bản, sơ đồ.

### 3.4. Xử lý Lỗi & Race Condition (`contract-panel.tsx` & `incidentals-panel.tsx`)
- Dùng `activeBookingIdRef` lưu trữ `bookingId` hiện hành, cập nhật trong `useEffect`. Trước khi gán kết quả trả về từ API vào state component, luôn kiểm tra `activeBookingIdRef.current === targetId`.
- Trong `incidentals-panel.tsx`, bóc tách từng kết quả của `Promise.allSettled`. Bất kỳ lỗi nào từ endpoint chi phí phát sinh hoặc hóa đơn quyết toán đều được ghi nhận và hiển thị tường minh lên banner cảnh báo, không còn hiện tượng hiển thị danh sách rỗng ngụy tạo.

### 3.5. Tối ưu Hiệu năng Render Bảng Dashboard (`dashboard-bookings-section.tsx`)
- Phép sắp xếp ngày tiệc cưới trước đây gọi `new Date(a.eventDate).getTime()` lặp đi lặp lại O(N log N) lần trong hàm so sánh JavaScript `sort()`.
- Đã được tái cấu trúc: khởi tạo một `Map<string, number>` lưu trữ trước epoch timestamp cho từng `bookingId`, sau đó hàm so sánh chỉ việc đọc giá trị từ Map trong O(1).
- Chuẩn hóa chuỗi tìm kiếm một lần duy nhất trước khi duyệt mảng lọc.
- Toàn bộ kết quả lọc, sắp xếp, phân trang đều được bọc trong `useMemo` với dependency array chính xác.

---

## 4. Báo cáo Kết quả Kiểm tra Mã Nguồn (Static Code Checks)

Tất cả các lệnh kiểm tra được thực hiện độc lập trong thư mục `wedding-manage-web`:

### 4.1. TypeScript Typecheck
- **Command**: `npm run typecheck`
- **Exit Code**: `0`
- **Kết quả**: `next typegen && tsc --noEmit` hoàn tất thành công, không phát hiện bất kỳ lỗi kiểu dữ liệu nào.

### 4.2. ESLint Static Analysis
- **Command**: `npm run lint`
- **Exit Code**: `0`
- **Kết quả**: `eslint . --max-warnings 0` hoàn tất thành công, không có cảnh báo hoặc lỗi linting nào. Các quy tắc `react-hooks/refs` và `prefer-const` đều tuân thủ 100%.

### 4.3. Prettier Format Verification
- **Command**: `npx prettier --write <task-files>`
- **Exit Code**: `0`
- **Các file đã được kiểm tra & định dạng chuẩn xác**:
  - `src/features/venue-catalog/catalog-cache.ts`
  - `src/features/venue-catalog/catalog-api.ts`
  - `src/features/identity-access/session.ts`
  - `src/features/booking-lifecycle/booking-workspace.tsx`
  - `src/features/venue-catalog/catalog-page.tsx`
  - `src/features/venue-catalog/media-panel.tsx`
  - `src/features/booking-lifecycle/contract-panel.tsx`
  - `src/features/payments-billing/incidentals-panel.tsx`
  - `src/features/identity-access/dashboard-bookings-section.tsx`

---

## 5. Danh mục Quy trình Kiểm thử Thủ công (Manual Verification Checklist)

Dành cho người kiểm thử vận hành qua Chrome DevTools:

1. **Kiểm tra Điều phối Đặt tiệc (Booking Workspace)**:
   - Mở URL: `/operations/bookings?bookingId=<uuid-hop-le>`.
   - Mở tab Network: Xác nhận **không có** request nào gọi tới `/management/catalog/halls`, `/dishes`, `/menu-packages`.
   - Nhấn chuyển sang tab "2. Khảo sát sảnh & Đặt tiệc": Xác nhận các request danh mục bắt đầu được gửi và hiển thị đầy đủ thông tin.
   - Nhập một vài thông tin vào form đặt tiệc, chuyển về tab "Hồ sơ tư vấn" rồi quay lại tab "Đặt tiệc": Xác nhận nội dung form không bị mất.

2. **Kiểm tra Quản lý Danh mục (Venue Catalog & Media)**:
   - Mở trang `/catalog`.
   - Chuyển đổi giữa các tab "Sảnh tiệc", "Thực đơn", "Kịch bản", "Sơ đồ": Mở Network xác nhận các tài nguyên đã nạp không bị request lại vô căn cứ.
   - Tại tab "Media", tải lên một hình ảnh mới hoặc thay đổi thứ tự ảnh: Xác nhận sau khi lưu, chỉ có duy nhất request cập nhật media của tài nguyên đó được gọi, không tải lại 6 endpoint danh mục tổng quát.
   - Thu nhỏ hoặc chuyển sang tab khác trong trình duyệt: Xác nhận tiến trình gia hạn signed URL tạm dừng cho đến khi người dùng quay lại tab.

3. **Kiểm tra Chuyển đổi Nhanh Booking & Báo lỗi**:
   - Trong thanh tra cứu booking, nhập lần lượt 2 mã booking khác nhau liên tiếp: Xác nhận dữ liệu hợp đồng và phát sinh hiển thị đúng mã tiệc cuối cùng, không bị đè bởi request đến muộn của mã tiệc trước.
   - Thử nghiệm với booking chưa kết thúc tiệc khi xem mục phát sinh: Xác nhận giao diện hiển thị thông báo lỗi đúng ngữ cảnh, không hiển thị danh sách rỗng sai lệch.

4. **Kiểm tra Bảng Dashboard**:
   - Tại màn hình Dashboard, gõ vào ô tìm kiếm hoặc chuyển đổi phân trang: Mở React Profiler để kiểm tra thời gian commit của `DashboardBookingsSection`, xác nhận giao diện phản hồi mượt mà không có hiện tượng giật lag khi danh sách có nhiều tiệc.
