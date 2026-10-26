# Hướng dẫn test tay luồng chính đặt tiệc — Manager và Couple

Ngày đối chiếu toàn bộ luồng gốc: **25/10/2026** (giờ Việt Nam, UTC+7).

**Cập nhật nhánh tư vấn và mở lại tiệc ngày 26/10/2026:** các bước dưới đây đã được điều chỉnh theo thay đổi đang nằm trong working tree của hai web và BE. Chưa phải bằng chứng bản deploy đã cập nhật hoặc email đã được giao. Triển khai migration **20261026090000_consultation_choices** cùng BE trước khi triển khai hai web.

Các tình huống cần test thêm trên môi trường cho phép:

1. Gửi yêu cầu không chọn sảnh/thực đơn; manager mở bước 2 và tự điền phần còn thiếu.
2. Gửi chỉ sảnh, chỉ thực đơn, rồi cả hai; manager phải thấy đúng từng lựa chọn, kể cả lựa chọn nằm ngoài trang danh mục đầu tiên.
3. Tạo booking, quay về **Yêu cầu tư vấn**, bấm **Mở hồ sơ đặt tiệc**: phải mở bước 3 của đúng tiệc, không cần chọn dropdown và không có form tạo lại tiệc ấy.
4. Ở bước 3, quay sang bước 2: chỉ có thông báo đã có tiệc và nút mở hồ sơ hiện có.
5. Hai cửa sổ manager cùng mở một tư vấn: sau khi cửa sổ thứ nhất tạo booking, cửa sổ thứ hai bấm tạo phải mở lại tiệc đã có, không tạo tiệc trùng.
6. Ở bước 1, tìm khách cũ theo tên/email/điện thoại, chọn **Dùng thông tin cho tiệc mới**: tên và email được điền, mã tư vấn/booking cũ không bị tái sử dụng. Tạo hồ sơ tư vấn riêng cho tiệc mới.
7. Kiểm tra trạng thái lời mời riêng với tiến trình tiệc. Khách đã có tài khoản dùng tài khoản hiện có để nhận quyền vào hồ sơ mới; việc dùng lại liên hệ không tự cấp quyền truy cập.

Tài liệu này cập nhật thay nội dung hướng dẫn cũ trong cùng file. Tên in đậm là tên menu, tab, trường hoặc nút hiển thị trong code hiện tại; không dùng đường dẫn kỹ thuật làm tên màn hình.

## 1. Phạm vi và phiên bản đã đọc

| Source             | Commit tại lúc đối chiếu |
| ------------------ | ------------------------ |
| wedding-be         | `d2f06ec`                |
| wedding-web        | `980eb78`                |
| wedding-manage-web | `e3c638b`                |

- Đã đối chiếu source hai web, các lời gọi API và điều kiện nghiệp vụ BE. Không sửa code ứng dụng trong lần cập nhật tài liệu này.
- Đây là **hướng dẫn để người dùng test tay**, không phải báo cáo các bước đã chạy PASS trên trình duyệt/deployment.
- Không chạy tests, build, thanh toán, gửi email hoặc thao tác dữ liệu để biên soạn tài liệu.
- Chưa xác minh bản đang deploy có trùng ba commit trên. Nếu tên màn hình khác, ghi nhận phiên bản triển khai trước khi kết luận thao tác sai.

## 2. Chuẩn bị

1. Mở hai phiên trình duyệt độc lập, dùng **hai tài khoản khác nhau**:
   - Manager trên web quản lý; không dùng Staff thay Manager.
   - Couple trên web khách hàng. Email nhận lời mời phải truy cập được.
2. Dùng môi trường và dữ liệu test được phép; không mở chế độ `demo=1` để nghiệm thu dữ liệu thật.
3. Chuẩn bị sảnh, ca, thực đơn và mẫu kịch bản đã công bố/còn hoạt động. Dịch vụ và hạng mục in chỉ cần nếu đưa chúng vào hợp đồng.
4. Chọn ngày tương lai hợp lệ. Code hiện yêu cầu ngày từ **ngày mốt theo giờ Việt Nam**, không phải bắt buộc cách 30 ngày. Khuyến nghị chọn xa ít nhất một tuần để thuận tiện test thiệp/media; đây không phải luật bắt buộc 7 ngày.
5. Ghi lại email khách, mã hồ sơ tư vấn, mã booking, số tiền hợp đồng, tiền cọc và mã giao dịch để đối chiếu.
6. Để test phần sau tiệc trong cùng buổi, chuẩn bị thêm booking test đã xác nhận và đã qua giờ kết thúc ca hơn 12 giờ. Booking mới có ngày tương lai chưa thể đi ngay qua các điều kiện sau tiệc. Đổi giờ trên trình duyệt không thay được giờ BE.

