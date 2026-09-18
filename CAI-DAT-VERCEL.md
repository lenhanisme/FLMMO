# FLMMO — thêm mualike1s, giữ MySMM và đơn thủ công

## Các file cần cập nhật

Gói này ghép trực tiếp vào repo `lenhanisme/FLMMO` hiện tại:

```text
FLMMO/
├── home.html                 ← thay bằng bản mới trong gói
├── adminisme.html            ← thay bằng bản mới trong gói
└── api/
    └── mualike1s.js          ← thêm file mới này
```

Giữ các file còn lại trong repo, bao gồm `api/uid.js`, `api/sepay.js`, các API khác, trang đăng nhập, đăng ký, game, tài liệu và cấu hình.

Đã đọc cấu hình repo: `package.json` có `firebase-admin: ^12.0.0`, còn `vercel.json` bật `cleanUrls` và tắt `trailingSlash`. Bản này dùng đúng dependency và cấu trúc `/api` đó; không cần thay hai file cấu hình.

## Cấu hình trên Vercel

1. Mở project FLMMO → Settings → Environment Variables.
2. Thêm `MUALIKE1S_API_KEY`, giá trị là API key mualike1s bạn đã cung cấp. Chọn Production; thêm Preview nếu muốn thử trên bản xem trước.
3. Giữ ba biến Firebase đang dùng trong `api/sepay.js`: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. Chúng phải thuộc cùng project Firebase `flmmo-a4e53` với hai trang HTML.
4. Cập nhật ba file bên trên lên GitHub và triển khai lại trên Vercel. Nếu vừa thêm biến môi trường sau lần deploy gần nhất, chọn Redeploy.

API mới dùng lại ba biến Firebase hiện có. Nếu hệ thống dùng một biến JSON thay vì ba biến riêng, nó cũng nhận `FIREBASE_SERVICE_ACCOUNT_JSON` chứa service account JSON. Không đưa private key vào file HTML hoặc commit service account lên GitHub.

Quyền quản trị giữ cùng tài khoản chủ trong `adminisme.html` và trường `users/{uid}.role = "admin"`. Có thể cấu hình `ADMIN_EMAIL` để đổi email chủ mà API chấp nhận; nếu đổi chủ, cần đổi cấu hình email trong trang admin tương ứng.

## Thêm dịch vụ mualike1s

1. Đăng nhập admin → Kho máy chủ / Thêm dịch vụ SMM.
2. Chọn **Quét dịch vụ từ đại lý**.
3. Chọn nguồn **mualike1s · VND**.
4. Điền phần trăm lợi nhuận → **Bắt đầu quét** → chọn dịch vụ → **Thêm các dịch vụ đã chọn**.

Giá nguồn mualike1s là VND; không nhân tỷ giá USD. Dịch vụ Default được đổi giá/1.000 về giá/lượt; giá bán làm tròn lên đến 0,01đ để tránh ra giá 0. Dịch vụ Package sử dụng giá/gói. Dịch vụ MySMM vẫn dùng tỷ giá USD như trước.

Mỗi dịch vụ mới lưu `provider`, mã nguồn, loại dịch vụ và khả năng bảo hành/hủy nếu nguồn cung cấp. Bản ghi cũ không có `provider` vẫn được hiểu là MySMM, hoặc thủ công nếu mã bắt đầu bằng `MANUAL`/`TAY`. Hai nguồn có cùng mã số vẫn được phân biệt.

Có thể thêm từng dịch vụ bằng form cũ, nay có thêm lựa chọn MySMM / mualike1s / Thủ công. Dịch vụ tạo bằng form này mặc định loại Default; dùng quét API để nhập đúng metadata của nguồn.

## Đặt đơn và quản lý

