# Kết quả kiểm thử

## Mã giao diện được giữ lại

So với hai file gốc được gửi:

| File | ID phần tử gốc | Hàm window gốc | Mục bị mất |
| --- | ---: | ---: | ---: |
| home.html | 108 | 27 | 0 |
| adminisme.html | 117 | 48 | 0 |

Không có ID tĩnh bị trùng trong bản mới. Mã nguồn đầy đủ, các section và form cũ được giữ lại. Kiểm tra cấu trúc không đồng nghĩa đã giao dịch thật qua mọi tính năng cũ.

## Kiểm thử trình duyệt

21 kiểm tra đạt trên Microsoft Edge headless, desktop 1440px và điện thoại 390px, Firebase/API được giả lập để không sửa dữ liệu thật:

- Mở và chuyển tất cả các khu vực home và admin.
- Hiển thị danh mục, chọn dịch vụ đúng nguồn, dịch vụ hai nguồn trùng mã.
- Đặt đơn mualike1s từ home; số lượng 100, đơn giá 18đ, chạy 2 lần hiển thị 3.600đ.
- Tạo đơn từ admin cho UID khách được chọn.
- Quét dịch vụ mualike1s, bỏ qua dịch vụ đã có đúng nguồn, tính giá VND không nhân USD.
- Cho phép lợi nhuận 0%; hai nguồn cùng ID không bị coi là trùng; Smart Sync chỉ so sánh giá của nguồn đang chọn.
- Kiểm tra menu điện thoại, không tràn ngang, không ghi nhận lỗi JavaScript của trang.
- Kiểm tra trực quan ảnh desktop, mobile và bảng nhập dịch vụ.

## Kiểm thử Function

31 trường hợp tự động với Firebase/nhà cung cấp giả lập đạt:

- Chuẩn hóa `default`, min/max, số lượng nguyên dương, loại gói và bình luận.
- Tính giá chạy lặp, yêu cầu khoảng cách chạy hợp lệ.
- Không nhận key/action/service ghi đè qua tham số bổ sung.
- Xác minh token, quyền admin, chủ đơn và tài khoản bị trừ tiền.
- Số dư không đủ không gọi nhà cung cấp.
- Hai yêu cầu đồng thời cùng mã: một lần gửi nguồn, một lần trừ tiền.
- Gửi lại đơn thành công trả cùng mã; thay nội dung trên cùng mã yêu cầu bị từ chối.
- Lỗi từ chối rõ ràng hoàn tiền một lần; timeout giữ trạng thái đối soát, không gửi lại.
- Partial lưu riêng và không hoàn toàn bộ tiền tự động.
- Bảo hành, trạng thái bảo hành, hủy và chống gửi trùng yêu cầu.
- Bảo hành/hủy nhiều đơn trong một lần gọi nguồn, lưu kết quả từng đơn; giới hạn 100.
- Đối soát chỉ dành cho admin; hoàn tiền sau xác minh không có đơn nguồn chỉ một lần.

## Kiểm tra dịch vụ thật

Đã gọi chỉ đọc `balance` và `services`: POST hoạt động, VND, 72 dịch vụ Default. GET trả Invalid Request. Không phát sinh đơn, hủy hay bảo hành thật.

Chưa kiểm thử end-to-end với Firebase production và Vercel production. Cần cấu hình biến môi trường và triển khai ba file trước khi sử dụng API mới trên website thật.