Luồng chính:

**Nhận tư vấn → Duyệt và mở hồ sơ → Khách xác nhận lời mời → Tạo booking → Hai bên duyệt kịch bản → Nhập tên → Lập và duyệt hợp đồng → Giữ lịch hợp lệ → Thu cọc → Chuẩn bị tiệc → Sau tiệc ghi phát sinh → Chốt hóa đơn → Thu số dư.**

**Thao tác nghiệp vụ quan trọng:** UI Manager đã được nối hoàn chỉnh thao tác **Chốt hoá đơn quyết toán cuối** (tại menu Quản lý thanh toán) và **Phê duyệt phụ lục** (tại tab Phụ lục hợp đồng trong Đặt tiệc). Chi tiết tại bước 14 và mục 5.

## 3. Các bước thao tác

### Bước 1 — Khách gửi lời hẹn tư vấn

**Nơi vào:** Web khách hàng → thanh menu đầu trang → **Nhận tư vấn**.

Thao tác:

1. Nhập **Họ và tên** và **Email**.
2. Để dễ đối chiếu, điền thêm **Số điện thoại**, **Ngày tổ chức dự kiến**, **Số khách dự kiến**, ca mong muốn và **Điều bạn mong muốn**. Các trường được ghi không bắt buộc trên UI vẫn là tùy chọn.
3. Bấm **Gửi lời hẹn tư vấn**.

Kết quả mong đợi:

- Có xác nhận/trang gửi thành công; Manager thấy một yêu cầu mới đúng dữ liệu.
- Nếu bắt đầu từ trang sảnh/thực đơn, kiểm tra thông tin quan tâm được giữ trong yêu cầu.
- Gửi tư vấn **chưa giữ chỗ, chưa tạo xác nhận đặt tiệc, chưa ghi nhận thanh toán**.

### Bước 2 — Manager mở hồ sơ và phát hành lời mời

**Nơi vào:** Web quản lý → menu trái **Yêu cầu tư vấn** → tab **Chờ tiếp nhận**.

Thao tác:

1. Tìm bằng đúng email hoặc tên vừa gửi; đọc ngày, số khách, điện thoại và lời nhắn.
2. Bấm **Duyệt hồ sơ và gửi lời mời kích hoạt** đúng một lần; chờ kết quả.
3. Khi đã chuyển đổi, tìm ở tab **Đã mở tư vấn** nếu cần.
4. Nếu chưa có booking, bấm **Tiếp tục tư vấn & lập tiệc**. Nếu đã có booking, bấm **Mở hồ sơ đặt tiệc** trên đúng yêu cầu.

Kết quả mong đợi:

- Yêu cầu chuyển từ `NEW` sang `CONVERTED`, có mã hồ sơ tư vấn.
- Thao tác chuyển sang trang **Điều phối đặt tiệc**, thuộc menu **Đặt tiệc**.
- BE xác định tình trạng hiện tại: chưa có booking thì **tự mở tab 2. Khảo sát sảnh & Đặt tiệc** và điền dữ liệu yêu cầu; đã có booking thì **tự mở tab 3. Tiệc đang xử lý**, tải bản đã lưu mới nhất. Không tạo lại hồ sơ ở tab 1 hoặc booking ở tab 2 để khôi phục công việc.
- Nếu mở hồ sơ thành công nhưng gửi lời mời chưa xác nhận, UI phải báo riêng; không tạo lại yêu cầu/hồ sơ để chữa lỗi gửi thư.

Không có bước bắt buộc “Nhận xử lý → CONTACTED” trong luồng này. Trạng thái intake hiện tại là `NEW`, `CONVERTED`, `CLOSED`.

### Bước 3 — Couple xác nhận lời mời

**Nơi vào:** Hộp thư khách → mở liên kết lời mời → màn **Hoàn tất lời mời của bạn**.

Thao tác:

1. Nhập **Mật khẩu** và **Xác nhận mật khẩu** giống nhau (hệ thống không bắt buộc tối thiểu 12 ký tự).
2. Nếu đã có tài khoản, làm theo mô tả màn hình: nhập mật khẩu hiện tại, không tự đặt lại mật khẩu qua lời mời.
3. Bấm **Xác nhận lời mời**.
4. Vào **Không gian cưới**; nếu cần đăng nhập lại thì dùng tài khoản vừa xác nhận.

Kết quả mong đợi:

