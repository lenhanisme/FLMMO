<div align="center">

🚀 FLMMO.VN - SMM Panel Chuyên Nghiệp

Hệ thống cung cấp dịch vụ mạng xã hội (Tăng Like, Follow, View...) tự động 100%

</div>

🌟 Giới Thiệu

FLMMO.VN là một nền tảng SMM Panel (Social Media Marketing Panel) được phát triển nhằm mục đích cung cấp các dịch vụ tương tác mạng xã hội (Facebook, TikTok, Instagram, YouTube) một cách nhanh chóng, bảo mật và hoàn toàn tự động.

Dự án được xây dựng theo kiến trúc Serverless kết hợp giữa giao diện tĩnh (HTML/Tailwind) và hệ thống Backend mạnh mẽ từ Google Firebase. Điểm nhấn của dự án là khả năng tích hợp Auto Nạp Tiền Bank qua SePay hoàn toàn tự động mà không cần can thiệp thủ công.

🔥 Tính Năng Nổi Bật

🧑 Dành Cho Khách Hàng (User)

🔒 Xác thực bảo mật: Đăng nhập/Đăng ký qua Firebase Authentication. Hỗ trợ tài khoản ẩn danh để trải nghiệm thử.

🛍️ Giao diện đặt đơn SPA (Single Page Application): Thao tác mượt mà không cần tải lại trang. Các máy chủ (Servers) được load động từ Database.

💳 Nạp tiền QR Code Động: Tích hợp SePay tạo mã QR đính kèm sẵn nội dung chuyển khoản theo Username cực kỳ tiện lợi.

📜 Quản lý lịch sử: Tra cứu lịch sử nạp tiền và trạng thái đơn hàng (Đang chạy, Hoàn thành, Hủy...) theo thời gian thực.

🔌 API Đối tác: Cung cấp tài liệu API và mã API Key để người dùng có thể làm đại lý, đấu nối qua website khác.

🛡️ Dành Cho Quản Trị Viên (Admin)

📊 Dashboard Thống kê: Theo dõi tổng số lượng User, Tổng doanh thu nạp, Đơn đang chờ xử lý theo thời gian thực.

🛑 Chế độ bảo trì (Maintenance Mode): Khóa truy cập khách hàng chỉ với 1 cú click chuột (Admin vẫn vào được bình thường).

💸 Duyệt tiền nhanh: Chấp nhận/Từ chối lệnh nạp tiền của khách, có chức năng ghi chú lý do từ chối.

⚙️ Quản lý Máy Chủ (Server): Thêm, sửa, xóa các dịch vụ. Có thể Bật/Tắt trạng thái server (Bảo trì, Hết tài nguyên, Nghẽn) và nó sẽ lập tức cập nhật ở màn hình User.

👥 Quản lý Người Dùng: Ban/Unban tài khoản, chỉnh sửa số dư (Coin) trực tiếp, và phân quyền (cấp quyền Admin cho người khác).

🛒 Quản lý Đơn hàng: Xem chi tiết đơn, cập nhật trạng thái đơn (Hỗ trợ nút tự động Hoàn tiền - Refund khi đơn bị lỗi).

🛠️ Công Nghệ Sử Dụng

Front-End:

HTML5 / CSS3

Tailwind CSS (Framework CSS tiện ích)

FontAwesome 6 (Icons)

Vanilla JavaScript (Xử lý DOM & Logic SPA)

Back-End (BaaS):

Firebase Authentication (Quản lý User)

Firebase Firestore (Cơ sở dữ liệu NoSQL Real-time)

Firebase Rules (Bảo mật đường dẫn truy cập)

Tool & Automation:

Python (Thư viện: firebase-admin, requests, schedule)

Cronjob quét API SePay tự động cộng tiền 24/7.

📂 Cấu Trúc Dự Án

📦 FLMMO-SMM-PANEL
 ┣ 📜 home.html          # Trang chủ / Dashboard Khách hàng (SPA)
 ┣ 📜 admin.html         # Bảng điều khiển dành riêng cho Admin
 ┣ 📜 dangky.html        # Trang tạo tài khoản mới
 ┣ 📜 dangnhap.html      # Trang đăng nhập
 ┣ 📜 faq.html           # Câu hỏi thường gặp
 ┣ 📜 quydinh.html       # Chính sách và điều khoản dịch vụ
 ┣ 📜 baomat.html        # Chính sách bảo mật dữ liệu
 ┣ 📜 api.html           # Tài liệu tích hợp API cho đối tác
 ┣ 📜 404.html           # Trang báo lỗi 404 (Giao diện không gian)
 ┣ 📜 auto_topup.py      # Tool Python quét SePay tự động cộng tiền
 ┗ 📜 README.md          # File tài liệu bạn đang đọc nè!


🚀 Hướng Dẫn Cài Đặt

1. Triển khai Website (Frontend)

Vì dự án không dùng framework JS phức tạp (như React/Vue), bạn chỉ cần up các file .html lên bất kỳ hosting tĩnh nào:

Firebase Hosting (Khuyên dùng)

GitHub Pages

Vercel hoặc Cpanel thông thường.

Lưu ý: Bạn cần thay thế thông tin cấu hình firebaseConfig trong các file HTML bằng cấu hình dự án Firebase thực tế của bạn.

2. Triển khai Tool Nạp Tiền Tự Động (Python)

Tool này giúp hệ thống của bạn tự động cộng tiền khi có khách chuyển khoản qua Bank.

Cài đặt Python 3.x trên máy chủ/VPS.

Cài đặt thư viện: pip install firebase-admin requests schedule

Tải file serviceAccountKey.json từ Firebase Console và đặt cùng thư mục với tool.

Cập nhật SEPAY_API_TOKEN trong file auto_topup.py.

Chạy lệnh: python auto_topup.py (Nên dùng tmux hoặc screen để chạy ngầm trên VPS).

📞 Liên Hệ & Hỗ Trợ

Dự án được thiết kế và lập trình bởi Lê Ngọc Nhân (@vnsoftware).
Nếu bạn cần hỗ trợ cài đặt, hợp tác hoặc nâng cấp thêm tính năng, vui lòng liên hệ qua các kênh sau:

📘 Facebook: fb.com/lenhanriel

📸 Instagram: instagram.com/nh4n.vn

📧 Email: lenhancute1@gmail.com

<div align="center">
<b>Bản quyền © 2026 FLMMO.VN. Chúc bạn kinh doanh thành công và bùng nổ doanh số! 🚀</b>
</div>
