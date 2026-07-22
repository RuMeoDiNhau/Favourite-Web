# BẢNG PHÂN CÔNG NHIỆM VỤ DỰ ÁN (ĐƠN GIẢN HƠN)

Dưới đây là bảng phân chia công việc đã được giảm tải, phù hợp cho các thành viên làm quen và phát triển các chức năng cơ bản của dự án:

---

## 1. BẠN (LEADER - DEVOPS & QUẢN TRỊ)
*   **Nhiệm vụ:**
    *   Quản lý tài khoản AWS, EC2, S3, RDS.
    *   Duyệt và Merge code từ GitHub của các bạn vào nhánh `main`.
    *   SSH vào EC2 để gõ lệnh cập nhật chạy code mới (Deploy).
*   **Sản phẩm:** Web chạy ổn định trên link online.

---

## 2. THÀNH VIÊN 2 (AI DEVELOPER - QUẢN LÝ ẢNH & FACE ID)
*   **Nhiệm vụ:**
    *   Thu thập ảnh chân dung của các thành viên trong nhóm để chuẩn bị dữ liệu test.
    *   Sử dụng trang `Users` trên Web để đăng ký người dùng mới bằng ảnh đã chụp.
    *   Tinh chỉnh các tham số nhận diện (như chỉnh lại ngưỡng khoảng cách nhận dạng nhạy hơn hoặc bớt nhạy đi) trong tệp `backend/services/face_service.py` để tối ưu nhận dạng khuôn mặt cho cả nhóm.
*   **Sản phẩm:** Danh sách người dùng được đăng ký đầy đủ và nhận dạng chính xác khuôn mặt các thành viên.

---

## 3. THÀNH VIÊN 3 (BACKEND DEVELOPER - API CƠ BẢN)
*   **Nhiệm vụ:**
    *   Viết các API CRUD cơ bản cho các bảng dữ liệu (không cần làm bảo mật SSM hay cache RAM phức tạp).
    *   Ví dụ: 
        *   API cập nhật thông tin cá nhân (Email, Tên hiển thị) của User.
        *   API Thích/Bỏ thích bài hát.
        *   API đếm lượt chơi game để hiển thị bảng xếp hạng game được chơi nhiều nhất.
*   **Sản phẩm:** Các API cơ bản chạy tốt, kết nối và ghi được dữ liệu vào database RDS.

---

## 4. THÀNH VIÊN 4 (FRONTEND DEVELOPER - GIAO DIỆN & TÍCH HỢP)
*   **Nhiệm vụ:**
    *   Thiết kế trang giao diện chỉnh sửa thông tin cá nhân (Profile) của User.
    *   Làm giao diện hiển thị danh sách bài hát yêu thích của người dùng.
    *   Tối ưu hiển thị responsive (co giãn giao diện) để trang web hiển thị đẹp mắt trên cả điện thoại di động và máy tính.
*   **Sản phẩm:** Giao diện hoàn chỉnh, đẹp mắt, các trang nhạc/game kết nối dữ liệu thật từ API.

---

## 5. THÀNH VIÊN 5 (TESTER & BÁO CÁO)
*   **Nhiệm vụ:**
    *   Vào web click kiểm thử từng tính năng (đăng ký, đăng nhập, quét mặt, phát nhạc, chơi game) xem có nút nào bị lỗi hay giao diện bị lệch không.
    *   Chụp ảnh giao diện web thực tế làm minh chứng.
    *   Viết tệp báo cáo Word/Markdown hướng dẫn các bước cài đặt local và cách sử dụng web để nộp bài/báo cáo.
*   **Sản phẩm:** File báo cáo/tài liệu hướng dẫn hoàn chỉnh kèm hình ảnh minh họa.