- Kích hoạt/nhận quyền trước cọc, không đợi thanh toán mới được đăng nhập.
- Chưa có booking thì danh sách tiệc có thể trống. Tiếp tục bước tạo booking bên Manager, không gửi lại tư vấn.
- Quyền trước cọc là `RESTRICTED`; chưa được dùng khách, sơ đồ, media và sản xuất thiệp thuộc phần sau cọc.

Nếu chưa nhận được thư:

- Manager vào **Đặt tiệc → 1. Hồ sơ tư vấn**, tại phần **Kích hoạt tài khoản khách hàng**, bấm **Cập nhật trạng thái**.
- Chỉ khi cần và UI cho phép mới dùng **Gửi lời mời kích hoạt** hoặc **Gửi lại lời mời → Xác nhận gửi**. Gửi lại có thể làm link cũ hết hiệu lực; dùng thư mới nhất.
- Thông báo đã phát hành lời mời không phải bằng chứng thư đã tới hộp thư hoặc khách đã kích hoạt.

### Bước 4 — Manager tạo booking

**Nơi vào:** Web quản lý → **Đặt tiệc** → trang **Điều phối đặt tiệc** → tab **2. Khảo sát sảnh & Đặt tiệc**.

Thao tác:

1. Kiểm tra hồ sơ đã liên kết. Có thể xem tab **1. Hồ sơ tư vấn** để đối chiếu, nhưng **không bấm Tạo hồ sơ tư vấn lần nữa** cho yêu cầu đã chuyển đổi.
2. Chọn **Sảnh tiệc**, ngày tổ chức, ca tiệc và **Thực đơn đặt tiệc**.
3. Nhập **Số bàn** và **Số khách dự kiến** phù hợp sức chứa.
4. Bấm **Kiểm tra lịch**. Nếu không trống, chọn slot khác hợp lệ.
5. Bấm **Tạo booking**, ghi lại mã booking.
6. Mở tab **3. Tiệc đang xử lý** nếu trang chưa tự chuyển.

Kết quả mong đợi:

- Booking mới ở `DRAFT`, đúng sảnh/ngày/ca/thực đơn/số bàn/số khách.
- Couple nhìn thấy đúng tiệc trong **Không gian cưới**.
- “Kiểm tra lịch” chỉ kiểm tra tính khả dụng, **không tự giữ slot**.
- Form tạo booking Manager hiện chọn một thực đơn. Nhu cầu nhiều dòng thực đơn test tại phần lập hợp đồng; không tìm nút thêm nhiều menu trong form tạo booking hiện tại.

### Bước 5 — Manager lập và duyệt kịch bản

**Nơi vào:** Manager → **Đặt tiệc → 3. Tiệc đang xử lý** → phần **Kịch bản tiệc**.

Thao tác:

1. Có thể bấm **Giữ lịch 15 phút** tại phần thông tin tiệc để giữ tạm slot.
2. Bấm **Tải mẫu kịch bản**.
3. Chọn một giá trị trong **Mẫu kịch bản đã công bố**.
4. Bấm **Dùng mẫu này**. Chỉ tải danh sách mẫu chưa chép mẫu vào kịch bản.
5. Kiểm tra giờ, tiêu đề, mô tả từng mốc. Nếu không dùng mẫu, bấm **Thêm mốc chương trình** rồi điền các mốc hợp lệ.
6. Bấm **Lưu kịch bản mới**.
7. Bấm **Phê duyệt revision hiện tại**.

Kết quả mong đợi:

- Mốc giờ nằm trong ca đã chọn; nội dung lưu đúng thứ tự.
- Manager duyệt đúng bản vừa lưu, chưa tự ghi nhận Couple đã duyệt.
- Giữ lịch chỉ là tạm thời; chưa làm booking thành `CONFIRMED` và không phải trạng thái booking riêng tên `HELD`.

### Bước 6 — Couple duyệt cùng kịch bản

**Nơi vào:** Web khách hàng → **Không gian cưới → Thoả thuận → Kịch bản**.

Thao tác:

1. Chọn đúng tiệc nếu tài khoản có nhiều booking.
2. Đọc lại sảnh, ngày, ca và các mốc chương trình.
3. Bấm **Phê duyệt revision này**.

Kết quả mong đợi:

- Hai bên duyệt cùng một revision kịch bản.
- Nếu sửa/lưu revision mới trước cọc, phải kiểm tra lại approvals và bản hợp đồng gắn với timeline; không tự giữ hiệu lực của bản cũ.
- Chưa có cả hai phê duyệt thì chưa đủ điều kiện đặt cọc.

### Bước 7 — Couple lưu tên cô dâu và chú rể