- Home có danh mục nhanh, tìm dịch vụ, form đặt đơn, lịch sử và toàn bộ các khu vực cũ: nạp tiền, tài khoản game, giới thiệu, hỗ trợ, tài khoản, mật khẩu, API cá nhân và công cụ UID.
- Admin có form **Tạo đơn cho khách hàng**: chọn UID khách, dịch vụ, link và số lượng. Giá được lấy từ dịch vụ; đơn được lưu vào lịch sử và trừ ví khách.
- MySMM, mualike1s và dịch vụ thủ công cùng tồn tại. Mỗi đơn lưu rõ nguồn.
- Đơn mualike1s có **Cập nhật**, **Bảo hành**, **Yêu cầu hủy**, và **Xem bảo hành** khi đã có mã refill. Nếu nguồn không công bố cờ hỗ trợ, hệ thống cho gửi yêu cầu để nguồn quyết định; nếu nguồn trả rõ `false`, thao tác đó không xuất hiện.
- Admin có chọn nhiều đơn mualike1s để cập nhật, bảo hành, hủy và xem trạng thái bảo hành, tối đa 100 đơn mỗi lần.
- Đồng bộ tự động chạy mỗi 60 giây khi trang đang mở/được xem. Đây không phải tác vụ cron chạy khi đóng trình duyệt. Có thể bấm cập nhật từng đơn bất kỳ lúc nào.
- Trạng thái Partial hiển thị **Hoàn thành một phần**, không tính là hoàn thành toàn bộ.

## Kết quả không rõ khi mất kết nối

Đơn mualike1s giữ tiền và lưu đơn trong một Firestore transaction trước khi gửi nguồn. Cùng mã yêu cầu không bị gửi thêm lần nữa hoặc trừ thêm tiền. Nếu nhà cung cấp trả lỗi từ chối rõ ràng, hệ thống hoàn lại phần đã giữ.

Nếu timeout hoặc không nhận mã đơn hợp lệ, đơn chuyển sang **Chờ đối soát**. Không tự động thử tạo lại vì nhà cung cấp có thể đã nhận đơn và chưa trả lời. Admin kiểm tra trên mualike1s rồi dùng **Đối soát mã nguồn**:

- Có đơn nguồn: nhập đúng mã đơn đã kiểm tra dịch vụ, link và số lượng.
- Xác minh nguồn không tạo đơn: nhập `KHONG TAO` rồi xác nhận hoàn tiền. Đợi ít nhất 60 giây từ lúc đặt trước khi đối soát.

Yêu cầu hủy không lập tức hoàn toàn bộ tiền. Sau khi nguồn xác nhận hủy, admin có thể chọn Hủy (Refund) ở trạng thái để quyết định hoàn tiền. Một đơn chỉ được hoàn toàn bộ bằng thao tác này một lần. Đơn Partial cần đối chiếu phần đã chạy trước khi xử lý tiền; không có cơ chế tự hoàn theo phần còn lại.

## API thực tế đã kiểm tra

Ngày 18/09/2026, chỉ đọc `balance` và `services` bằng API key được cung cấp:

- GET `/api/v3` trả `Invalid Request!`.
- POST dạng `application/x-www-form-urlencoded` trả dữ liệu hợp lệ, tiền tệ VND và 72 dịch vụ có `type: "default"`.

Vì vậy Function dùng POST cho mualike1s, và chuẩn hóa tên loại `default` khi nhập. Không có đơn trả phí nào được tạo trong quá trình kiểm thử.

72 dịch vụ đang trả về đều là Default. Mã cũng có xử lý Package, Custom Comments và tham số bổ sung theo loại dịch vụ; chưa kiểm chứng giao dịch thật cho các loại này. Subscriptions bị từ chối rõ ràng vì phần tài liệu được cung cấp không có quy tắc tham số/tính phí của loại đó, tránh tính tiền sai. Điều này không ảnh hưởng các dịch vụ Default thực tế hoặc chức năng cũ.

## Phạm vi bảo mật và triển khai

API key mualike1s mới chỉ nằm trong biến môi trường Vercel; frontend dùng Firebase ID token để gọi Function cùng tên miền. Function kiểm tra người dùng, quyền admin, chủ đơn, giá lưu trong Firebase và số dư khi đặt đơn.

Các cơ chế cũ của MySMM, Telegram, nạp tiền và shop game được giữ trong hai file theo yêu cầu. Mã cũ vốn có khóa dịch vụ trong HTML. Bản nâng cấp này chưa chuyển toàn bộ các khóa/luồng cũ sang backend và chưa kiểm tra được Firestore Security Rules đang triển khai. Rules cần bảo đảm người dùng không tự sửa role, coin, giá dịch vụ hoặc đơn của người khác; đây là điều kiện để số dư và phân quyền máy chủ đáng tin cậy.

Chưa push code hay triển khai vào project Vercel thật trong phiên này. Các file là bản hoàn chỉnh để cập nhật vào repo, không phải đoạn code rút gọn.

Tài liệu tham khảo: [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [Firebase xác minh ID token](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).