**Nơi vào:** **Không gian cưới → Thoả thuận → Tên cô dâu chú rể**.

1. Nhập **Tên cô dâu** và **Tên chú rể**.
2. Bấm **Lưu tên**.

Kết quả mong đợi: giữ nguyên dấu tiếng Việt, lưu hai trường riêng. Tên tài khoản/email không tự được dùng thay hai tên này. Thay tên sau duyệt không được sửa ngược nội dung hợp đồng lịch sử.

### Bước 8 — Couple lập hợp đồng và xem trước tiền

**Nơi vào:** **Không gian cưới → Thoả thuận → Hợp đồng**.

1. Bấm **Lập hợp đồng**.
2. Chọn các dòng thực đơn, số bàn; chọn dịch vụ và hạng mục in/quantity nếu sử dụng.
3. Bấm **Xem trước chi phí**.
4. Đối chiếu tên hạng mục, đơn vị, số lượng, đơn giá, thành tiền, tổng và tiền cọc.
5. Có thể đổi một số lượng để kiểm tra bản xem trước cũ bị đánh dấu không còn phù hợp; bấm **Tính lại chi phí**.
6. Bấm **Lưu bản nháp**. Nếu đang thay một bản đã có thì nút có thể là **Lưu bản hợp đồng mới**.
7. Đọc lại bản đã lưu rồi bấm **Gửi duyệt**.

Kết quả mong đợi:

- Tên, sảnh, ngày, ca và revision kịch bản đúng.
- Giá tính trên BE; cọc = `ceil(tổng hợp đồng × 30 / 100)` VND.
- Xem trước chưa tạo revision hợp đồng, khoản thu hoặc phê duyệt.
- Bản gửi chuyển sang **Chờ hai bên duyệt** (`AWAITING_APPROVAL`).
- Có điều khoản “Các chi phí phát sinh sẽ được tính sau”; tổng này không giả định đã bao gồm các phát sinh tương lai chưa ghi nhận.

### Bước 9 — Hai bên duyệt hợp đồng

**Manager:** **Đặt tiệc → 3. Tiệc đang xử lý → Hợp đồng tiệc cưới**.

1. Đọc cùng bản hợp đồng Couple đã gửi.
2. Bấm **Phê duyệt hợp đồng (Quản lý)**.

**Couple:** **Thoả thuận → Hợp đồng**.

3. Kiểm tra nội dung, bấm **Duyệt hợp đồng**.
4. Tại hộp xác nhận, bấm **Đồng ý & duyệt**.
5. Bấm **Xem PDF** để đối chiếu. Manager có nút **Tải PDF hợp đồng**.

Kết quả mong đợi:

- Cả hai phê duyệt thuộc cùng một revision và hai tài khoản khác nhau.
- Trạng thái thành `APPROVED`/đã duyệt hai bên.
- PDF đúng dữ liệu và thông tin phê duyệt. Đây là phê duyệt trong ứng dụng, không phải tính năng ký số hoặc tải scan chữ ký.
- Chỉnh giá danh mục về sau không làm thay giá trong bản đã duyệt.

### Bước 10 — Kiểm tra giữ lịch và thu cọc

Trước thanh toán, Manager mở **Đặt tiệc → 3. Tiệc đang xử lý**, kiểm tra/giữ lại slot bằng **Giữ lịch 15 phút** khi cần. Nếu slot đã bị booking khác chiếm, xử lý thông báo xung đột; không ép thanh toán tiếp.

Hợp đồng APPROVED chưa đủ: còn cần timeline đúng revision được hai bên duyệt, giữ slot hợp lệ và không có giao dịch chưa rõ kết quả đang chặn.

**Chọn một trong hai nhánh cho cùng khoản tiền, không làm cả hai.**

#### A. Couple thanh toán online

1. Couple vào menu **Thanh toán** trong **Không gian cưới**.
2. Bấm **Đặt cọc qua VNPay**.
3. Kiểm tra số tiền; bấm **Xác nhận mở VNPay**.
4. Thực hiện thanh toán sandbox được phép.
5. Quay lại trang kết quả/thanh toán và kiểm tra trạng thái do máy chủ trả về.

Không nhập/sửa tùy ý số tiền online. Quay về từ VNPay hoặc có tham số thành công trên URL không đủ để kết luận đã thu tiền.

#### B. Manager ghi nhận tiền đã thực nhận

1. Manager vào **Quản lý thanh toán**.
2. Nếu chưa mở đúng booking, điền **Mã hồ sơ đặt tiệc** và bấm **Xem thanh toán**. Có thể dùng liên kết **Mở thanh toán & Thu cọc tiệc này →** từ tab quản lý tiệc để mang đúng mã sang.
3. Tại **Ghi nhận tiền đã nhận**, chọn **Loại khoản thu → Đặt cọc**.
4. Nhập **Số tiền thực nhận (VND)** đúng tiền cọc yêu cầu, **Thời điểm nhận tiền**, **Mã chứng từ**, **Lý do ghi nhận**.
5. Bấm **Kiểm tra khoản thu**.
6. Đọc lại màn xác nhận; bấm **Xác nhận ghi nhận**.

Kết quả mong đợi sau khoản cọc được xác nhận và áp dụng:

- Booking thành `CONFIRMED`, quyền Couple trên booking thành `FULL`.
- Sảnh/ngày/ca được chốt đúng một tiệc; các mục chuẩn bị sau cọc mở theo quyền thật.
- Số tiền và chứng từ xuất hiện một lần, không nhân đôi khi bấm lại/tải lại.
- Nếu còn `CREATED`, `PENDING`, `UNKNOWN` hoặc thu thành công nhưng chưa áp dụng thì chưa tự đánh dấu tiệc đã chốt. Kiểm tra giao dịch hiện tại, không tạo khoản thu thứ hai để bỏ qua.

### Bước 11 — Nhóm khách và sơ đồ bàn, sau cọc

**Nơi vào:** Couple → **Không gian cưới → Chuẩn bị → Khách & sơ đồ**.

1. Chọn tab **Danh sách khách**.
2. Tại **Số khách dự kiến**, kiểm tra giá trị; nếu đổi thì bấm **Lưu số khách**.
3. Tại **Nhóm khách**, điền nhóm cần dùng và bấm **Thêm nhóm**. Danh sách tên khách là tùy chọn.
4. Chuyển sang tab **Sơ đồ bàn**.
5. Tại **Chọn mẫu sơ đồ**, chọn mẫu phù hợp bằng **Dùng mẫu này**. Nếu đã có mẫu và đổi mẫu thì dùng **Đổi sang mẫu này** theo điều kiện UI.
6. Chọn nút nhóm/màu rồi bấm các bàn cần gán. **Chỉ xem bàn** không gán nhãn; **Gỡ nhóm khỏi bàn** là chế độ gỡ nhãn.
7. Bấm **Lưu nhãn bàn**; sau đó bấm **Xác nhận sơ đồ** khi hợp lệ.

Kết quả mong đợi:

- Không cần danh sách tên để tạo nhóm và sơ đồ. Một nhóm có thể dùng nhiều bàn.
- Đổi nhãn chưa tự lưu; reload chỉ giữ dữ liệu đã lưu hoặc đề nghị khôi phục nháp đúng ngữ cảnh, không giả là đã lưu server.
- Số khách dự kiến không tự đổi theo số tên khách/sức chứa bàn.
- Đổi headcount có thể yêu cầu rà soát/xác nhận lại sơ đồ; phải xử lý trước khi dùng bản đó trong thiệp.

### Bước 12 — Thiệp và in giấy, nhánh tùy chọn sau cọc

**Nơi vào:** Couple → **Không gian cưới → Chuẩn bị → Thiệp & in**.

1. Tab **Thiết Kế & AI**: chọn mẫu, sửa nội dung phù hợp, bấm **Lưu Bản Thiết Kế**. Không cần tạo ảnh AI để đạt luồng chính.
2. Nếu dùng ảnh, thao tác tại tab **Bộ Sưu Tập Ảnh** và kiểm tra nội dung được lưu trước khi xuất bản.
3. Tab **Xuất Bản & Mã QR**: bấm **Xuất Bản Thiệp Ngay**. Mở liên kết bằng phiên khách để đối chiếu nội dung; khách không được thấy danh sách/ghi chú/thu chi riêng tư.
4. Nếu đặt in, mở tab **Đặt In Thiệp Giấy**; chọn **Mẫu in theo hợp đồng** nếu đã có nguồn, kiểm tra số lượng, bấm **Gửi Yêu Cầu Báo Giá In**.
5. Manager vào menu **Thiệp và in ấn**, mở đúng đơn. Xử lý theo trạng thái thực của đơn: báo giá nếu cần, Couple duyệt báo giá nếu UI yêu cầu, sau đó các bước sản xuất/sẵn sàng/bàn giao được phép.

Kết quả mong đợi: đúng thiết kế, số lượng, trạng thái và lịch sử. Dòng in đã nằm trong hợp đồng/phụ lục không được tính thêm lần nữa; đổi nguồn/giá hoặc vượt số lượng không được bỏ qua điều kiện thương mại. Không dùng danh sách khách/check-in làm điều kiện bắt buộc để tiệc được hoàn thành.

### Bước 13 — Ghi phát sinh sau giờ kết thúc tiệc

Dùng booking đã qua giờ kết thúc ca thực tế của BE; không tiếp tục ngay bằng booking mới ngày tương lai.

**Nơi vào:** Manager → **Quản lý thanh toán** → mở đúng mã bằng **Xem thanh toán** → phần **Chi phí phát sinh & Hoá đơn cuối**.

1. Bấm **+ Thêm chi phí phát sinh**.
2. Nhập tên khoản, số lượng, đơn vị, đơn giá và ghi chú nếu có.
3. Bấm **Lưu phát sinh**.
4. Couple mở menu **Quyết toán**, đối chiếu nội dung, số tiền và trạng thái đang ghi nhận.

Kết quả mong đợi: trước giờ kết thúc bị chặn; sau giờ kết thúc được ghi theo quyền Manager mà không cần chờ mốc hoàn thành +12 giờ. Couple xem chứ không tự ghi/duyệt khoản phát sinh thay nhà hàng.

**Thao tác trên UI Manager:**

- **Nơi vào:** Manager → **Quản lý thanh toán** → nhập mã booking → **Xem thanh toán** → phần **Chi phí phát sinh & Hoá đơn cuối**.
- **Thao tác:**
  1. Kiểm tra bảng tóm tắt tài chính quyết toán dự kiến (giá trị thoả thuận thương mại + phát sinh).
  2. Bấm nút **Chốt hoá đơn quyết toán**.
  3. Modal xác nhận hiển thị tóm tắt chứng từ bất biến, kiểm tra số tiền và bấm **Xác nhận chốt hoá đơn**.
- **Kết quả mong đợi:**
  - Hoá đơn được tạo với số hoá đơn và ghi nhận vào danh sách hoá đơn cuối.
  - Các dòng phát sinh nháp được khoá sổ, không thể sửa/xoá nữa.
  - Màn hình Couple **Quyết toán** mở điều kiện thanh toán số dư dựa trên hoá đơn đã chốt.
- **Điều kiện ràng buộc:** Tiệc phải qua giờ kết thúc ca (nếu bấm sớm BE báo `EVENT_NOT_ENDED`). Booking phải đã hoàn tất cọc/hợp đồng thương mại hiệu lực.

Nghiệp vụ mong đợi của hóa đơn: hợp đồng gốc + phụ lục đã duyệt + phát sinh; trừ tiền đã trả sau hoàn để tính còn nợ/credit. Hóa đơn đã chốt không sửa đè.

Với booking test **đã có hóa đơn cuối và BE cho phép thanh toán số dư**:

1. Couple vào **Quyết toán**, kiểm tra tổng tiền, đã trả, còn nợ.
2. Bấm **Thanh toán phần còn lại** để sang màn thanh toán; tại đó thao tác **Thanh toán còn lại** và xác nhận mở VNPay theo UI.
3. Hoặc Manager ghi khoản đã thực nhận tại **Ghi nhận tiền đã nhận → Loại khoản thu → Thanh toán còn lại**, kiểm tra và xác nhận như nhánh thủ công ở bước 10.
4. Đối chiếu lịch sử và số còn nợ sau khi khoản thanh toán thực sự được áp dụng.

Không tự bật thanh toán chỉ vì thấy còn nợ. Giao dịch cũ đang treo, hóa đơn chưa chốt, phiên bản cũ hoặc nhà cung cấp chưa sẵn sàng đều có thể chặn. Thanh toán thừa không tự tạo giao dịch hoàn VNPay.

### Bước 15 — Hoàn thành vòng đời tiệc

**Nơi vào:** Manager → **Đặt tiệc → 3. Tiệc đang xử lý** → phần **Kết thúc vòng đời**.

1. Bảo đảm đang mở booking `CONFIRMED` đã qua giờ kết thúc ca ít nhất **12 giờ**.
2. Bấm **Đánh dấu hoàn thành**.
3. Đối chiếu trạng thái ở Manager và Couple.

Kết quả mong đợi:

- Bấm sớm bị BE từ chối dù nút có thể đang hiện.
- Đúng điều kiện thì booking thành `COMPLETED`; lịch sử hợp đồng, phê duyệt và tiền được giữ.
- `COMPLETED` không phải bằng chứng đã trả hết tiền hoặc hóa đơn đã chốt. Hoàn tất công nợ cũng không tự vượt điều kiện hoàn thành tiệc.
- Bước này độc lập với điểm chặn UI hóa đơn; có thể test bằng booking đủ thời gian, nhưng không dùng nó để tuyên bố toàn bộ quyết toán đã hoàn tất.

## 4. Kiểm tra xuyên suốt trong khi làm luồng chính

- Giữ hai phiên mở song song. Khi Manager/Couple lưu hoặc phê duyệt, quan sát phiên còn lại trước khi F5. Nếu phải F5 mới đổi dữ liệu, ghi rõ bước, tài khoản và thời điểm.
- Khi đang sửa form mà phiên khác đổi dữ liệu, kiểm tra nháp không bị ghi đè; nếu stale, phải có thông báo và lấy lại dữ liệu trước khi thao tác tiếp.
- Kiểm tra click lặp/reload không tạo trùng booking, phê duyệt, đơn in hoặc khoản thu. Không tạo nhiều giao dịch thật để thử điều này.
- Trước cọc: không mở được chức năng sau cọc chỉ bằng sửa URL. Sau cọc: mở theo quyền thực của đúng booking.
- Khách có thể dùng nhóm/sơ đồ mà không có tên khách. Check-in mặc định tắt; không ghi nhận không có nghĩa là 0 khách tới.
- Nhánh hủy/hoàn tiền dùng booking test riêng, không hủy booking chính giữa chừng rồi tiếp tục chuỗi thành công.

## 5. Thao tác Phụ lục trên UI Manager và Couple

- **Phía Couple:** Vào **Chuẩn bị → Phụ lục** (`/khong-gian/chuan-bi/phu-luc`) để xem, lập phụ lục thay đổi món ăn/bàn/dịch vụ/in ấn, hoặc gửi và phê duyệt từ phía khách.
- **Phía Manager:** Vào **Đặt tiệc → 3. Tiệc đang xử lý → Hồ sơ hợp đồng & Phụ lục → Tab Phụ lục hợp đồng**:
  1. Xem danh sách phụ lục theo số phiên bản, lý do điều chỉnh, chênh lệch tiền (+/- VND), và bảng chi tiết các hạng mục sau điều chỉnh.
  2. Xem trạng thái phê duyệt hai bên (Quản lý & Cặp đôi).
  3. Bấm **Gửi duyệt phụ lục** (nếu phụ lục ở trạng thái `DRAFT`).
  4. Bấm **Phê duyệt phụ lục (Quản lý)** khi phụ lục ở trạng thái `AWAITING_APPROVAL` và kiểm tra hộp thoại xác nhận.
- **Hiệu lực thoả thuận:** Khi cả hai bên duyệt cùng một bản, phụ lục chuyển sang `APPROVED` (Đã có hiệu lực), cập nhật tổng giá trị thoả thuận hiệu lực của booking mà không làm thay đổi hợp đồng gốc.

## 6. Các chỉnh rõ so với hướng dẫn trước

- Tên menu Manager là **Yêu cầu tư vấn**; **1. Hồ sơ tư vấn** là tab trong **Đặt tiệc**, không phải menu tiếp nhận.
- Intake không có bước `CONTACTED`. Duyệt hiện chuyển đổi hồ sơ và phát hành lời mời; lời mời vẫn cần khách xác nhận.
- **Tiếp tục đặt tiệc** tự mở tab 2 khi có hồ sơ hợp lệ; không tạo tư vấn lần hai.
- **Tải mẫu kịch bản → chọn mẫu → Dùng mẫu này → Lưu kịch bản mới** là các thao tác riêng.
- Kịch bản và hợp đồng đều cần hai bên duyệt; phê duyệt hợp đồng không tự thu tiền/chốt sảnh.
- **Kiểm tra lịch** không phải giữ slot. Giữ lịch có hạn và cần còn hợp lệ lúc tạo giao dịch cọc.
- Tên nút lưu thiệp là **Lưu Bản Thiết Kế**; số khách có **Lưu số khách**; chọn mẫu sơ đồ có **Dùng mẫu này**.
- Phát sinh được ghi sau giờ kết thúc ca; hoàn thành booking cần thêm 12 giờ. Hai điều kiện không được gộp.
- Chốt hóa đơn và duyệt phụ lục phía Manager chưa có UI nối service; giữ trạng thái BLOCKED.

## 7. Nguồn đối chiếu

Các đường dẫn dưới đây dành cho người bảo trì đối chiếu, không phải tên menu cần nhập vào trình duyệt.

- [Menu Manager](../src/features/identity-access/operations-shell.tsx).
- [Trang yêu cầu tư vấn](../src/features/booking-lifecycle/intake-page.tsx), [nút chuyển đổi](../src/features/booking-lifecycle/consultation-requests-list.tsx), [xử lý chuyển đổi và lời mời](../src/features/booking-lifecycle/use-consultation-requests.ts).
- [Các tab đặt tiệc](../src/features/booking-lifecycle/booking-workspace.tsx), [mở hồ sơ/tab từ yêu cầu](../src/features/booking-lifecycle/use-booking-workspace-state.ts), [form tạo booking](../src/features/booking-lifecycle/booking-create-panel.tsx).
- [Menu Couple](../../wedding-web/src/features/couple-workspace/space-shell.tsx), [form tư vấn](../../wedding-web/src/features/public-website/consultation-form.tsx), [xác nhận lời mời](../../wedding-web/src/features/identity-access/identity-page.tsx).
- [Kịch bản, giữ lịch và hoàn thành phía Manager](../src/features/booking-lifecycle/proposal-panel.tsx), [chọn mẫu kịch bản](../src/features/booking-lifecycle/timeline-template-picker.tsx), [phê duyệt Couple](../../wedding-web/src/features/booking-lifecycle/collaboration-page.tsx).
- [Hợp đồng Couple](../../wedding-web/src/features/commercial-contract/contract-page.tsx), [xem trước và dòng tiền](../../wedding-web/src/features/commercial-contract/contract-lines.tsx), [hợp đồng Manager](../src/features/booking-lifecycle/contract-panel.tsx).
- [Thu thủ công](../src/features/payments-billing/payment-forms.tsx), [hóa đơn/phát sinh Manager](../src/features/payments-billing/incidentals-panel.tsx), [service chốt hóa đơn](../src/services/billing.service.ts), [service phụ lục](../src/services/contract.service.ts).
- [Thiệp và in Couple](../../wedding-web/src/features/invitation-studio/invitation-studio-view.tsx), [mẫu sơ đồ](../../wedding-web/src/features/seating-plan/layout-selector.tsx), [nhãn/xác nhận bàn](../../wedding-web/src/features/seating-plan/plan-editor.tsx).
- [Phạm vi nghiệp vụ BE hiện hành](../../wedding-be/docs/backend-scope-2026-10-10.md), [ngày tối thiểu](../../wedding-be/src/modules/booking-lifecycle/domain/event-date.ts), [điều kiện hoàn thành](../../wedding-be/src/modules/booking-lifecycle/domain/lifecycle.policy.ts), [điều kiện thanh toán số dư](../../wedding-be/docs/balance-payment-eligibility.md).

## 8. Bảng ghi kết quả test tay

Điền PASS/FAIL/BLOCKED/NOT_TESTED dựa trên thao tác thực, không đánh PASS từ việc đọc source.

| Bước                                      | Kết quả thực tế                                                  | Trạng thái | Booking/chứng từ/ảnh minh chứng |
| ----------------------------------------- | ---------------------------------------------------------------- | ---------- | ------------------------------- |
| 1. Gửi tư vấn                             |                                                                  |            |                                 |
| 2. Mở hồ sơ và mời                        |                                                                  |            |                                 |
| 3. Xác nhận lời mời                       |                                                                  |            |                                 |
| 4. Tạo booking                            |                                                                  |            |                                 |
| 5–6. Hai bên duyệt kịch bản               |                                                                  |            |                                 |
| 7. Lưu tên                                |                                                                  |            |                                 |
| 8–9. Hợp đồng và hai phê duyệt            |                                                                  |            |                                 |
| 10. Giữ lịch, thu cọc, CONFIRMED/FULL     |                                                                  |            |                                 |
| 11. Nhóm khách và sơ đồ                   |                                                                  |            |                                 |
| 12. Thiệp/in nếu sử dụng                  |                                                                  |            |                                 |
| 13. Phát sinh sau tiệc                    |                                                                  |            |                                 |
| 14. Chốt hóa đơn bằng UI                  | Thao tác Chốt hoá đơn quyết toán tại màn Quản lý thanh toán      | PASS/TEST  |                                 |
| 14. Thanh toán số dư trên hóa đơn chốt    | Couple thanh toán số dư hoặc Manager ghi nhận thanh toán còn lại | PASS/TEST  |                                 |
| 15. Hoàn thành sau giờ kết thúc +12h      |                                                                  |            |                                 |
| Phụ lục hai bên qua UI                    | Tab Phụ lục hợp đồng tại Đặt tiệc -> Phê duyệt phụ lục (Quản lý) | PASS/TEST  |                                 |
| Realtime, giữ nháp, không trùng khoản thu |                                                                  |            |                                 |
